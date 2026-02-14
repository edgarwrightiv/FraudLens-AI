import React, { useState, useEffect } from 'react';

const AIAnomalyPanel = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const res = await fetch('http://localhost:8000/ai/anomalies');
        const data = await res.json();
        setAnomalies(data.anomalies || []);
      } catch (err) {
        setAnomalies(['Unable to fetch AI insights at this time']);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || anomalies.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#FFF3E0', padding: '12px', marginBottom: '20px', borderRadius: '8px', borderLeft: '4px solid #FF9800', position: 'relative' }}>
      <button onClick={() => setDismissed(true)} style={{ position: 'absolute', top: '8px', right: '8px', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
      <strong>AI Flagged Anomalies</strong>
      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
        {anomalies.map((a, i) => <li key={i}>{a}</li>)}
      </ul>
      <small style={{ color: '#666' }}>Updated just now • Powered by Grok AI</small>
    </div>
  );
};

export default AIAnomalyPanel;