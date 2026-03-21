'use client';
import React, { useState } from 'react';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

export default function WorkerNewExpedient({
  onBack, onCreated
}: {
  onBack: () => void;
  onCreated: (exp: Record<string,unknown>) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [fitxa, setFitxa] = useState({
    edat: '',
    municipi: 'Tarragona',
    tipus_habitatge: '',
    situacio_laboral: '',
    tipus_ingressos: '',
    ciutadania: '10',
    menors_a_carrec: '0',
  });

  const handleSubmit = async () => {
    if (!fitxa.edat || !fitxa.tipus_habitatge) {
      alert('Omple almenys edat i tipus d\'habitatge');
      return;
    }
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
      const nou = await res.json();
      onCreated(nou);
    } catch {
      alert('Error creant expedient. Comprova que el backend està actiu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar al dashboard
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,16,46,0.1)' }}>
            <Sparkles size={22} style={{ color: '#C8102E' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nova fitxa social</h1>
            <p className="text-xs text-gray-400">La IA farà el matching automàticament</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Edat *</label>
              <input type="number" min="0" max="120" value={fitxa.edat}
                onChange={e => setFitxa({...fitxa, edat: e.target.value})}
                className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200"
                placeholder="35" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Municipi</label>
              <select value={fitxa.municipi}
                onChange={e => setFitxa({...fitxa, municipi: e.target.value})}
                className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200">
                {['Tarragona','Reus','Cambrils','Salou','Valls','Tortosa','Amposta','El Vendrell'].map(m =>
                  <option key={m}>{m}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Situació d'habitatge *</label>
            <select value={fitxa.tipus_habitatge}
              onChange={e => setFitxa({...fitxa, tipus_habitatge: e.target.value})}
              className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200">
              <option value="">Selecciona...</option>
              <option value="Infrahabitatge">Infrahabitatge</option>
              <option value="Sense habitatge">Sense habitatge</option>
              <option value="Llogada">Llogada</option>
              <option value="Rellogada">Rellogada</option>
              <option value="Ocupada">Ocupada</option>
              <option value="Propietat">Propietat</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Situació laboral</label>
            <select value={fitxa.situacio_laboral}
              onChange={e => setFitxa({...fitxa, situacio_laboral: e.target.value})}
              className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200">
              <option value="">Selecciona...</option>
              <option value="5">Aturat inscrit al SOC</option>
              <option value="6">Aturat no inscrit</option>
              <option value="3">Treballa sense contracte</option>
              <option value="1">Treballa amb contracte</option>
              <option value="9">Tasques de la llar</option>
              <option value="7">Jubilat/pensionista</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipus d'ingressos</label>
            <select value={fitxa.tipus_ingressos}
              onChange={e => setFitxa({...fitxa, tipus_ingressos: e.target.value})}
              className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200">
              <option value="">Selecciona...</option>
              <option value="3">Sense ingressos</option>
              <option value="6">Ingrés Mínim Vital (IMV)</option>
              <option value="8">Renda Garantida Ciutadania</option>
              <option value="7">Ajuda serveis socials</option>
              <option value="2">Ingressos de treball</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ciutadania</label>
            <select value={fitxa.ciutadania}
              onChange={e => setFitxa({...fitxa, ciutadania: e.target.value})}
              className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200">
              <option value="10">Espanyol/a</option>
              <option value="3">Comunitari/ària europeu</option>
              <option value="1">Extracomunitari/ària</option>
              <option value="7">Indocumentat/ada</option>
              <option value="5">Refugiat/ada</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menors a càrrec</label>
            <input type="number" min="0" max="10" value={fitxa.menors_a_carrec}
              onChange={e => setFitxa({...fitxa, menors_a_carrec: e.target.value})}
              className="w-full mt-1.5 px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" />
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#C8102E' }}>
            {submitting
              ? <><Loader2 size={16} className="animate-spin" />Processant amb IA...</>
              : <><Sparkles size={16} />Crear expedient amb matching IA</>}
          </button>
        </div>
      </div>
    </div>
  );
}
