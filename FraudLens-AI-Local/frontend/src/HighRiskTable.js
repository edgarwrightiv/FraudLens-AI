import React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const HighRiskTable = ({ data, onRowClick }) => {
  const columnDefs = [
    { field: 'recipient_name', headerName: 'Company', sortable: true, filter: true, flex: 2 },
    { field: 'founder', headerName: 'Founder', sortable: true, filter: true },
    { field: 'state', headerName: 'State', sortable: true, filter: true, width: 100 },
    { field: 'amount_formatted', headerName: 'Amount', sortable: true, width: 120 },
    { field: 'fraud_score', headerName: 'Fraud Score', sortable: true, width: 120, cellStyle: params => ({
        color: params.value > 20 ? '#D32F2F' : params.value > 12 ? '#FF9800' : '#43A047'
      })
    },
    { field: 'red_flags', headerName: 'Red Flags', sortable: true, width: 100 }
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  return (
    <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="single"
        onRowClicked={onRowClick}
        pagination={true}
        paginationPageSize={20}
      />
    </div>
  );
};

export default HighRiskTable;