'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Users, MapPin, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

interface Expedient {
  id: string;
  urgencia?: string;
  estat?: string;
  perfil_resum?: string;
  data_creacio?: string;
  voluntaris_assignats?: Array<{ id?: string; nom?: string }>;
  recursos_assignats?: Array<{ nom?: string; tipus?: string }>;
  centre_assignat?: { nom?: string };
}

interface NeedCard {
  id: string;
  project: string;
  center: string;
  voluntarisMissing: number;
  voluntarisActius: number;
  urgency: 3 | 2;
  deadline: string;
  needType: string;
  status: 'critic' | 'atencio';
}

const URGENCY_PRIORITY: Record<string, number> = {
  critica: 0,
  alta: 1,
  mitjana: 2,
  baixa: 3,
};

function expectedVolunteers(urgencia?: string): number {
  if (urgencia === 'critica') return 8;
  if (urgencia === 'alta') return 6;
  if (urgencia === 'mitjana') return 4;
  return 2;
}

function urgencyMeta(urgencia?: string): { urgency: 3 | 2; status: 'critic' | 'atencio'; deadline: string } {
  if (urgencia === 'critica') return { urgency: 3, status: 'critic', deadline: 'Avui' };
  if (urgencia === 'alta') return { urgency: 3, status: 'critic', deadline: 'Aquesta setmana' };
  return { urgency: 2, status: 'atencio', deadline: 'Proper mes' };
}

function toNeedCard(exp: Expedient): NeedCard {
  const voluntarisActius = Array.isArray(exp.voluntaris_assignats) ? exp.voluntaris_assignats.length : 0;
  const expected = expectedVolunteers(exp.urgencia);
  const voluntarisMissing = Math.max(expected - voluntarisActius, 0);
  const meta = urgencyMeta(exp.urgencia);
  const needType = Array.isArray(exp.recursos_assignats) && exp.recursos_assignats.length > 0
    ? exp.recursos_assignats
        .map((r) => r?.nom || r?.tipus)
        .filter((v): v is string => typeof v === 'string' && v.length > 0)
        .slice(0, 2)
        .join(', ')
    : 'Suport social general';

  return {
    id: exp.id,
    project: exp.perfil_resum || `Expedient ${exp.id}`,
    center: exp.centre_assignat?.nom || 'Centre pendent d\'assignació',
    voluntarisMissing,
    voluntarisActius,
    urgency: meta.urgency,
    deadline: meta.deadline,
    needType,
    status: meta.status,
  };
}

export default function UrgentNeedsPanel() {
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExpedients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/expedients`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'No s\'han pogut carregar les necessitats';
        throw new Error(msg);
      }
      setExpedients(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error carregant necessitats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpedients();
  }, []);

  const activeNeeds = useMemo(() => {
    return expedients
      .filter((e) => e.estat !== 'tancat')
      .sort((a, b) => {
        const pa = URGENCY_PRIORITY[a.urgencia || 'mitjana'] ?? 2;
        const pb = URGENCY_PRIORITY[b.urgencia || 'mitjana'] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.data_creacio || 0).getTime() - new Date(a.data_creacio || 0).getTime();
      })
      .slice(0, 4)
      .map(toNeedCard);
  }, [expedients]);

  const resolveNeed = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/expedient/${id}/close`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error('No s\'ha pogut tancar l\'expedient');
      }
      await loadExpedients();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error tancant expedient');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5"><AlertTriangle size={18} style={{ color: '#C8102E' }} /><h2 className="text-base font-bold text-gray-900">Necessitats urgents de voluntariat</h2></div>
          <p className="text-sm text-gray-500">{activeNeeds.length} projectes necessiten voluntaris ara</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(200,16,46,0.1)', color: '#C8102E' }}>{activeNeeds.filter((n) => n.urgency === 3).length} crítiques</span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-gray-500">Carregant necessitats...</div>
      ) : activeNeeds.length === 0 ? (
        <div className="text-center py-12"><CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" /><p className="text-base font-semibold text-gray-700">Tot cobert!</p></div>
      ) : (
        <div className="space-y-3">
          {activeNeeds.map((need) => (
            <div key={need.id} className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${need.status === 'critic' ?'border-red-200 bg-red-50/40' :'border-amber-100 bg-amber-50/30'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${need.urgency === 3 ? 'bg-red-100 text-red-700' :'bg-amber-100 text-amber-700'}`}>{need.urgency === 3 ? 'Crític' : 'Atenció'}</span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} />{need.deadline}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1">{need.project}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><MapPin size={10} />{need.center}</span>
                    <span className="flex items-center gap-1"><Users size={10} />{need.voluntarisActius} actius · falta {need.voluntarisMissing}</span>
                  </div>
                  <p className="text-xs text-gray-500">{need.needType}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#C8102E' }}>
                    Revisar
                    <ChevronRight size={12} />
                  </button>
                  <button className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => resolveNeed(need.id)}><CheckCircle2 size={11} />Resolt</button>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Cobertura actual</span><span className="font-semibold">{Math.round((need.voluntarisActius / (need.voluntarisActius + need.voluntarisMissing)) * 100)}%</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round((need.voluntarisActius / (need.voluntarisActius + need.voluntarisMissing)) * 100)}%`, background: need.urgency === 3 ? '#C8102E' : '#D97706' }} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}