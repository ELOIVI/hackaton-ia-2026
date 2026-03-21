'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, Plus, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { API_BASE, getAuthHeaders } from '@/lib/api';

const URGENCY_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  critica: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Crítica', icon: AlertTriangle },
  alta:    { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'Alta', icon: AlertTriangle },
  mitjana: { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', label: 'Mitjana', icon: Clock },
  baixa:   { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: 'Baixa', icon: CheckCircle },
};

interface Expedient {
  id: string;
  urgencia: string;
  perfil_resum: string;
  data_creacio: string;
  fitxa: Record<string, unknown>;
  recursos_assignats: Array<{ nom: string }>;
  centre_assignat: { nom: string };
}

export default function ExpedientsPanel() {
  const searchParams = useSearchParams();
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Expedient | null>(null);
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [fetchError, setFetchError] = useState('');

  // Camps del formulari de fitxa social
  const [fitxa, setFitxa] = useState({
    edat: '',
    municipi: 'Tarragona',
    tipus_habitatge: '',
    situacio_laboral: '',
    tipus_ingressos: '',
    ciutadania: '10',
    menors_a_carrec: '0',
  });

  useEffect(() => {
    if (searchParams.get('scope') === 'mine') {
      setScope('mine');
    }
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    setFetchError('');
    const endpoint = scope === 'mine' ? `${API_BASE}/expedients/mine` : `${API_BASE}/expedients`;

    fetch(endpoint, { headers: getAuthHeaders() })
      .then(async r => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = typeof data?.error === 'string' ? data.error : 'No autoritzat';
          throw new Error(msg);
        }
        return data;
      })
      .then(data => {
        setExpedients(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setFetchError(err instanceof Error ? err.message : 'Error carregant expedients');
        setLoading(false);
      });
  }, [scope]);

  useEffect(() => {
    if (searchParams.get('action') === 'expedient-new') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/expedient`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          fitxa: {
            ...fitxa,
            edat: parseInt(fitxa.edat) || 35,
            menors_a_carrec: parseInt(fitxa.menors_a_carrec) || 0,
            lat: 41.1189,
            lng: 1.2445,
          }
        }),
      });
      const nou = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof nou?.error === 'string' ? nou.error : 'Error creant expedient';
        throw new Error(msg);
      }
      setExpedients(prev => [nou, ...prev]);
      setShowForm(false);
      setSelected(nou);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Error creant expedient');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Expedients</h2>
          <p className="text-xs text-gray-400">{expedients.length} casos ({scope === 'mine' ? 'meus' : 'totals'})</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${scope === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            Tots
          </button>
          <button
            onClick={() => setScope('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${scope === 'mine' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            Els meus
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#C8102E' }}>
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel·lar' : 'Nova fitxa'}
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
          {fetchError}
        </div>
      )}

      {showForm && (
        <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Nova fitxa social</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Edat</label>
              <input type="number" min="0" max="120" value={fitxa.edat} onChange={e => setFitxa({...fitxa, edat: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" placeholder="35" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Municipi</label>
              <select value={fitxa.municipi} onChange={e => setFitxa({...fitxa, municipi: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
                {['Tarragona','Reus','Cambrils','Salou','Valls','Tortosa','Amposta','El Vendrell'].map(m =>
                  <option key={m}>{m}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Habitatge</label>
              <select value={fitxa.tipus_habitatge} onChange={e => setFitxa({...fitxa, tipus_habitatge: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
                <option value="">Selecciona...</option>
                <option value="Infrahabitatge">Infrahabitatge</option>
                <option value="Sense habitatge">Sense habitatge</option>
                <option value="Llogada">Llogada</option>
                <option value="Rellogada">Rellogada</option>
                <option value="Propietat">Propietat</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Situació laboral</label>
              <select value={fitxa.situacio_laboral} onChange={e => setFitxa({...fitxa, situacio_laboral: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
                <option value="">Selecciona...</option>
                <option value="5">Aturat inscrit</option>
                <option value="6">Aturat no inscrit</option>
                <option value="3">Treballa sense contracte</option>
                <option value="1">Treballa amb contracte</option>
                <option value="9">Tasques de la llar</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Ingressos</label>
              <select value={fitxa.tipus_ingressos} onChange={e => setFitxa({...fitxa, tipus_ingressos: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
                <option value="">Selecciona...</option>
                <option value="3">Sense ingressos</option>
                <option value="6">IMV</option>
                <option value="8">RGC</option>
                <option value="7">Serveis socials</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Menors a càrrec</label>
              <input type="number" min="0" max="10" value={fitxa.menors_a_carrec}
                onChange={e => setFitxa({...fitxa, menors_a_carrec: e.target.value})}
                className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#C8102E' }}>
            {submitting ? 'Processant amb IA...' : 'Crear expedient i fer matching'}
          </button>
        </div>
      )}

      {selected && (
        <div className="mb-6 p-5 rounded-2xl border-2" style={{ borderColor: '#C8102E', background: 'rgba(200,16,46,0.02)' }}>
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-sm font-bold text-gray-800">Expedient #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <p className="text-sm text-gray-600 mb-3">{selected.perfil_resum}</p>
          <div className="space-y-1">
            {selected.recursos_assignats?.slice(0,3).map((r, i) => (
              <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {r.nom}
              </div>
            ))}
          </div>
          {selected.centre_assignat?.nom && (
            <p className="text-xs text-gray-400 mt-2">Centre: {selected.centre_assignat.nom}</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8 text-sm">Carregant expedients...</div>
      ) : expedients.length === 0 ? (
        <div className="text-center text-gray-400 py-8 text-sm">
          Encara no hi ha expedients. Crea el primer amb el botó de dalt.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {expedients.map(exp => {
            const urg = URGENCY_CONFIG[exp.urgencia] || URGENCY_CONFIG.mitjana;
            const Icon = urg.icon;
            return (
              <button key={exp.id} onClick={() => setSelected(exp)}
                className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${urg.bg} ${selected?.id === exp.id ? 'ring-2 ring-red-300' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={urg.color} />
                    <span className={`text-xs font-bold uppercase ${urg.color}`}>{urg.label}</span>
                    <span className="text-xs text-gray-400">#{exp.id}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(exp.data_creacio).toLocaleDateString('ca')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-2">{exp.perfil_resum}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
