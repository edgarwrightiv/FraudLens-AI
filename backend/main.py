from fastapi import FastAPI, WebSocket, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import pandas as pd
import numpy as np
import requests
import os
import asyncio

app = FastAPI(title="FraudLens AI Backend")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
security = HTTPBearer()

PORT = int(os.getenv("PORT", 8000))
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
GROK_API_KEY = os.getenv("GROK_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/data")
@limiter.limit("100/minute")
def get_data(request: Request, current_user: str = Depends(security)):
    try:
        response = requests.get("https://api.usaspending.gov/api/v2/awards/", params={"limit": 20000}, timeout=10)
        response.raise_for_status()
        raw = response.json()
        df = pd.DataFrame(raw.get("results", []))
    except:
        np.random.seed(42)
        n = 3000
        states = ['CA', 'NY', 'TX', 'FL', 'MN', 'IL', 'OH', 'PA']
        df = pd.DataFrame({
            'recipient_name': [f"Entity_{i}" for i in range(n)],
            'state': np.random.choice(states, n),
            'amount': np.random.lognormal(10, 1.8, n),
            'action_date': pd.date_range('2025-01-01', periods=n, freq='h')
        })

    # Defensive scoring chain
    df['tx_count'] = df.groupby('recipient_name')['amount'].transform('count')
    df['amount_z'] = (df['amount'] - df['amount'].mean()) / df['amount'].std()
    median_tx = df['tx_count'].median()
    df['volume_score'] = np.where(median_tx > 0, df['tx_count'] / median_tx, 1.0)

    state_multiplier = df['state'].map({
        'MN': 2.0, 'CA': 1.9, 'NY': 1.6, 'FL': 1.5,
        'TX': 1.4, 'IL': 1.3, 'OH': 1.2, 'PA': 1.2
    }).fillna(1.0)

    df['fraud_score'] = (
        np.abs(df['amount_z']) * 0.5 +
        df['volume_score'] * 0.25 +
        np.abs(df['amount_z']) * state_multiplier * 0.25
    )

    df = df.sort_values('action_date')
    df['amount_7day'] = df['amount'].rolling(168, min_periods=24).sum().fillna(1)
    df['spike_score'] = df['amount_7day'] / df['amount_7day'].rolling(336).mean().fillna(1)
    df['fraud_score'] += (df['spike_score'] - 1) * 5
    df['fraud_score'] = np.clip(df['fraud_score'], 0, 35)

    df['red_flags'] = 0
    df['red_flag_details'] = ""
    df.loc[df['fraud_score'] > 18, 'red_flags'] += 1
    df.loc[df['fraud_score'] > 18, 'red_flag_details'] += "High Fraud Score | "
    df.loc[df['state'].isin(['MN', 'CA']), 'red_flags'] += 1
    df.loc[df['state'].isin(['MN', 'CA']), 'red_flag_details'] += "High-Risk State | "
    df.loc[df['amount'] > df['amount'].quantile(0.97), 'red_flags'] += 1
    df.loc[df['amount'] > df['amount'].quantile(0.97), 'red_flag_details'] += "Extreme Amount | "
    df.loc[df['tx_count'] > df['tx_count'].quantile(0.9), 'red_flags'] += 1
    df.loc[df['tx_count'] > df['tx_count'].quantile(0.9), 'red_flag_details'] += "High Volume | "
    df.loc[df['spike_score'] > 3, 'red_flags'] += 1
    df.loc[df['spike_score'] > 3, 'red_flag_details'] += "Payment Spike | "

    df['risk_category'] = pd.cut(df['fraud_score'], bins=[0,10,18,25,35], labels=['Low', 'Medium', 'High', 'Critical'])
    df['confidence'] = np.round((df['fraud_score'] / 35 * 100), 1)
    df['amount_formatted'] = df['amount'].apply(lambda x: f"${x:,.0f}")

    return df.to_dict(orient="records")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)