'use client';

import React, { useEffect, useState } from 'react';
import { Users, Heart, MapPin, Building2, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

export default function DashboardKPIs() {
  const [expedients, setExpedients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/expedients`, { headers: getAuthHeaders() })
      .then(r => {
        if (!r.ok) throw new Error('No autoritzat');
        return r.json();
      })
      .then(data => { setExpedients(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Calculem KPIs reals dels expedients
  const urgents = expedients.filter(e => e.urgencia === 'critica' || e.urgencia === 'alta').length;
  const actius = expedients.filter(e => e.estat === 'actiu').length;
  const centresUnics = new Set(
    expedients
      .map(e => e?.centre_assignat?.nom)
      .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
  ).size;
  const voluntarisUnics = new Set(
    expedients.flatMap(e => (e?.voluntaris_assignats || []).map((v: any) => v?.id || v?.nom || ''))
  ).size;

  const KPI_DATA = [
    {
      id: 'ateses', label: 'Persones ateses', sublabel: 'Total expedients',
      value: loading ? '...' : String(expedients.length),
      trend: `${actius}`, trendDir: 'up', trendLabel: 'casos actius',
      icon: Users, bg: 'bg-red-50', color: 'text-red-600',
      border: 'border-red-100', trendColor: 'text-green-600', hero: true
    },
    {
      id: 'urgents', label: 'Necessitats urgents', sublabel: 'Sense cobertura avui',
      value: loading ? '...' : String(urgents),
      trend: `+${urgents}`, trendDir: 'up', trendLabel: 'casos crítics',
      icon: AlertTriangle, bg: 'bg-red-50', color: 'text-red-600',
      border: 'border-red-200', trendColor: 'text-red-600', alert: true
    },
    {
      id: 'voluntaris', label: 'Voluntaris actius', sublabel: 'Incorporació: 3 mesos',
      value: loading ? '...' : String(voluntarisUnics), trend: 'live', trendDir: 'up', trendLabel: 'assignats a casos',
      icon: Heart, bg: 'bg-rose-50', color: 'text-rose-600',
      border: 'border-rose-100', trendColor: 'text-green-600'
    },
    {
      id: 'punts', label: "Punts d'atenció", sublabel: 'Província de Tarragona',
      value: loading ? '...' : String(centresUnics), trend: 'live', trendDir: 'up', trendLabel: 'centres assignats',
      icon: MapPin, bg: 'bg-blue-50', color: 'text-blue-600',
      border: 'border-blue-100', trendColor: 'text-green-600'
    },
    {
      id: 'empreses', label: 'Empreses amb Cor', sublabel: "Col·laboradores actives",
      value: loading ? '...' : 'N/D', trend: '-', trendDir: 'down', trendLabel: 'pendent integració',
      icon: Building2, bg: 'bg-amber-50', color: 'text-amber-600',
      border: 'border-amber-100', trendColor: 'text-red-500'
    },
    {
      id: 'temps', label: 'Temps incorporació', sublabel: 'Voluntaris nous',
      value: loading ? '...' : 'N/D', trend: '-', trendDir: 'down', trendLabel: 'pendent mètrica',
      icon: Clock, bg: 'bg-green-50', color: 'text-green-600',
      border: 'border-green-100', trendColor: 'text-green-600'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {KPI_DATA.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.id} className={`relative bg-white rounded-2xl border p-5 hover:shadow-md transition-all
            ${kpi.hero ? 'col-span-2' : 'col-span-1'}
            ${kpi.alert ? 'border-red-200' : kpi.border}`}>
            {kpi.alert && (
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">Urgent</span>
              </div>
            )}
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <Icon size={kpi.hero ? 22 : 18} className={kpi.color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-[11px] text-gray-400">{kpi.sublabel}</p>
              </div>
            </div>
            <div className={`font-extrabold text-gray-900 ${kpi.hero ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'}`}>
              {kpi.value}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {kpi.trendDir === 'up'
                ? <TrendingUp size={13} className={kpi.trendColor} />
                : <TrendingDown size={13} className={kpi.trendColor} />}
              <span className={`text-xs font-semibold ${kpi.trendColor}`}>{kpi.trend}</span>
              <span className="text-xs text-gray-400">{kpi.trendLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
