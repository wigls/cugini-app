'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// 🚫 evita que Vercel congele/pre-renderice esta página
export const dynamic = 'force-dynamic';
export const revalidate = 0 as const;
export const fetchCache = 'force-no-store';

type Reward = {
  id: number;
  name: string;
  description: string | null;
  points_cost: number;
  image_url?: string | null;
  is_active?: boolean;
};

export default function RedeemPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [isLogged, setIsLogged] = useState(false);

  const [qtyById, setQtyById] = useState<Record<number, number>>({});

  useEffect(() => {
    async function load() {
      setMessage(null);
      try {
        // 1) Sesión (no bloquea si no hay)
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        const user = userRes?.user ?? null;
        setIsLogged(!!user);
        if (userErr) console.warn('[redeem] auth.getUser:', userErr.message);

        // 2) Premios: intenta rewards_pub -> si falla, cae a "revisión"
        let got: Reward[] = [];
        let readErr: string | null = null;

        // intento 1: vista pública (si es que existe en tu prod)
        {
          const { data, error } = await supabase
            .from('rewards_pub')
            .select('id,name,description,points_cost,image_url,is_active')
            .order('points_cost', { ascending: true });

          if (!error && Array.isArray(data)) {
            got = (data as any[]).filter((r) => r.is_active !== false) as Reward[];
            console.log('[redeem] usando rewards_pub:', got.length);
          } else {
            readErr = error?.message ?? 'rewards_pub no existe o no es accesible';
            console.warn('[redeem] rewards_pub falló:', readErr);
          }
        }

        // intento 2: tu tabla con tilde (solo si el intento 1 no dio datos)
        if (got.length === 0) {
          const { data, error } = await supabase
            .from('revisión') // 👈 tu tabla real
            .select('id,name,description,points_cost,image_url,is_active')
            .order('points_cost', { ascending: true });

          if (!error && Array.isArray(data)) {
            got = (data as any[]).filter((r) => r.is_active !== false) as Reward[];
            console.log('[redeem] usando "revisión":', got.length);
          } else {
            const msg = error?.message ?? 'no se pudo leer "revisión"';
            console.error('[redeem] revisión falló:', msg);
            if (readErr) readErr += ' | ' + msg;
            else readErr = msg;
          }
        }

        setRewards(got);
        if (got.length === 0 && readErr) {
          setMessage('⚠️ No pudimos cargar los premios: ' + readErr);
        }

        // 3) Saldo (solo si hay sesión)
        if (user) {
          const { data: bal, error: balErr } = await supabase
            .from('user_points')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle();

          if (balErr) console.warn('[redeem] user_points:', balErr.message);
          setBalance(bal?.balance ?? 0);
        } else {
          setBalance(0);
        }
      } catch (e: any) {
        console.error('[redeem] error inesperado:', e);
        setMessage('❌ Error inesperado al cargar: ' + (e?.message ?? String(e)));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalUnits = useMemo(
    () => Object.values(qtyById).reduce((a, b) => a + (b || 0), 0),
    [qtyById]
  );

  const totalSelected = useMemo(() => {
    let total = 0;
    for (const r of rewards) {
      const q = qtyById[r.id] || 0;
      if (q > 0) total += r.points_cost * q;
    }
    return total;
  }, [rewards, qtyById]);

  const overLimit = totalSelected > balance;

  function incQty(id: number) {
    if (redeeming) return;
    setMessage(null);
    const reward = rewards.find((rr) => rr.id === id);
    const cost = reward?.points_cost ?? 0;
    const nextTotal = totalSelected + cost;
    if (isLogged && nextTotal > balance) {
      setMessage('⚠️ No te alcanzan los puntos para sumar esa unidad.');
      return;
    }
    setQtyById((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function decQty(id: number) {
    if (redeeming) return;
    setMessage(null);
    setQtyById((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur - 1);
      const copy: Record<number, number> = { ...prev, [id]: next };
      if (next === 0) delete copy[id];
      return copy;
    });
  }

  async function handleRedeemSelected() {
    setMessage(null);
    if (!isLogged) {
      setMessage('🔒 Inicia sesión para canjear tus puntos.');
      window.location.href = '/auth';
      return;
    }
    if (redeeming) return;
    if (totalUnits === 0) {
      setMessage('⚠️ No has seleccionado premios.');
      return;
    }
    if (totalSelected > balance) {
      setMessage(`⚠️ Seleccionaste ${totalSelected} pts y solo tienes ${balance} pts.`);
      return;
    }

    setRedeeming(true);
    try {
      let currentBalance = balance;
      const redeemedMap: Record<number, number> = {};

      for (const r of rewards) {
        const qty = qtyById[r.id] || 0;
        if (qty <= 0) continue;

        for (let i = 0; i < qty; i++) {
          if (currentBalance < r.points_cost) break;

          const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: r.id });
          if (error || data !== 'OK') {
            console.error('❌ Error al canjear:', r.name, error || data);
            setMessage('⚠️ Hubo un problema al canjear algunos premios.');
            break;
          }

          redeemedMap[r.id] = (redeemedMap[r.id] || 0) + 1;
          currentBalance -= r.points_cost;
        }
      }

      setBalance(currentBalance);
      if (Object.keys(redeemedMap).length === 0) return;

      const summary = rewards
        .filter((r) => redeemedMap[r.id] > 0)
        .map((r) => `${r.name} x${redeemedMap[r.id]}`)
        .join(', ');

      const code = 'CUG-' + Math.floor(100000 + Math.random() * 900000).toString();
      setQtyById({});
      window.location.href =
        `/app/redeem/success?code=${encodeURIComponent(code)}&reward=${encodeURIComponent(summary)}`;
    } finally {
      setRedeeming(false);
    }
  }

  const normalizeImg = (src?: string | null) =>
    !src ? '/brand/placeholder.png'
    : src.startsWith('http') ? src
    : src.startsWith('/') ? src
    : `/brand/${src}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-cugini-cream px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white/80 backdrop-blur rounded-lg border border-cugini-dark/10 p-4">
            <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-64 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cugini-cream px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="rounded-xl border border-cugini-dark/10 bg-white/90 backdrop-blur p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-cugini-green">Canjea tus puntos</h1>
            <p className="text-sm text-cugini-dark/70">Elige tus favoritos y confirma el canje.</p>
          </div>
          <div className="text-sm">
            <span className="text-cugini-dark/60">Tus puntos: </span>
            <span className="font-bold text-cugini-green">{balance}</span>
          </div>
        </div>

        <div className="bg-white rounded shadow p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Ítems: {totalUnits}</p>
          <p className="text-sm">
            Total{' '}
            <span className={`font-bold ${overLimit ? 'text-red-600' : 'text-green-700'}`}>
              {totalSelected}
            </span>{' '}
            pts
            {isLogged && overLimit && (
              <span className="ml-2 text-red-600">(te faltan {totalSelected - balance} pts)</span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!redeeming) { setQtyById({}); setMessage(null); } }}
              className="px-3 py-1 rounded text-sm bg-slate-100 hover:bg-slate-200"
              disabled={redeeming}
            >
              Limpiar
            </button>
            <button
              onClick={handleRedeemSelected}
              disabled={totalUnits === 0 || (isLogged && overLimit) || redeeming}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redeeming ? 'Procesando…' : 'Canjear seleccionados'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm px-3 py-2">
            {message}
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.length === 0 ? (
            <div className="col-span-full">
              <div className="rounded-xl border border-cugini-dark/10 bg-white/90 backdrop-blur p-6 text-center">
                <p className="text-cugini-dark/60">No hay premios disponibles por ahora.</p>
              </div>
            </div>
          ) : (
            <>
              {rewards.map((r) => {
                const qty = qtyById[r.id] || 0;
                const lineTotal = qty * r.points_cost;
                const imageSrc = normalizeImg(r.image_url);

                return (
                  <div
                    key={r.id}
                    className="group rounded-2xl border border-cugini-dark/10 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                  >
                    <div className="relative">
                      <img src={imageSrc} alt={r.name} className="w-full h-40 object-cover" loading="lazy" />
                      <div className="absolute top-2 right-2 bg-cugini-green text-white text-xs px-2 py-1 rounded-full shadow">
                        {r.points_cost} pts
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-cugini-dark">{r.name}</h3>
                      <p className="text-xs text-cugini-dark/60 line-clamp-2 mt-1">{r.description ?? '—'}</p>

                      <div className="mt-auto pt-3 flex items-center justify-between">
                        {qty > 0 ? (
                          <span className="text-sm text-cugini-dark/70">
                            = <span className="font-semibold">{lineTotal}</span> pts
                          </span>
                        ) : <span />}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decQty(r.id)}
                            disabled={redeeming}
                            className="w-9 h-9 rounded-lg bg-cugini-cream hover:bg-cugini-green/20 text-cugini-dark text-lg leading-none disabled:opacity-50"
                            aria-label={`Disminuir ${r.name}`}
                          >
                            –
                          </button>
                          <span className="min-w-6 text-center font-semibold">{qty}</span>
                          <button
                            onClick={() => incQty(r.id)}
                            disabled={redeeming}
                            className="w-9 h-9 rounded-lg bg-cugini-cream hover:bg-cugini-green/20 text-cugini-dark text-lg leading-none disabled:opacity-50"
                            aria-label={`Aumentar ${r.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div
                aria-hidden="true"
                className="rounded-2xl border border-cugini-dark/10 bg-white shadow-sm overflow-hidden flex flex-col items-center justify-center pointer-events-none select-none"
              >
                <div className="relative flex items-center justify-center w-full h-44">
                  <img src="/brand/walker.png" alt="" className="h-40 w-auto object-contain opacity-40 scale-110 transform" loading="lazy" />
                </div>
                <div className="pb-4">
                  <p className="text-center text-base font-bold text-cugini-green">Cugini Pizza</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
