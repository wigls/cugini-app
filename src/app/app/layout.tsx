'use client'

import { AppHeader } from '../../components/Appheader';
import { NavTabs } from '../../components/Navtabs';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-100">
      <AppHeader />
      <NavTabs />
      <main className="mx-auto w-full max-w-[540px] px-3 pb-24">
        {children}
      </main>
    </div>
  );
}
