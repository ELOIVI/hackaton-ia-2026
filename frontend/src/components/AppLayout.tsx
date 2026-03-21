'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, LayoutDashboard, Menu, X, Type, Sparkles } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('caritasUser');
    if (!saved) {
      setUserRole(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { role?: string; expiresAt?: number };
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem('caritasUser');
        setUserRole(null);
        return;
      }
      setUserRole(parsed.role || null);
    } catch {
      setUserRole(null);
    }
  }, [pathname]);

  const navItems = useMemo(() => {
    const base = [
      { href: '/help-request-interface', label: 'Perfils', icon: Heart, color: 'text-rose-600', activeBg: 'bg-rose-50' },
      { href: '/support-locator', label: 'Necessito ajuda', icon: MapPin, color: 'text-blue-600', activeBg: 'bg-blue-50' },
    ];

    if (userRole === 'treballador') {
      base.push({ href: '/internal-dashboard', label: 'Panell Intern', icon: LayoutDashboard, color: 'text-emerald-600', activeBg: 'bg-emerald-50' });
    }

    return base;
  }, [userRole]);

  return (
    <div className={largeText ? 'large-text' : ''}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/help-request-interface" className="flex items-center gap-2 group">
              <Sparkles className="text-red-600" size={28} />
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-lg tracking-tight" style={{ color: '#C8102E' }}>Càritas Tarragona</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-150 ${isActive ? `${item.activeBg} ${item.color} font-semibold` : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5 relative">
              {userRole && (
                <span className="hidden md:inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  {userRole}
                </span>
              )}
              <button onClick={() => setLargeText(!largeText)} className={`p-2 rounded-lg transition-all duration-150 ${largeText ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}>
                <Type size={18} />
              </button>
              <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden pb-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive ? `${item.activeBg} ${item.color} font-semibold` : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>
      <main className="pt-16 min-h-screen bg-[#FAFAF8]">{children}</main>
    </div>
  );
}