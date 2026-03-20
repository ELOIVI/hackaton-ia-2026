'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ATTENTION_CENTERS } from './SupportLocatorClient';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createCaritasIcon = (highlighted: boolean, selected: boolean) => {
  const color = selected ? '#9E0D24' : highlighted ? '#C8102E' : '#6B6460';
  const size = selected ? 36 : highlighted ? 32 : 26;
  const ring = highlighted || selected ? `<circle cx="18" cy="18" r="16" fill="${color}" opacity="0.15"/>` : '';

  return L.divIcon({
    className: '',
    html: `<svg width="${size + 12}" height="${size + 12}" viewBox="0 0 ${size + 12} ${size + 12}" xmlns="http://www.w3.org/2000/svg">
      ${ring}
      <circle cx="${(size + 12) / 2}" cy="${(size + 12) / 2}" r="${size / 2}" fill="${color}" stroke="white" stroke-width="2.5"/>
      <text x="${(size + 12) / 2}" y="${(size + 12) / 2 + 5}" text-anchor="middle" fill="white" font-size="${size * 0.4}" font-family="sans-serif">♥</text>
    </svg>`,
    iconSize: [size + 12, size + 12],
    iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    popupAnchor: [0, -(size + 12) / 2],
  });
};

interface SupportMapProps {
  centers: typeof ATTENTION_CENTERS;
  highlightedCenters: typeof ATTENTION_CENTERS;
  selectedCenter: typeof ATTENTION_CENTERS[0] | null;
  onSelectCenter: (center: typeof ATTENTION_CENTERS[0] | null) => void;
}

function MapController({ selectedCenter }: { selectedCenter: typeof ATTENTION_CENTERS[0] | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCenter) {
      map.flyTo([selectedCenter.lat, selectedCenter.lng], 14, { duration: 1 });
    }
  }, [selectedCenter, map]);
  return null;
}

const SERVICE_LABELS: Record<string, string> = { habitatge: 'Habitatge', alimentació: 'Alimentació', economia: 'Economia', documentació: 'Documentació', salut: 'Salut', educació: 'Educació' };

export default function SupportMap({ centers, highlightedCenters, selectedCenter, onSelectCenter }: SupportMapProps) {
  const highlightedIds = new Set(highlightedCenters.map((c) => c.id));

  return (
    <MapContainer center={[41.1189, 1.2445]} zoom={10} style={{ width: '100%', height: '100%' }} zoomControl={true}>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapController selectedCenter={selectedCenter} />
      {centers.map((center) => {
        const isHighlighted = highlightedIds.has(center.id);
        const isSelected = selectedCenter?.id === center.id;
        return (
          <Marker key={center.id} position={[center.lat, center.lng]} icon={createCaritasIcon(isHighlighted, isSelected)} eventHandlers={{ click: () => onSelectCenter(isSelected ? null : center) }}>
            <Popup>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', minWidth: '200px' }}>
                <div style={{ background: 'linear-gradient(135deg, #C8102E 0%, #9E0D24 100%)', margin: '-10px -15px 10px', padding: '12px 15px', borderRadius: '8px 8px 0 0' }}>
                  <p style={{ color: 'white', fontWeight: '700', fontSize: '13px', margin: 0 }}>{center.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: '2px 0 0' }}>{center.district}</p>
                </div>
                <p style={{ fontSize: '12px', color: '#6B6460', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {center.address}</p>
                <p style={{ fontSize: '12px', color: '#6B6460', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>🕐 {center.hours}</p>
                <a href={`tel:${center.phone.replace(/\s/g, '')}`} style={{ fontSize: '13px', fontWeight: '700', color: '#C8102E', display: 'block', marginBottom: '8px' }}>📞 {center.phone}</a>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {center.services.map((s) => (
                    <span key={s} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: '#F5E6E9', color: '#9E0D24', fontWeight: '600' }}>{SERVICE_LABELS[s] || s}</span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}