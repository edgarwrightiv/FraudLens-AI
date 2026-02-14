import React from 'react';
import CytoscapeComponent from 'react-cytoscapejs';  // Fixed import

const NetworkGraph = ({ data }) => {
  const elements = data.nodes.map(node => ({ data: { id: node.id, label: node.label } }))
    .concat(data.edges.map(edge => ({ data: { source: edge.source, target: edge.target } })));

  const style = [
    { selector: 'node', style: { 'background-color': '#0D47A1', 'label': 'data(label)', 'color': 'white' } },
    { selector: 'edge', style: { 'width': 2, 'line-color': '#E0E0E0' } }
  ];

  return (
    <div>
      <h2>Fraud Connection Web</h2>
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '600px' }}
        stylesheet={style}
        cy={(cy) => {
          cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            alert(`Clicked: ${node.data('label')}`);
          });
        }}
      />
    </div>
  );
};

export default NetworkGraph;