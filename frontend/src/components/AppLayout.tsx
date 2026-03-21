'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Heart, MapPin, LayoutDashboard, Menu, X } from 'lucide-react';
import { AppLanguage, applyLanguageToDocument, getStoredLang, setStoredLang } from '@/lib/i18n';

type StoredUser = {
  role?: string;
  nom?: string;
  name?: string;
  companyName?: string;
  expiresAt?: number;
};

function toTitleCaseName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('ca-ES')
    .split(/\s+/)
    .map((part) => part.charAt(0).toLocaleUpperCase('ca-ES') + part.slice(1))
    .join(' ');
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [lang, setLang] = useState<AppLanguage>('ca');

  const t = useMemo(() => {
    const labels = {
      ca: {
        profiles: 'Perfils',
        needHelp: 'Necessito ajuda',
        internalPanel: 'Panell Intern',
      },
      en: {
        profiles: 'Profiles',
        needHelp: 'I need help',
        internalPanel: 'Internal Panel',
      },
      es: {
        profiles: 'Perfiles',
        needHelp: 'Necesito ayuda',
        internalPanel: 'Panel Interno',
      },
    } as const;

    return labels[lang];
  }, [lang]);

  const userDisplayName = useMemo(() => {
    const rawName = user?.nom || user?.name || user?.companyName;
    if (!rawName || typeof rawName !== 'string') return null;
    return toTitleCaseName(rawName);
  }, [user]);

  useEffect(() => {
    setLang(getStoredLang());

    const saved = localStorage.getItem('caritasUser');
    if (!saved) {
      setUser(null);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as StoredUser;
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem('caritasUser');
        setUser(null);
        return;
      }
      setUser(parsed);
    } catch {
      setUser(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyLanguageToDocument(lang);

    let rafId: number | null = null;
    let isApplying = false;

    const scheduleTranslate = () => {
      if (isApplying) return;
      isApplying = true;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        applyLanguageToDocument(lang);
        isApplying = false;
        rafId = null;
      });
    };

    const observer = new MutationObserver(() => {
      scheduleTranslate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [lang, pathname]);

  const langButtonClass = (code: AppLanguage) =>
    `text-[11px] md:text-xs font-bold px-2.5 py-1.5 rounded-md transition-all ${
      lang === code
        ? 'bg-red-50 text-red-700 border border-red-200'
        : 'text-gray-600 border border-transparent hover:bg-gray-100'
    }`;

  const navItems = useMemo(() => {
    const base = [
      { href: '/help-request-interface', label: t.profiles, icon: Heart, color: 'text-rose-600', activeBg: 'bg-rose-50' },
      { href: '/support-locator', label: t.needHelp, icon: MapPin, color: 'text-blue-600', activeBg: 'bg-blue-50' },
    ];

    if (user?.role === 'treballador') {
      base.push({ href: '/internal-dashboard', label: t.internalPanel, icon: LayoutDashboard, color: 'text-emerald-600', activeBg: 'bg-emerald-50' });
    }

    return base;
  }, [t, user?.role]);

  return (
    <div>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/help-request-interface" className="flex items-center gap-2 group">
              <Image
                src="/caritasLogo.svg"
                alt="Càritas Logo"
                width={32}
                height={32}
                priority
                unoptimized
              />
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
              {userDisplayName && (
                <span className="hidden md:inline-flex text-[11px] font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 tracking-wide">
                  {userDisplayName}
                </span>
              )}
              <div className="hidden md:inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                <button
                  onClick={() => {
                    setLang('ca');
                    setStoredLang('ca');
                  }}
                  className={langButtonClass('ca')}
                  aria-label="Canvia idioma a catala"
                >
                  CA
                </button>
                <span className="text-gray-300 px-1">|</span>
                <button
                  onClick={() => {
                    setLang('es');
                    setStoredLang('es');
                  }}
                  className={langButtonClass('es')}
                  aria-label="Cambiar idioma a espanol"
                >
                  ES
                </button>
                <span className="text-gray-300 px-1">|</span>
                <button
                  onClick={() => {
                    setLang('en');
                    setStoredLang('en');
                  }}
                  className={langButtonClass('en')}
                  aria-label="Change language to english"
                >
                  EN
                </button>
              </div>
              <button className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden pb-3 flex flex-col gap-1">
              <div className="px-3 py-2 flex items-center justify-center rounded-lg border border-gray-200 bg-white mx-3">
                <button
                  onClick={() => {
                    setLang('ca');
                    setStoredLang('ca');
                  }}
                  className={langButtonClass('ca')}
                  aria-label="Canvia idioma a catala"
                >
                  CA
                </button>
                <span className="text-gray-300 px-1">|</span>
                <button
                  onClick={() => {
                    setLang('es');
                    setStoredLang('es');
                  }}
                  className={langButtonClass('es')}
                  aria-label="Cambiar idioma a espanol"
                >
                  ES
                </button>
                <span className="text-gray-300 px-1">|</span>
                <button
                  onClick={() => {
                    setLang('en');
                    setStoredLang('en');
                  }}
                  className={langButtonClass('en')}
                  aria-label="Change language to english"
                >
                  EN
                </button>
              </div>
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