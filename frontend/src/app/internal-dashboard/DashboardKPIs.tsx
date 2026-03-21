'use client';

import React, { useEffect, useState } from 'react';
import { Users, Heart, MapPin, Building2, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { API_BASE, getAuthHeaders } from '@/lib/api';

type DashboardAnalytics = {
  totals?: {
    expedients?: number;
    actius?: number;
    tancats?: number;
    urgents?: number;
  };
  context_metrics?: {
    housing_instability_pct?: number;
    irregular_status_pct?: number;
    digital_gap_risk_pct?: number;
  };
};

type AssignedVolunteer = {
  id?: string;
  nom?: string;
};

type Expedient = {
  id: string;
  urgencia?: string;
  estat?: string;
  centre_assignat?: {
    nom?: string;
  };
  voluntaris_assignats?: AssignedVolunteer[];
};

export default function DashboardKPIs() {
  const [expedients, setExpedients] = useState<Expedient[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch(`${API_BASE}/expedients`, { headers }),
      fetch(`${API_BASE}/dashboard/analytics`, { headers }),
    ])
      .then(async ([expRes, analyticsRes]) => {
        if (!expRes.ok) throw new Error('No autoritzat');
        const expData = await expRes.json();
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null;
        setExpedients(expData);
        setAnalytics(analyticsData);
        setLoading(false);
      })
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
    expedients.flatMap(e => (e?.voluntaris_assignats || []).map((v) => v?.id || v?.nom || ''))
  ).size;
  const housingPct = analytics?.context_metrics?.housing_instability_pct ?? 0;
  const irregularPct = analytics?.context_metrics?.irregular_status_pct ?? 0;
  const digitalGapPct = analytics?.context_metrics?.digital_gap_risk_pct ?? 0;
  const tancats = analytics?.totals?.tancats ?? expedients.filter(e => e.estat === 'tancat').length;

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
      value: loading ? '...' : `${irregularPct}%`, trend: `${housingPct}%`, trendDir: 'up', trendLabel: 'inestabilitat habitacional',
      icon: Building2, bg: 'bg-amber-50', color: 'text-amber-600',
      border: 'border-amber-100', trendColor: 'text-red-500'
    },
    {
      id: 'temps', label: 'Bretxa digital', sublabel: 'Risc detectat als expedients',
      value: loading ? '...' : `${digitalGapPct}%`, trend: `${tancats}`, trendDir: 'up', trendLabel: 'expedients tancats',
      icon: Clock, bg: 'bg-green-50', color: 'text-green-600',
      border: 'border-green-100', trendColor: 'text-green-600'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {KPI_DATA.map((kpi) => {
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
