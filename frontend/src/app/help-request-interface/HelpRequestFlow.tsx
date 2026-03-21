'use client';
import React, { useState, useEffect } from 'react';
import { Heart, Building2, UserCog, HandHelping, ArrowRight } from 'lucide-react';
import VolunteerForm from '@/app/help-request-interface/VolunteerForm';
import CompanyForm from '@/app/help-request-interface/CompanyForm';
import WorkerForm from '@/app/help-request-interface/WorkerForm';
import WorkerDashboard from '@/app/help-request-interface/WorkerDashboard';
import WorkerNewExpedient from '@/app/help-request-interface/WorkerNewExpedient';
import AttendedForm from '@/app/help-request-interface/AttendedForm';
import VolunteerDashboard from '@/app/help-request-interface/VolunteerDashboard';
import CompanyDashboard from '@/app/help-request-interface/CompanyDashboard';
import { clearAuthToken, saveAuthToken } from '@/lib/api';

type Flow = 'selection' | 'volunteer' | 'company' | 'worker' | 'attended';
type WorkerView = 'dashboard' | 'new-expedient';

export default function HelpRequestFlow() {
  const [flow, setFlow] = useState<Flow>('selection');
  const [user, setUser] = useState<Record<string,unknown> | null>(null);
  const [workerView, setWorkerView] = useState<WorkerView>('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem('caritasUser');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const role = parsed.role;
      const expiresAt = Number(parsed.expiresAt || 0);
      const validRole = role === 'voluntari' || role === 'empresa' || role === 'treballador';

      if (!validRole || (expiresAt && Date.now() > expiresAt)) {
        localStorage.removeItem('caritasUser');
        clearAuthToken();
        return;
      }

      setUser(parsed);
    } catch {
      localStorage.removeItem('caritasUser');
      clearAuthToken();
    }
  }, []);

  const handleLogin = (userData: unknown) => {
    const u = userData as Record<string,unknown>;
    if (typeof u.token === 'string' && u.token) {
      saveAuthToken(u.token);
    }
    const safeUser = {
      role: u.role,
      nom: u.nom,
      name: u.name,
      companyName: u.companyName,
      email: u.email,
      location: u.location,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    };

    localStorage.setItem('caritasUser', JSON.stringify(safeUser));
    setUser(safeUser);
    setFlow('selection');
  };

  const handleLogout = () => {
    localStorage.removeItem('caritasUser');
    clearAuthToken();
    setUser(null);
    setFlow('selection');
    setWorkerView('dashboard');
  };

  if (user?.role === 'voluntari') return <VolunteerDashboard user={user} onLogout={handleLogout} />;
  if (user?.role === 'empresa') return <CompanyDashboard user={user} onLogout={handleLogout} />;

  if (user?.role === 'treballador') {
    if (workerView === 'new-expedient') return (
      <WorkerNewExpedient
        onBack={() => setWorkerView('dashboard')}
        onCreated={() => setWorkerView('dashboard')}
      />
    );
    return (
      <WorkerDashboard
        user={user}
        onLogout={handleLogout}
        onNewExpedient={() => setWorkerView('new-expedient')}
      />
    );
  }

  if (flow === 'volunteer') return <VolunteerForm onBack={() => setFlow('selection')} onLogin={handleLogin} />;
  if (flow === 'company') return <CompanyForm onBack={() => setFlow('selection')} onLogin={handleLogin} />;
  if (flow === 'worker') return <WorkerForm onBack={() => setFlow('selection')} onLogin={handleLogin} />;
  if (flow === 'attended') return <AttendedForm onBack={() => setFlow('selection')} />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Càritas Tarragona</h1>
        <p className="text-lg text-gray-500">Gestió de perfils i col·laboració social</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button onClick={() => setFlow('volunteer')}
          className="bg-white border-2 border-transparent hover:border-red-200 p-8 rounded-3xl shadow-sm text-left transition-all">
          <Heart className="text-red-600 mb-6" size={32} />
          <h3 className="text-2xl font-bold mb-2">Voluntari/a</h3>
          <p className="text-gray-500 mb-6 text-sm">Registre i gestió del teu voluntariat.</p>
          <div className="flex items-center gap-2 text-red-600 font-bold"><span>Entrar</span><ArrowRight size={18} /></div>
        </button>
        <button onClick={() => setFlow('attended')}
          className="bg-white border-2 border-transparent hover:border-purple-200 p-8 rounded-3xl shadow-sm text-left transition-all">
          <HandHelping className="text-purple-600 mb-6" size={32} />
          <h3 className="text-2xl font-bold mb-2">Necessito Ajuda</h3>
          <p className="text-gray-500 mb-6 text-sm">Assistència mitjançant el nostre assistent virtual.</p>
          <div className="flex items-center gap-2 text-purple-600 font-bold"><span>Assistència</span><ArrowRight size={18} /></div>
        </button>
        <button onClick={() => setFlow('worker')}
          className="bg-white border-2 border-transparent hover:border-emerald-200 p-8 rounded-3xl shadow-sm text-left transition-all">
          <UserCog className="text-emerald-600 mb-6" size={32} />
          <h3 className="text-2xl font-bold mb-2">Treballador/a</h3>
          <p className="text-gray-500 mb-6 text-sm">Accés corporatiu per a gestió interna.</p>
          <div className="flex items-center gap-2 text-emerald-600 font-bold"><span>Accedir</span><ArrowRight size={18} /></div>
        </button>
        <button onClick={() => setFlow('company')}
          className="bg-white border-2 border-transparent hover:border-blue-200 p-8 rounded-3xl shadow-sm text-left transition-all">
          <Building2 className="text-blue-600 mb-6" size={32} />
          <h3 className="text-2xl font-bold mb-2">Empresa</h3>
          <p className="text-gray-500 mb-6 text-sm">Col·laboració corporativa i donacions.</p>
          <div className="flex items-center gap-2 text-blue-600 font-bold"><span>Col·laborar</span><ArrowRight size={18} /></div>
        </button>
      </div>
    </div>
  );
}
