'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const NEEDS_DATA = [
  { name: 'Habitatge', value: 5695, pct: 58, color: '#C8102E' },
  { name: 'Menors', value: 4614, pct: 47, color: '#E8415A' },
  { name: 'Monoparental', value: 2356, pct: 24, color: '#F4748A' },
  { name: 'Alimentació', value: 3140, pct: 32, color: '#9E0D24' },
  { name: 'Documentació', value: 1963, pct: 20, color: '#C8102E' },
  { name: 'Salut mental', value: 1276, pct: 13, color: '#E8415A' },
  { name: 'Violència', value: 883, pct: 9, color: '#F4748A' },
  { name: 'Solitud', value: 687, pct: 7, color: '#9E0D24' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3">
        <p className="text-sm font-bold text-gray-900 mb-1">{label}</p>
        <p className="text-2xl font-extrabold tabular-nums" style={{ color: '#C8102E' }}>{payload[0].value.toLocaleString('ca-ES')}</p>
        <p className="text-xs text-gray-500">{((payload[0].value / 9818) * 100).toFixed(1)}% del total atès</p>
      </div>
    );
  }
  return null;
};

export default function NeedsDistributionChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-6">
        <div><h2 className="text-base font-bold text-gray-900">Distribució per tipus de necessitat</h2><p className="text-sm text-gray-500 mt-0.5">Persones ateses 2025 · Total 9.818</p></div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">Any 2025</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={NEEDS_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9E9894', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#9E9894', fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,16,46,0.04)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {NEEDS_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#C8102E' : index % 2 === 0 ? '#E8415A' : '#F4A0AE'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {NEEDS_DATA.slice(0, 4).map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: '#C8102E', opacity: 0.5 + (item.pct / 100) * 0.5 }} />
            <span className="text-xs text-gray-600 truncate">{item.name}</span><span className="text-xs font-bold text-gray-900 ml-auto tabular-nums">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}