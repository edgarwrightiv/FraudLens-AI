import React, { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const PeopleOfInterest = ({ data }) => {
  const [selectedFounder, setSelectedFounder] = useState(null);

  const founders = [...new Set(data.map(item => item.founder))];

  const founderData = founders.map(founder => {
    const companies = data.filter(item => item.founder === founder);
    return {
      founder,
      company_count: companies.length,
      total_amount: companies.reduce((sum, c) => sum + c.amount, 0),
      avg_fraud_score: companies.reduce((sum, c) => sum + c.fraud_score, 0) / companies.length
    };
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2>People of Interest</h2>
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={founderData}
          columnDefs={[
            { field: 'founder', headerName: 'Founder', flex: 1 },
            { field: 'company_count', headerName: 'Companies', width: 120 },
            { field: 'total_amount', headerName: 'Total Amount', width: 150 },
            { field: 'avg_fraud_score', headerName: 'Avg Fraud Score', width: 150 }
          ]}
          onRowClicked={e => setSelectedFounder(e.data.founder)}
        />
      </div>

      {selectedFounder && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Profile: {selectedFounder}</h3>
          <p><strong>Companies:</strong> {founderData.find(f => f.founder === selectedFounder)?.company_count}</p>
          <p><strong>Total Amount:</strong> ${founderData.find(f => f.founder === selectedFounder)?.total_amount.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default PeopleOfInterest;