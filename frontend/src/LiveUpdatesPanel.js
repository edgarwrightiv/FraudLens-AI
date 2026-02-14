import React, { useState, useEffect } from 'react';

const LiveUpdatesPanel = () => {
  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/live');
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setUpdates(prev => [update, ...prev].slice(0, 5));
    };

    ws.onclose = () => console.log('WebSocket closed');
    ws.onerror = (err) => console.error('WebSocket error', err);

    return () => ws.close();
  }, []);

  if (updates.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#E8F5E9', padding: '12px', marginBottom: '20px', borderRadius: '8px', borderLeft: '4px solid #43A047' }}>
      <strong>Live Updates</strong>
      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
        {updates.map((u, i) => <li key={i}>{new Date().toLocaleTimeString()}: {u.message}</li>)}
      </ul>
    </div>
  );
};

export default LiveUpdatesPanel;