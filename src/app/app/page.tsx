'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import PointsOvenCard from '../../components/PointsOvenCard'
import PizzaBackground from '../../components/PizzaBackground'

/* ========= Ajustes de la imagen decorativa ========= */
const IMAGE_SRC = '/brand/repartidor.png'
const IMAGE_OFFSET_Y = -10
const IMAGE_OPACITY = 0.25
const IMAGE_WIDTH_CLASS = 'w-44 sm:w-56 md:w-72 lg:w-80'

/* ========= Frases rotativas ========= */
const QUOTES = [
  'El amor puede esperar… ¡la pizza no! 🍕',
  'La vida es corta, di que sí a otra porción.',
  'En Cugini, la felicidad viene en caja.',
  'Menos drama, más pizza.',
]
const QUOTE_INTERVAL_MS = 10000 // 10s

type Tx = {
  id: number
  type: string
  points: number | null
  change: number | null
  reason: string | null
  created_at: string
}

type Announcement = {
  id: number
  title: string | null
  message: string
  link_url: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

/* ================================ */
const USE_NET_FOR_GOALS = true
const GOALS = [300, 600, 1000, 1500, 2000, 3000]

const TIERS = [
  { name: 'Bronce', min: 0 },
  { name: 'Plata', min: 600 },
  { name: 'Oro', min: 1000 },
  { name: 'Diamante', min: 1500 },
]

function tierBadgeColor(tierName: string) {
  if (tierName === 'Diamante') return 'bg-cugini-red text-white'
  if (tierName === 'Oro') return 'bg-yellow-400 text-cugini-dark'
  if (tierName === 'Plata') return 'bg-slate-300 text-cugini-dark'
  return 'bg-amber-600 text-white'
}
function resolveTier(totalEarned: number) {
  let current = TIERS[0]
  for (const t of TIERS) if (totalEarned >= t.min) current = t
  return current
}
function computeProgress(progressBase: number, goals: number[]) {
  const sorted = [...goals].sort((a, b) => a - b)
  if (!sorted.length) return { pct: 0, goal: 0, remain: 0 }
  if (progressBase < sorted[0]) {
    const span = sorted[0]
    return { pct: Math.round((progressBase / span) * 100), goal: sorted[0], remain: sorted[0] - progressBase }
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], goal = sorted[i]
    if (progressBase < goal) {
      const span = goal - prev
      return { pct: Math.round(((progressBase - prev) / span) * 100), goal, remain: goal - progressBase }
    }
  }
  const last = sorted[sorted.length - 1], span = 1000
  const pct = Math.round(((progressBase - last) / span) * 100)
  return { pct: Math.min(100, pct), goal: last + span, remain: last + span - progressBase }
}
function ProgressBar({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)))
  const barWidth = safe === 0 ? 0 : Math.max(2, safe)
  return (
    <div
      className="w-full h-4 rounded-full bg-cugini-cream border border-cugini-dark/10 overflow-hidden shadow-inner"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${barWidth}%`,
          background: 'linear-gradient(90deg, rgba(216,58,46,0.5) 0%, rgba(15,106,43,0.6) 100%)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  )
}

/* ================================ */
export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [points, setPoints] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [txs, setTxs] = useState<Tx[]>([])
  const [totalEarned, setTotalEarned] = useState<number>(0)
  const [showTierModal, setShowTierModal] = useState(false)
  const [animatedPct, setAnimatedPct] = useState(0)

  // Frases
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length)
        setFadeIn(true)
      }, 300)
    }, QUOTE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // === Datos de usuario + movimientos
  useEffect(() => {
    async function loadData() {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) { setLoading(false); return }
      setEmail(user.email ?? null)

      const [balanceQ, txQ] = await Promise.all([
        supabase.from('user_points').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('point_transactions')
          .select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(15),
      ])

      setPoints(balanceQ.data?.balance ?? 0)
      setTxs(txQ.data || [])

      // histórico para niveles (fallback a total_earned si existe en user_points)
      const earnedFromTx = (txQ.data || []).reduce((acc: number, tx: any) => {
        const raw = (tx.points ?? tx.change ?? 0)
        return acc + Math.max(0, raw)
      }, 0)
      setTotalEarned(balanceQ.data?.total_earned ?? earnedFromTx)

      setLoading(false)
    }
    loadData()
  }, [])

  const tier = useMemo(() => resolveTier(totalEarned), [totalEarned])
  const progressBase = USE_NET_FOR_GOALS ? points : totalEarned
  const progressData = useMemo(() => computeProgress(progressBase, GOALS), [progressBase])

  useEffect(() => {
    setAnimatedPct(0)
    const t = setTimeout(() => setAnimatedPct(progressData.pct), 200)
    return () => clearTimeout(t)
  }, [progressData.pct])

  // === Avisos de Cugini ===
  const [ann, setAnn] = useState<Announcement[]>([])
  const [annErr, setAnnErr] = useState<string | null>(null)
  const [annLoading, setAnnLoading] = useState<boolean>(true)

  function inWindow(a: Announcement, now: number) {
    const startOk = !a.starts_at || new Date(a.starts_at).getTime() <= now
    const endOk = !a.ends_at || new Date(a.ends_at).getTime() >= now
    return startOk && endOk
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      setAnnLoading(true)
      setAnnErr(null)
      const { data, error } = await supabase
        .from('announcements')
        .select('id,title,message,link_url,is_active,starts_at,ends_at,created_at')
        .eq('is_active', true)
        .order('starts_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5)

      if (!active) return
      if (error) {
        console.error('❌ Error cargando announcements:', error)
        setAnnErr('No fue posible cargar los avisos.')
        setAnn([])
      } else {
        const now = Date.now()
        const filtered = (data || []).filter(a => inWindow(a as Announcement, now)) as Announcement[]
        setAnn(filtered)
      }
      setAnnLoading(false)
    })()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="min-h-dvh bg-transparent">
        <div className="p-6">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-transparent relative">
      {/* Fondo global fijo (NO bloquea clics) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <PizzaBackground />
      </div>

      {/* Contenido por encima del fondo */}
      <div className="relative z-10 w-full space-y-0">
        {/* Tarjeta principal */}
        <div className="relative rounded-2xl p-5 shadow-xl bg-white/70 backdrop-blur ring-1 ring-black/5">
          {/* Chip de nivel */}
          <button
            onClick={() => setShowTierModal(true)}
            className={`absolute right-3 top-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ring-1 ring-black/10 ${tierBadgeColor(tier.name)} hover:opacity-90 transition`}
          >
            {tier.name}
          </button>

          <div className="pr-16">
            <h1 className="text-[17px] sm:text-lg font-bold text-cugini-dark break-all [hyphens:auto] leading-snug">
              Hola {email ?? ''} 👋
            </h1>
            <p className="text-cugini-dark/70 text-sm">Bienvenido al programa de puntos Cugini.</p>
          </div>

          {/* Card del horno */}
          <div className="mt-2 flex justify-center">
            <div className="w-full max-w-md">
              <PointsOvenCard
                email={email ?? ''}
                points={points}
                pct={animatedPct}
                goal={progressData.goal}
                remain={Math.max(0, progressData.remain)}
                net={USE_NET_FOR_GOALS}
              />
            </div>
          </div>
        </div>

        {/* —— BLOQUE de imagen + frase —— */}
        <div className="my-10 sm:my-14 lg:my-16">
          <div className="flex justify-center py-4 pointer-events-none select-none">
            <img
              src={IMAGE_SRC}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className={`mix-blend-multiply ${IMAGE_WIDTH_CLASS}`}
              style={{ opacity: IMAGE_OPACITY, transform: `translateY(${IMAGE_OFFSET_Y}px)` }}
            />
          </div>
          <div className="text-center" aria-live="polite">
            <span
              key={quoteIndex}
              className={`inline-block text-sm sm:text-base text-cugini-dark/70 transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
            >
              {QUOTES[quoteIndex]}
            </span>
          </div>
        </div>

        {/* Últimos movimientos */}
        <div className="rounded-xl shadow bg-white/50 backdrop-blur-sm ring-1 ring-black/5">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-lg font-semibold text-cugini-dark">Últimos movimientos</h2>
          </div>

          {txs.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="text-sm text-cugini-dark/50">Aún no tienes movimientos.</p>
            </div>
          ) : (
            <div
              role="region"
              aria-label="Listado de movimientos"
              tabIndex={0}
              className="cugi-scroll max-h-[50vh] sm:max-h-[420px] overflow-y-auto overscroll-contain scroll-smooth px-5 pb-5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <ul className="space-y-2">
                {txs.map((tx) => {
                  const t = tx.type ? tx.type.toUpperCase() : ''
                  const amount = tx.points ?? tx.change ?? 0
                  const isPositive = amount > 0
                  const isNegative = amount < 0
                  return (
                    <li
                      key={tx.id}
                      className="flex justify-between items-center rounded-lg px-3 py-2 ring-1 ring-black/5 bg-white/60 backdrop-blur-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-cugini-dark truncate">
                          {tx.reason ? tx.reason : t === 'EARN' ? 'Puntos ganados' : 'Movimiento'}
                        </p>
                        <p className="text-xs text-cugini-dark/50">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={
                          isPositive ? 'text-cugini-green font-bold'
                            : isNegative ? 'text-cugini-red font-bold'
                            : 'text-cugini-dark/70 font-medium'
                        }
                      >
                        {isPositive ? '+' : ''}{amount}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* === Avisos de Cugini === */}
        <div className="rounded-xl shadow bg-white/50 backdrop-blur-sm ring-1 ring-black/5 mt-6">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-cugini-dark">Avisos de Cugini</h2>
          </div>

          <div className="px-5 pb-5">
            {annLoading ? (
              <p className="text-sm text-cugini-dark/50">Cargando avisos…</p>
            ) : annErr ? (
              <p className="text-sm text-cugini-red">No fue posible cargar los avisos.</p>
            ) : ann.length === 0 ? (
              <p className="text-sm text-cugini-dark/50">No hay avisos por ahora 🙂</p>
            ) : (
              <ul className="space-y-3">
                {ann.map(a => (
                  <li key={a.id} className="rounded-lg px-3 py-2 ring-1 ring-black/5 bg-white/60 backdrop-blur-sm">
                    <p className="text-sm font-semibold text-cugini-dark">
                      {a.title || 'Aviso'}
                    </p>
                    <p className="text-sm text-cugini-dark/80 whitespace-pre-wrap">
                      {a.message}
                      {a.link_url ? (
                        <>
                          {' '}
                          <a
                            href={a.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-cugini-green hover:opacity-90"
                          >
                            Ver más
                          </a>
                        </>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-cugini-dark/50 mt-1">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal de niveles (restaurado) */}
      {showTierModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowTierModal(false)}
        >
          <div
            className="bg-white w-full max-w-md mx-4 rounded-xl shadow-xl border border-cugini-dark/10 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-cugini-dark">Niveles Cugini</h3>
              <button onClick={() => setShowTierModal(false)} className="text-cugini-dark/60 hover:text-cugini-dark">✕</button>
            </div>
            <p className="text-sm text-cugini-dark/70">
              Estos umbrales son referenciales mientras definimos el modelo final.
              Tu nivel actual se basa en tus puntos acumulados históricos.
            </p>
            <ul className="space-y-2">
              {TIERS.map((t) => (
                <li
                  key={t.name}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${t.name === resolveTier(totalEarned).name ? 'border-cugini-green bg-cugini-green/10' : 'border-cugini-dark/10'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tierBadgeColor(t.name)}`}>{t.name}</span>
                    <span className="text-sm text-cugini-dark/80">desde {t.min} pts</span>
                  </div>
                  {t.name === resolveTier(totalEarned).name && (
                    <span className="text-xs font-semibold text-cugini-green">Tu nivel</span>
                  )}
                </li>
              ))}
            </ul>
            <div className="text-right">
              <button onClick={() => setShowTierModal(false)} className="px-3 py-1 rounded-md bg-cugini-green text-white hover:bg-cugini-green/90">
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollbar sutil + body transparente */}
      <style jsx global>{`
        body { background: transparent !important; }
        .cugi-scroll { scrollbar-width: thin; scrollbar-color: #94a3b8 transparent; }
        .cugi-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .cugi-scroll::-webkit-scrollbar-thumb { background-color: #94a3b8; border-radius: 9999px; }
        .cugi-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  )
}
