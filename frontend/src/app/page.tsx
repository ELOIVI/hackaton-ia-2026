'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Provide a minimal client-side error boundary around the redirect.
class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
          There was an error. Please refresh.
        </div>
      );
    }
    return this.props.children;
  }
}

function Redirector() {
  const router = useRouter();

  useEffect(() => {
    // Use client-side navigation so the error boundary can capture failures.
    router.replace('/help-request-interface');
  }, [router]);

  return null;
}

export default function RootPage() {
  return (
    <RootErrorBoundary>
      <Redirector />
    </RootErrorBoundary>
  );
}