'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, LogOut, ClipboardList, BarChart2, ListChecks } from 'lucide-react';

export default function WorkerDashboard({
  user,
  onLogout,
  onNewExpedient,
}: {
  user: Record<string,unknown>;
  onLogout: () => void;
  onNewExpedient?: () => void;
}) {
  const router = useRouter();

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-emerald-50">
              <UserCog size={28} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{String(user.name || 'Treballador/a')}</h1>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                Personal Càritas
              </span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <button onClick={() => router.push('/internal-dashboard')}
            className="w-full flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all text-left">
            <BarChart2 size={24} className="text-emerald-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-gray-900">Tauler de control</div>
              <div className="text-xs text-gray-500">KPIs, gràfiques i estadístiques generals</div>
            </div>
          </button>

          <button
            onClick={() => {
              if (onNewExpedient) {
                onNewExpedient();
                return;
              }
              router.push('/internal-dashboard?action=expedient-new#expedients');
            }}
            className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all text-left">
            <ClipboardList size={24} className="text-gray-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-gray-900">Afegir expedient</div>
              <div className="text-xs text-gray-500">Obre directament el formulari de nova fitxa</div>
            </div>
          </button>

          <button onClick={() => router.push('/internal-dashboard?scope=mine#expedients')}
            className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl transition-all text-left">
            <ListChecks size={24} className="text-gray-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-gray-900">Els meus expedients</div>
              <div className="text-xs text-gray-500">Filtra només els casos creats per tu</div>
            </div>
          </button>
        </div>

        <div className="mt-6 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-400">
            Ubicació: {String(user.location || 'Tarragona')}
          </p>
        </div>
      </div>
    </div>
  );
}
