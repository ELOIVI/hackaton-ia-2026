'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

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

const InternalCoverageMapLeaflet = dynamic(() => import('./InternalCoverageMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center text-sm text-gray-500">
      Carregant mapa interactiu...
    </div>
  ),
});

export default function InternalCoverageMap() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch(`${API_BASE}/catalog/centres`, { headers }),
      fetch(`${API_BASE}/expedients`, { headers }),
    ])
      .then(async ([centresRes, expRes]) => {
        if (!centresRes.ok || !expRes.ok) {
          throw new Error('No s\'han pogut carregar les dades del mapa');
        }
        const centresData = (await centresRes.json()) as Centre[];
        const expedientsData = (await expRes.json()) as Expedient[];
        setCentres(
          centresData.filter(
            (c) => typeof c?.lat === 'number' && typeof c?.lng === 'number'
          )
        );
        setExpedients(expedientsData);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Error carregant mapa');
      })
      .finally(() => setLoading(false));
  }, []);

  const expedientsWithCoords = useMemo(
    () => expedients.filter((e) => typeof e.fitxa?.lat === 'number' && typeof e.fitxa?.lng === 'number'),
    [expedients]
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Mapa Operatiu Territorial</h3>
          <p className="text-xs text-gray-500">Punts d&apos;atenció Càritas i localització aproximada dels expedients</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#C8102E]" />
            Centres: {centres.length}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-700" />
            Expedients geolocalitzats: {expedientsWithCoords.length}
          </span>
        </div>
      </div>

      <div className="h-[380px] rounded-2xl overflow-hidden border border-gray-100">
        {loading ? (
          <div className="h-full w-full rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center text-sm text-gray-500">
            Carregant mapa interactiu...
          </div>
        ) : error ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-red-600 bg-red-50">
            {error}
          </div>
        ) : (
          <InternalCoverageMapLeaflet centres={centres} expedients={expedients} />
        )}
      </div>
    </section>
  );
}
