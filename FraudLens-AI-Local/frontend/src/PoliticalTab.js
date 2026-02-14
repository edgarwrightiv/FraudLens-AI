import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const PoliticalTab = () => {
  const politicalData = [
    { politician: 'Sen. John Doe', party: 'D', linked_company: 'QTC Medical', contribution: '$45,000', insider_alert: 'Yes' },
    { politician: 'Rep. Jane Smith', party: 'R', linked_company: 'OptumServe', contribution: '$28,500', insider_alert: 'No' },
    { politician: 'Gov. Mike Lee', party: 'R', linked_company: 'Happy Tots Daycare', contribution: '$12,000', insider_alert: 'Yes' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Political Connections</h2>
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact rowData={politicalData} columnDefs={[
          { field: 'politician', headerName: 'Politician', flex: 1 },
          { field: 'party', headerName: 'Party', width: 100 },
          { field: 'linked_company', headerName: 'Linked Company', flex: 1 },
          { field: 'contribution', headerName: 'Contribution', width: 150 },
          { field: 'insider_alert', headerName: 'Insider Alert', width: 120 }
        ]} />
      </div>
    </div>
  );
};

export default PoliticalTab;