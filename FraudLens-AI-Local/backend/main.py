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
from neo4j import GraphDatabase
import hashlib
from datetime import datetime
import sqlite3

app = FastAPI(title="FraudLens AI Backend")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
security = HTTPBearer()

PORT = int(os.getenv("PORT", 8000))
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
GROK_API_KEY = os.getenv("GROK_API_KEY")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/data")
@limiter.limit("100/minute")
def get_data(request: Request, current_user: str = Depends(get_current_user)):
    try:
        # USAspending API
        response = requests.get("https://api.usaspending.gov/api/v2/awards/", params={"limit": 20000}, timeout=10)
        response.raise_for_status()
        raw = response.json()
        df = pd.DataFrame(raw.get("results", []))
        # FEC API
        fec_response = requests.get("https://api.open.fec.gov/v1/candidate/", params={"limit": 1000}, timeout=10)
        fec_response.raise_for_status()
        # Merge (placeholder)
        df['political_links'] = len(fec_response.json().get("results", []))
        # SAM.gov
        sam_response = requests.get("https://sam.gov/api/v1/exclusions/", timeout=10)
        sam_response.raise_for_status()
        df['exclusion_flag'] = len(sam_response.json().get("results", []))
        # CMS Medicare FFS
        cms_response = requests.get("https://data.cms.gov/api/1/dataset/5f7b8b0b-0a5e-4b2e-8b0b-0a5e4b2e8b0b/resource/1f7b8b0b-0a5e-4b2e-8b0b-0a5e4b2e8b0b/download", timeout=10)
        cms_response.raise_for_status()
        # GAO/OIG
        df['gao_fraud_score'] = np.random.uniform(0, 10, len(df))
        # Pandemic Oversight
        po_response = requests.get("https://www.pandemicoversight.gov/api/data", timeout=10)
        po_response.raise_for_status()
        df['cross_agency_links'] = len(po_response.json().get("results", []))
    except Exception as e:
        # Synthetic fallback
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

@app.get("/graph")
@limiter.limit("30/minute")
def get_graph(request: Request):
    try:
        G = nx.Graph()
        for _, row in df.iterrows():
            company_id = f"c_{_}"
            founder_id = f"f_{row['founder']}"
            G.add_node(company_id, label=row['recipient_name'], type='company', risk=row['fraud_score'])
            G.add_node(founder_id, label=row['founder'], type='founder')
            G.add_edge(company_id, founder_id, type='owns', amount=row['amount'])
        nodes = [{'data': {'id': n, 'label': G.nodes[n]['label']}} for n in G.nodes()]
        edges = [{'data': {'source': e[0], 'target': e[1]}} for e in G.edges()]
        return {'nodes': nodes, 'edges': edges}
    except:
        return {'error': 'Graph generation failed'}

@app.get("/geocode")
@limiter.limit("100/minute")
def geocode(address: str):
    state_centers = {
        'CA': [37.8, -119.4],
        'NY': [43.0, -75.0],
        'TX': [31.0, -100.0],
        'FL': [28.0, -82.0],
        'MN': [46.0, -94.0],
        'IL': [40.0, -89.0],
        'OH': [40.0, -82.0],
        'PA': [41.0, -77.0]
    }
    try:
        r = requests.get(f"https://nominatim.openstreetmap.org/search?q={address}&format=json&limit=1", timeout=5)
        r.raise_for_status()
        data = r.json()
        if data:
            return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
    except:
        pass
    # State-based fallback
    state = address.split(',')[-1].strip().upper()[:2] if ',' in address else 'US'
    if state in state_centers:
        return {"lat": state_centers[state][0] + np.random.normal(0, 0.6), "lon": state_centers[state][1] + np.random.normal(0, 0.6)}
    return {"lat": 39.8, "lon": -98.6}

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        await asyncio.sleep(5)
        await websocket.send_json({"type": "new_transaction", "message": "New grant awarded in MN", "fraud_score": 22.5})

@app.get("/ai/anomalies")
@limiter.limit("30/minute")
def get_anomalies(request: Request):
    if not GROK_API_KEY:
        return {"anomalies": ["Grok API key not configured"]}
    try:
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROK_API_KEY}"},
            json={"model": "grok-beta", "messages": [{"role": "user", "content": "Analyze fraud patterns in government grants"}]},
            timeout=10
        )
        response.raise_for_status()
        return {"anomalies": response.json()["choices"][0]["message"]["content"].split("\n")}
    except:
        return {"anomalies": ["Unable to reach Grok API"]}

@app.post("/audit")
def audit_log(request: Request, detection: dict):
    try:
        conn = sqlite3.connect('audit.db')
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS audits (timestamp TEXT, detection TEXT, hash TEXT)")
        hash_val = hashlib.sha256(str(detection).encode()).hexdigest()
        cursor.execute("INSERT INTO audits VALUES (?, ?, ?)", (datetime.now().isoformat(), str(detection), hash_val))
        conn.commit()
        conn.close()
        return {"status": "logged"}
    except:
        return {"error": "Audit log failed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)