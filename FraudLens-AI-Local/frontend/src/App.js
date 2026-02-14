import React, { useState, useEffect, memo } from 'react';
import FraudMap from './Map';
import HighRiskTable from './HighRiskTable';
import PeopleOfInterest from './PeopleOfInterest';
import PoliticalTab from './PoliticalTab';
import Dashboard from './Dashboard';
import NetworkGraph from './NetworkGraph';
import LiveUpdatesPanel from './LiveUpdatesPanel';
import AIAnomalyPanel from './AIAnomalyPanel';
import ErrorBoundary from './ErrorBoundary';

const MemoMap = memo(FraudMap);
const MemoTable = memo(HighRiskTable);
const MemoPeople = memo(PeopleOfInterest);
const MemoDashboard = memo(Dashboard);
const MemoNetwork = memo(NetworkGraph);

function App() {
  const [data, setData] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [activeTab, setActiveTab] = useState('map');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWithRetry = async (url, setState) => {
    setLoading(true);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        setState(json);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === 2) {
          setError('Failed to load data');
          setLoading(false);
        }
        await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
  };

  useEffect(() => {
    fetchWithRetry('http://localhost:8000/data', setData);
  }, []);

  useEffect(() => {
    fetchWithRetry('http://localhost:8000/graph', setGraphData);
  }, []);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  const tabs = [
    { id: 'map', label: '🗺️ Map' },
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'table', label: '📋 Table' },
    { id: 'people', label: '👥 People' },
    { id: 'political', label: '🗳️ Political' },
    { id: 'network', label: '🔗 Network' }
  ];

  return (
    <ErrorBoundary>
      <div style={{ padding: '20px' }}>
        <h1>FraudLens AI</h1>

        <LiveUpdatesPanel />
        <AIAnomalyPanel />

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: activeTab === tab.id ? '#0D47A1' : '#E0E0E0', color: activeTab === tab.id ? 'white' : 'black', cursor: 'pointer' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'map' && <MemoMap data={data} />}
        {activeTab === 'dashboard' && <MemoDashboard data={data} />}
        {activeTab === 'table' && <MemoTable data={data} />}
        {activeTab === 'people' && <MemoPeople data={data} />}
        {activeTab === 'political' && <PoliticalTab />}
        {activeTab === 'network' && <MemoNetwork data={graphData} />}
      </div>
    </ErrorBoundary>
  );
}

export default App;