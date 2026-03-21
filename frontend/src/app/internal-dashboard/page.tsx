"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { getAuthToken } from '@/lib/api';
import DashboardKPIs from './DashboardKPIs';
import NeedsDistributionChart from './NeedsDistributionChart';
import VolunteerCoverageChart from './VolunteerCoverageChart';
import UrgentNeedsPanel from './UrgentNeedsPanel';
import ActivityFeed from './ActivityFeed';
import CorporatePartners from './CorporatePartners';
import ExpedientsPanel from './ExpedientsPanel';

export default function InternalDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    let role: string | null = null;

    try {
      const saved = localStorage.getItem('caritasUser');
      if (saved) {
        const parsed = JSON.parse(saved) as { role?: string; expiresAt?: number };
        if (!parsed.expiresAt || Date.now() <= parsed.expiresAt) {
          role = parsed.role || null;
        }
      }
    } catch {
      role = null;
    }

    if (!token || role !== 'treballador') {
      router.replace('/help-request-interface');
      return;
    }
    setAuthorized(true);
  }, [router]);

  if (authorized !== true) {
    return null;
  }

  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tauler de Control</h1>
            <p className="text-sm text-gray-500 mt-0.5">Càritas Diocesana de Tarragona</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />En directe
          </span>
        </div>

        <DashboardKPIs />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <NeedsDistributionChart />
          <VolunteerCoverageChart />
        </div>

        <div id="expedients" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 scroll-mt-24">
          <div className="lg:col-span-2">
            <ExpedientsPanel />
          </div>
          <div className="flex flex-col gap-6">
            <UrgentNeedsPanel />
            <ActivityFeed />
          </div>
        </div>

        <div className="mt-6">
          <CorporatePartners />
        </div>
      </div>
    </AppLayout>
  );
}
