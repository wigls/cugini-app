// src/components/NavTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // ajusta si usas alias @

type Tab = { href: string; label: string };

// ✅ Lista blanca de correos admin (puedes poner varios)
const ADMIN_EMAILS = [
  'diego.inzunza1601@alumnos.ubiobio.cl',
  'admin2@tu-dominio.cl',
];

export function NavTabs() {
  const pathname = usePathname() ?? '';
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = cargando

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!alive) return;

        if (!user) { setIsAdmin(false); return; }

        const email = (user.email || '').toLowerCase().trim();
        const allowList = ADMIN_EMAILS.map(s => s.toLowerCase().trim()).includes(email);
        const metaIsAdmin =
          Boolean(user.user_metadata?.is_admin) ||
          user.user_metadata?.role === 'admin';

        if (allowList || metaIsAdmin) {
          setIsAdmin(true);
          return;
        }

        // Plan B: mirar profiles.is_admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsAdmin(Boolean(profile?.is_admin));
      } catch {
        setIsAdmin(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  // --- Tabs base (DISEÑO BONITO: los 3 primeros llenan ancho, resto scrollea) ---
  const baseTabs: Tab[] = [
    { href: '/app',        label: 'Mis puntos' },
    { href: '/app/claim',  label: 'Reclamar código' },
    { href: '/app/redeem', label: 'Canjea tus puntos' },
    { href: '/app/profile',label: 'Mi perfil' },
  ];

  // 🔹 Ruta correcta de admin
  const adminTab: Tab = { href: '/admin', label: 'Admin' };

  // mientras isAdmin === null mostramos baseTabs; cuando sea true, agregamos Admin
  const tabs: Tab[] = isAdmin ? [...baseTabs, adminTab] : baseTabs;

  // activo: exacto en /app; para el resto acepta subrutas
  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav className="sticky top-12 z-50 bg-white">
      {/* contenedor que scrollea SOLO en X */}
      <div className="no-scrollbar overflow-x-auto w-full">
        {/* fila sin wrap, misma altura, gap bonito */}
        <div className="flex flex-nowrap items-center h-11 gap-2 px-2">
          {tabs.map((t, i) => {
            const active = isActive(t.href);
            // Los 3 primeros llenan la pantalla (1/3 cada uno) y NO se encogen;
            // los demás quedan después y se ven con scroll horizontal.
            const widthClass = i < 3 ? 'basis-1/3 flex-shrink-0' : 'flex-shrink-0';
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  widthClass,
                  'min-w-0 text-center px-3 py-1.5 rounded-full text-sm',
                  active
                    ? 'bg-green-100 text-green-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                <span className="block truncate">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="border-b" />
    </nav>
  );
}
