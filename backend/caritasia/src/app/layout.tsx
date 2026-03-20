import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'CaritasIA — Intel·ligència per a la solidaritat',
  description: 'Plataforma d\'IA de Càritas Diocesana de Tarragona per connectar persones vulnerables, voluntaris i empreses col·laboradores.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}