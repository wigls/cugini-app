'use client';

import { Suspense } from 'react';
import SuccessView from './SuccessView';

// Esto evita el prerender de Vercel y no cambia tu lógica
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white rounded-xl shadow p-4">Cargando…</div>
      </div>
    }>
      <SuccessView />
    </Suspense>
  );
}
