'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Centre = {
  id?: string | number;
  nom?: string;
  municipi?: string;
  adreca?: string;
  lat: number;
  lng: number;
};

type Expedient = {
  id: string;
  urgencia?: string;
  estat?: string;
  fitxa?: {
    municipi?: string;
    lat?: number;
    lng?: number;
  };
};

interface Props {
  centres: Centre[];
  expedients: Expedient[];
}

const centreIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;background:#C8102E;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const expedientIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#0E7490;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const urgencyColor = (urgencia?: string) => {
  if (urgencia === 'critica') return '#991B1B';
  if (urgencia === 'alta') return '#B45309';
  if (urgencia === 'mitjana') return '#0369A1';
  return '#4B5563';
};

export default function InternalCoverageMapLeaflet({ centres, expedients }: Props) {
  const expedientsWithCoords = expedients.filter(
    (e) => typeof e.fitxa?.lat === 'number' && typeof e.fitxa?.lng === 'number'
  );

  return (
    <MapContainer
      center={[41.1189, 1.2445]}
      zoom={9}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {centres.map((centre) => (
        <Marker
          key={`centre-${centre.id ?? `${centre.lat}-${centre.lng}`}`}
          position={[centre.lat, centre.lng]}
          icon={centreIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-gray-900">{centre.nom ?? 'Centre Càritas'}</p>
              <p className="text-gray-600">{centre.municipi ?? 'Municipi no indicat'}</p>
              {centre.adreca ? <p className="text-gray-500">{centre.adreca}</p> : null}
            </div>
          </Popup>
        </Marker>
      ))}

      {expedientsWithCoords.map((exp) => (
        <Marker
          key={`exp-${exp.id}`}
          position={[exp.fitxa!.lat as number, exp.fitxa!.lng as number]}
          icon={expedientIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-gray-900">Expedient {exp.id}</p>
              <p className="text-gray-600">{exp.fitxa?.municipi ?? 'Municipi no indicat'}</p>
              <p style={{ color: urgencyColor(exp.urgencia) }} className="font-medium">
                Urgència: {exp.urgencia ?? 'mitjana'}
              </p>
              <p className="text-gray-500">Estat: {exp.estat ?? 'actiu'}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
