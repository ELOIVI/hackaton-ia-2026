import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './DashboardKPIs';
import NeedsDistributionChart from './NeedsDistributionChart';
import VolunteerCoverageChart from './VolunteerCoverageChart';
import UrgentNeedsPanel from './UrgentNeedsPanel';
import ActivityFeed from './ActivityFeed';
import CorporatePartners from './CorporatePartners';

export default function InternalDashboardPage() {
  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10 2xl:px-16 py-8 pb-24 md:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tauler de Control</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Càritas Diocesana de Tarragona · Actualitzat <time dateTime="2026-03-20T18:04:31">20 de març 2026, 18:04</time>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              En directe
            </span>
          </div>
        </div>

        <DashboardKPIs />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <NeedsDistributionChart />
          <VolunteerCoverageChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <UrgentNeedsPanel />
          </div>
          <div className="flex flex-col gap-6">
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