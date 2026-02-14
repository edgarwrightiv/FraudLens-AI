import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0D47A1', '#2196F3', '#43A047', '#D32F2F'];

const Dashboard = ({ data }) => {
  const totalEntities = data.length;
  const highRisk = data.filter(d => d.fraud_score > 12).length;
  const critical = data.filter(d => d.fraud_score > 25).length;
  const topState = data.reduce((acc, curr) => {
    acc[curr.state] = (acc[curr.state] || 0) + 1;
    return acc;
  }, {});

  const trendData = [
    { date: 'Jan', score: 12 },
    { date: 'Feb', score: 15 },
    { date: 'Mar', score: 18 },
    { date: 'Apr', score: 22 }
  ];

  const stateData = Object.entries(topState).map(([state, count]) => ({ name: state, value: count }));

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="card"><h3>Total Entities</h3><p className="metric-value">{totalEntities.toLocaleString()}</p></div>
        <div className="card"><h3>High-Risk</h3><p className="metric-value">{highRisk}</p></div>
        <div className="card"><h3>Critical</h3><p className="metric-value">{critical}</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div className="card">
          <h3>Fraud Score Trend</h3>
          <LineChart width={400} height={200} data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#0D47A1" />
          </LineChart>
        </div>

        <div className="card">
          <h3>State Breakdown</h3>
          <PieChart width={400} height={200}>
            <Pie data={stateData} cx={200} cy={100} labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value">
              {stateData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;