// src/components/NavTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // ajusta si usas alias @

type Tab = { href: string; label: string };

// ✅ Correos con permisos de administrador
const ADMIN_EMAILS = [
  'diego.inzunza1601@alumnos.ubiobio.cl',
  'admin2@tu-dominio.cl',
];

export function NavTabs() {
  const pathname = usePathname() ?? '';
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // === Verificación de admin (idéntica lógica, solo UI cambiada) ===
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!alive) return;
        if (!user) return setIsAdmin(false);

        const email = (user.email || '').toLowerCase().trim();
        const allowList = ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(email);
        const metaIsAdmin =
          Boolean(user.user_metadata?.is_admin) ||
          user.user_metadata?.role === 'admin';

        if (allowList || metaIsAdmin) return setIsAdmin(true);

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

  // === Tabs ===
  const baseTabs: Tab[] = [
    { href: '/app',        label: 'Mis puntos' },
    { href: '/app/claim',  label: 'Reclamar código' },
    { href: '/app/redeem', label: 'Canjea tus puntos' },
    { href: '/app/profile',label: 'Mi perfil' },
  ];
  const adminTab: Tab = { href: '/admin', label: 'Admin' };
  const tabs: Tab[] = isAdmin ? [...baseTabs, adminTab] : baseTabs;

  const isActive = (href: string) =>
    href === '/app' ? pathname === '/app' : pathname.startsWith(href);

  return (
    <nav
      className="sticky top-12 z-50 bg-gradient-to-r from-[#fff8f5] via-[#fff5ef] to-[#fff8f5] backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
    >
      {/* Scroll horizontal sutil */}
      <div className="no-scrollbar overflow-x-auto w-full">
        <div className="flex flex-nowrap items-center h-12 gap-2 px-2">
          {tabs.map((t, i) => {
            const active = isActive(t.href);
            // Los 3 primeros llenan ancho; el resto scrollea
            const widthClass = i < 3 ? 'basis-1/3 flex-shrink-0' : 'flex-shrink-0';
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  widthClass,
                  'min-w-0 relative text-center px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-out',
                  'rounded-full border border-transparent select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FFB703]/60',
                  'active:scale-[0.98]',
                  active
                    ? 'bg-gradient-to-r from-[#E63946] to-[#FFB703] text-white font-semibold shadow-md shadow-amber-700/20 animate-cugi-pop'
                    : 'text-slate-700 hover:bg-[#FFE5D0]/80 hover:text-[#D12B2B] hover:shadow-sm hover:shadow-amber-900/10'
                )}
              >
                <span className="block truncate">{t.label}</span>

                {/* Efecto brillante en activo */}
                {active && (
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-[#fff5e4]/20 to-[#fff5e4]/5 blur-sm" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="border-t border-[#FFD6A5]/40" />
    </nav>
  );
}
