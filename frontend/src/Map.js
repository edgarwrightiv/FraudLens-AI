import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/styles.min.css';  // Fixed path

const FraudMap = ({ data }) => {
  const getColor = (score) => {
    if (score > 20) return '#D32F2F';
    if (score > 12) return '#FF9800';
    return '#43A047';
  };

  const getRadius = (score) => {
    if (score > 20) return 8;
    if (score > 12) return 6;
    return 4;
  };

  const limitedData = data.slice(0, 500);

  return (
    <MapContainer center={[39.8, -98.6]} zoom={4} style={{ height: '650px', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
        {limitedData.map((row, index) => (
          <CircleMarker
            key={index}
            center={[row.lat || 39.8 + Math.random() * 2, row.lon || -98.6 + Math.random() * 2]}
            radius={getRadius(row.fraud_score)}
            color={getColor(row.fraud_score)}
            fillOpacity={0.8}
          >
            <Popup>
              <b>{row.recipient_name}</b><br />
              Fraud Score: {row.fraud_score.toFixed(1)}<br />
              Amount: {row.amount_formatted}<br />
              State: {row.state}
            </Popup>
          </CircleMarker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default FraudMap;