'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, LayoutDashboard, Menu, X, Type, Sparkles } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/help-request-interface', label: 'Vull ajudar', labelEs: 'Quiero ayudar', icon: Heart, color: 'text-rose-600', activeBg: 'bg-rose-50' },
  { href: '/support-locator', label: 'Necessito ajuda', labelEs: 'Necesito ayuda', icon: MapPin, color: 'text-blue-600', activeBg: 'bg-blue-50' },
  { href: '/internal-dashboard', label: 'Soc Càritas', labelEs: 'Soy Càritas', icon: LayoutDashboard, color: 'text-emerald-600', activeBg: 'bg-emerald-50' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);

  return (
    <div className={largeText ? 'large-text' : ''}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/help-request-interface" className="flex items-center gap-2 group">
              <Sparkles className="text-red-600" size={28} />
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-lg tracking-tight" style={{ color: '#C8102E' }}>Càritas IA</span>
                <span className="text-xs text-gray-400 font-medium hidden sm:block">Diocesana de Tarragona</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-150 ${isActive ? `${item.activeBg} ${item.color} font-semibold` : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <Icon size={16} /><span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={() => setLargeText(!largeText)} className={`p-2 rounded-lg transition-all duration-150 ${largeText ? 'bg-red-50 text-red-600' :'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                <Type size={18} />
              </button>
              <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in">
            <nav className="px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-all duration-150 ${isActive ? `${item.activeBg} ${item.color} font-semibold` : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Icon size={20} /><div><div>{item.label}</div><div className="text-xs text-gray-400">{item.labelEs}</div></div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="pt-16 min-h-screen bg-[#FAFAF8]">{children}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-2 pb-safe">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-150 ${isActive ? item.color : 'text-gray-400'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}