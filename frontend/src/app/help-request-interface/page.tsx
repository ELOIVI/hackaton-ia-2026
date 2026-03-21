'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import VolunteerForm from './VolunteerForm';
import CompanyForm from './CompanyForm';
import WorkerForm from './WorkerForm';
import AttendedForm from './AttendedForm';
import { Heart, Building2, UserCog, HandHelping, ArrowRight, LogOut, User as UserIcon, Shield } from 'lucide-react';

export default function HelpRequestInterfacePage() {
  const [view, setView] = useState<'selection' | 'volunteer' | 'company' | 'worker' | 'attended'>('selection');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('loggedUser');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const handleLogin = (userData: any) => {
    localStorage.setItem('loggedUser', JSON.stringify(userData));
    setUser(userData);
    setView('selection');
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedUser');
    setUser(null);
    setView('selection');
  };

  if (user) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                  <UserIcon className="text-red-600" size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{user.name || user.companyName}</h1>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500 bg-red-50 px-2 py-1 rounded-md">
                    {user.role}
                  </span>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <LogOut size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Email</p>
                  <p className="text-gray-900 font-medium">{user.email}</p>
                </div>
                {user.age && (
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Edat</p>
                    <p className="text-gray-900 font-medium">{user.age} anys</p>
                  </div>
                )}
                {user.location && (
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Localització</p>
                    <p className="text-gray-900 font-medium">{user.location}</p>
                  </div>
                )}
                {user.helpType && (
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Tipus d'ajuda</p>
                    <p className="text-gray-900 font-medium capitalize">{user.helpType}</p>
                  </div>
                )}
                {user.level && (
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Nivell de compromís</p>
                    <p className="text-gray-900 font-medium capitalize">{user.level}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (view === 'volunteer') return <AppLayout><VolunteerForm onBack={() => setView('selection')} onLogin={handleLogin} /></AppLayout>;
  if (view === 'company') return <AppLayout><CompanyForm onBack={() => setView('selection')} onLogin={handleLogin} /></AppLayout>;
  if (view === 'worker') return <AppLayout><WorkerForm onBack={() => setView('selection')} onLogin={handleLogin} /></AppLayout>;
  if (view === 'attended') return <AppLayout><AttendedForm onBack={() => setView('selection')} /></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-12 animate-fade-in-up">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Càritas Tarragona</h1>
          <p className="text-lg text-gray-500">Comença seleccionant el teu perfil d'accés</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setView('volunteer')} className="bg-white border-2 border-transparent hover:border-red-200 p-8 rounded-3xl shadow-card text-left group">
            <Heart className="text-red-600 mb-6" size={32} />
            <h3 className="text-2xl font-bold mb-2">Voluntari/a</h3>
            <p className="text-gray-500 mb-6 text-sm">Gestiona la teva ajuda i perfil de voluntariat.</p>
            <div className="flex items-center gap-2 text-red-600 font-bold"><span>Entrar</span><ArrowRight size={18} /></div>
          </button>

          <button onClick={() => setView('attended')} className="bg-white border-2 border-transparent hover:border-purple-200 p-8 rounded-3xl shadow-card text-left group">
            <HandHelping className="text-purple-600 mb-6" size={32} />
            <h3 className="text-2xl font-bold mb-2">Necessito Ajuda</h3>
            <p className="text-gray-500 mb-6 text-sm">Parla amb el nostre assistent virtual.</p>
            <div className="flex items-center gap-2 text-purple-600 font-bold"><span>Assistència</span><ArrowRight size={18} /></div>
          </button>

          <button onClick={() => setView('worker')} className="bg-white border-2 border-transparent hover:border-emerald-200 p-8 rounded-3xl shadow-card text-left group">
            <UserCog className="text-emerald-600 mb-6" size={32} />
            <h3 className="text-2xl font-bold mb-2">Treballador/a</h3>
            <p className="text-gray-500 mb-6 text-sm">Accés exclusiu per a personal de Càritas.</p>
            <div className="flex items-center gap-2 text-emerald-600 font-bold"><span>Gestió</span><ArrowRight size={18} /></div>
          </button>

          <button onClick={() => setView('company')} className="bg-white border-2 border-transparent hover:border-blue-200 p-8 rounded-3xl shadow-card text-left group">
            <Building2 className="text-blue-600 mb-6" size={32} />
            <h3 className="text-2xl font-bold mb-2">Empresa</h3>
            <p className="text-gray-500 mb-6 text-sm">Col·laboracions i recursos corporatius.</p>
            <div className="flex items-center gap-2 text-blue-600 font-bold"><span>Col·laborar</span><ArrowRight size={18} /></div>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}