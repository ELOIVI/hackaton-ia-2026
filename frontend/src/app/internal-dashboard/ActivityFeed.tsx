'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, MapPin, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

interface Expedient {
  id: string;
  urgencia?: string;
  estat?: string;
  perfil_resum?: string;
  data_creacio?: string;
  centre_assignat?: { nom?: string };
  voluntaris_assignats?: Array<{ id?: string; nom?: string }>;
  empreses_assignades?: Array<{ id?: string; nom?: string }>;
}

interface ActivityItem {
  id: string;
  message: string;
  detail: string;
  time: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function relativeTime(iso?: string): string {
  if (!iso) return 'Fa una estona';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return 'Fa una estona';

  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Fa uns segons';
  if (mins < 60) return `Fa ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Fa ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Fa ${days}d`;
}

function expedientToActivity(exp: Expedient): ActivityItem {
  const centre = exp.centre_assignat?.nom || 'Centre pendent';
  const resum = exp.perfil_resum || `Expedient #${exp.id}`;

  if (exp.estat === 'tancat') {
    return {
      id: `${exp.id}-closed`,
      message: 'Necessitat resolta',
      detail: `${resum} · ${centre}`,
      time: relativeTime(exp.data_creacio),
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    };
  }

  if (exp.urgencia === 'critica' || exp.urgencia === 'alta') {
    return {
      id: `${exp.id}-urgent`,
      message: 'Nova sol·licitud urgent',
      detail: `${resum} · ${centre}`,
      time: relativeTime(exp.data_creacio),
      icon: AlertTriangle,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    };
  }

  if (Array.isArray(exp.voluntaris_assignats) && exp.voluntaris_assignats.length > 0) {
    return {
      id: `${exp.id}-vols`,
      message: 'Voluntariat assignat',
      detail: `${exp.voluntaris_assignats.length} voluntaris · ${centre}`,
      time: relativeTime(exp.data_creacio),
      icon: UserPlus,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    };
  }

  if (Array.isArray(exp.empreses_assignades) && exp.empreses_assignades.length > 0) {
    return {
      id: `${exp.id}-company`,
      message: 'Empresa col·laboradora activada',
      detail: `${exp.empreses_assignades.length} empreses · ${centre}`,
      time: relativeTime(exp.data_creacio),
      icon: Building2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    };
  }

  return {
    id: `${exp.id}-center`,
    message: "Punt d'atenció assignat",
    detail: `${resum} · ${centre}`,
    time: relativeTime(exp.data_creacio),
    icon: MapPin,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  };
}

export default function ActivityFeed() {
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/expedients`, { headers: getAuthHeaders() });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          const msg = typeof data?.error === 'string' ? data.error : "No s'ha pogut carregar l'activitat";
          throw new Error(msg);
        }
        setExpedients(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error carregant activitat');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const activityItems = useMemo(() => {
    return [...expedients]
      .sort((a, b) => new Date(b.data_creacio || 0).getTime() - new Date(a.data_creacio || 0).getTime())
      .slice(0, 8)
      .map(expedientToActivity);
  }, [expedients]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="text-base font-bold text-gray-900">Activitat recent</h2><p className="text-sm text-gray-500 mt-0.5">Últimes 24 hores</p></div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />En viu</span>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
        {loading && <div className="text-sm text-gray-500 py-4">Carregant activitat...</div>}
        {!loading && activityItems.length === 0 && <div className="text-sm text-gray-500 py-4">Encara no hi ha activitat registrada.</div>}
        {activityItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl px-2 -mx-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.iconBg}`}><Icon size={14} className={item.iconColor} /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 leading-tight">{item.message}</p><p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.detail}</p></div>
              <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5 font-medium whitespace-nowrap">{item.time}</span>
            </div>
          );
        })}
      </div>
      <button className="mt-4 w-full text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Veure tot l&apos;historial</button>
    </div>
  );
}