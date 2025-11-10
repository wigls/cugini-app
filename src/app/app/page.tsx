'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import PointsOvenCard from '../../components/PointsOvenCard'
import PizzaBackground from '../../components/PizzaBackground'
import DeliveryMotion from '../../components/DeliveryMotion';

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

/** Barra de progreso con degradado cálido (Tomate → Mostaza) */
function ProgressBar({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)))
  const barWidth = safe === 0 ? 0 : Math.max(2, safe)
  return (
    <div
      className="w-full h-4 rounded-full bg-white/50 border border-black/10 overflow-hidden shadow-inner"
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${barWidth}%`,
          background: 'linear-gradient(90deg, #E63946 0%, #FFB703 100%)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.08)',
        }}
      />
    </div>
  )
}

/* ========= UI de refuerzo positivo ========= */
function CelebrationOverlay({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <div className="relative w-full h-full overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => {
          const delay = `${(i % 6) * 0.15}s`
          const left = `${(i * 7) % 100}%`
          const emoji = i % 3 === 0 ? '🍕' : i % 3 === 1 ? '🔥' : '🏆'
          return (
            <span
              key={i}
              className="absolute text-3xl animate-cugi-fall"
              style={{ left, top: '-10%', animationDelay: delay }}
            >
              {emoji}
            </span>
          )
        })}
      </div>
      <style jsx>{`
        @keyframes cugi-fall {
          0% { transform: translateY(-10%) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(120%) rotate(360deg); opacity: 0; }
        }
        .animate-cugi-fall {
          animation: cugi-fall 2.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  )
}

function Toast({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`fixed right-4 top-4 z-[70] transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="rounded-xl bg-white/90 backdrop-blur shadow-lg shadow-amber-900/10 ring-1 ring-black/5 px-4 py-3 text-sm text-cugini-dark">
        {children}
      </div>
    </div>
  )
}
/* ===== Sticker animado: camino + líneas nítidas de velocidad ===== */
function RepartidorSticker({
  src,
  widthClass,
  opacity = 1,
  offsetY = 0,
}: {
  src: string
  widthClass: string
  opacity?: number
  offsetY?: number
}) {
  return (
    <div
      className={`relative ${widthClass} select-none pointer-events-none`}
      style={{ opacity, transform: `translateY(${offsetY}px)` }}
      aria-hidden="true"
    >
      {/* CAMINO (abajo de todo) */}
      <div className="absolute left-0 right-0 -bottom-[4%] mx-auto w-[76%] h-[12px] rounded-full bg-[rgba(0,0,0,0.35)] blur-[3px] z-[1]" />

      {/* Sombras bajo cada rueda (sutil) */}
      <div className="absolute bottom-[7%] left-[18%] -translate-x-1/2 w-[30%] h-[18%] rounded-full bg-black/25 blur-[10px] opacity-60 z-[1]" />
      <div className="absolute bottom-[7%] left-[72%] -translate-x-1/2 w-[30%] h-[18%] rounded-full bg-black/25 blur-[10px] opacity-60 z-[1]" />

      {/* STREAKS (al medio, por encima del camino y sombras) */}
      <WheelStreaks
        leftPercent={18}
        bottomPercent={11}
        direction="left"
        tone="combo"      // blanco + rojo Cugini alternados
        delayOffset={0}
      />
      <WheelStreaks
        leftPercent={72}
        bottomPercent={11}
        direction="left"
        tone="combo"
        delayOffset={120}
      />

      {/* Scooter (encima de todo) */}
      <img
        src={src}
        alt=""
        className="relative z-[3] w-full h-auto drop-shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
        loading="lazy"
        decoding="async"
      />

      {/* Keyframes locales para líneas (nítidas, sin blur) */}
      <style jsx>{`
        @keyframes streakFly {
          0%   { transform: translateX(0) translateY(0) scaleX(0.9); opacity: 0; }
          12%  { opacity: 0.95; }
          60%  { transform: translateX(var(--streak-x)) translateY(var(--streak-y)) scaleX(1); opacity: 0.9; }
          100% { transform: translateX(calc(var(--streak-x) * 1.35)) translateY(calc(var(--streak-y) * 1.05)) scaleX(1); opacity: 0; }
        }
        @keyframes streakFlyFast {
          0%   { transform: translateX(0) translateY(0) scaleX(0.9); opacity: 0; }
          20%  { opacity: 0.9; }
          100% { transform: translateX(var(--streak-x)) translateY(var(--streak-y)) scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ===== Subcomponente: genera varias líneas desde una rueda (nítidas) ===== */
function WheelStreaks({
  leftPercent,
  bottomPercent,
  direction = 'left',
  tone = 'combo',        // 'combo' alterna blanco/rojo para máximo contraste
  delayOffset = 0,
}: {
  leftPercent: number
  bottomPercent: number
  direction?: 'left' | 'right'
  tone?: 'dark' | 'light' | 'brand' | 'combo'
  delayOffset?: number
}) {
  const flyX = direction === 'left' ? '-38%' : '38%'

  // Paletas
  const color = (i: number) => {
    if (tone === 'combo') return i % 2 === 0 ? 'bg-white' : 'bg-[rgb(214,69,46)]'
    if (tone === 'brand') return 'bg-[rgb(214,69,46)]'
    if (tone === 'light') return 'bg-white'
    return 'bg-black'
  }

  // 8 líneas visibles (grosor mayor y longitud mayor)
  const items = [
    { w: '42%', h: 3, y: '-2px', t: 'streakFly',     d: 0   },
    { w: '28%', h: 3, y: '0px',  t: 'streakFlyFast', d: 90  },
    { w: '50%', h: 4, y: '2px',  t: 'streakFly',     d: 180 },
    { w: '32%', h: 3, y: '-1px', t: 'streakFlyFast', d: 240 },
    { w: '46%', h: 3, y: '1px',  t: 'streakFly',     d: 320 },
    { w: '30%', h: 3, y: '-3px', t: 'streakFlyFast', d: 410 },
    { w: '54%', h: 4, y: '3px',  t: 'streakFly',     d: 520 },
    { w: '26%', h: 3, y: '0px',  t: 'streakFlyFast', d: 620 },
  ]

  return (
    <div
      className="absolute z-[2]" // encima del camino/sombras; debajo del scooter
      style={{
        left: `${leftPercent}%`,
        bottom: `${bottomPercent}%`,
        transform: 'translate(-50%, 0)',
        willChange: 'transform, opacity',
      }}
    >
      {items.map((it, i) => (
        <span
          key={i}
          className={`absolute left-0 top-1/2 -translate-y-1/2 ${color(i)} rounded-full`}
          style={{
            width: it.w,
            height: `${it.h}px`,
            ['--streak-x' as any]: flyX,
            ['--streak-y' as any]: it.y,
            animation: `${it.t} ${0.9 + (i % 3) * 0.15}s cubic-bezier(.22,.61,.36,1) infinite`,
            animationDelay: `${(delayOffset + it.d) / 1000}s`,
            opacity: 0,
            // nitidez: leve sombra para que recorte sobre el fondo
            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.35))',
          }}
        />
      ))}
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

  /* ====== Refuerzo positivo (celebración + toast) ====== */
  const [showCelebrate, setShowCelebrate] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const prevFirstTxId = useRef<number | null>(null)
  const prevPctRef = useRef<number>(0)

  // Celebración por NUEVO movimiento positivo
  useEffect(() => {
    if (!txs || txs.length === 0) return
    const first = txs[0]
    if (prevFirstTxId.current == null) {
      prevFirstTxId.current = first.id
      return
    }
    if (first.id !== prevFirstTxId.current) {
      prevFirstTxId.current = first.id
      const amount = (first.points ?? first.change ?? 0) || 0
      if (amount > 0) {
        setToastMsg('🔥 ¡Código canjeado! ¡Más puntos para tu próxima pizza!')
        setShowCelebrate(true)
        const t1 = setTimeout(() => setShowCelebrate(false), 2600)
        const t2 = setTimeout(() => setToastMsg(null), 2600)
        return () => { clearTimeout(t1); clearTimeout(t2) }
      }
    }
  }, [txs])

  // Celebración por ALCANZAR meta (remain <= 0)
  useEffect(() => {
    const prev = prevPctRef.current
    const now = progressData.pct
    prevPctRef.current = now
    if (progressData.remain <= 0 && now >= 100 && prev < 100) {
      setToastMsg('🏆 ¡Meta alcanzada! Tienes una recompensa lista para disfrutar.')
      setShowCelebrate(true)
      const t1 = setTimeout(() => setShowCelebrate(false), 2600)
      const t2 = setTimeout(() => setToastMsg(null), 2600)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [progressData.pct, progressData.remain])

  if (loading) {
    return (
      <div className="min-h-dvh bg-transparent">
        <div className="p-6">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-transparent relative">
      {/* Overlays de refuerzo positivo */}
      <CelebrationOverlay show={showCelebrate} />
      <Toast show={!!toastMsg}>{toastMsg}</Toast>

      {/* Fondo global fijo (NO bloquea clics) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <PizzaBackground />
      </div>

      {/* Contenido por encima del fondo */}
      <div className="relative z-10 w-full space-y-0">
        {/* Tarjeta principal (squircle + sombra cálida) */}
        <div className="relative rounded-3xl p-5 shadow-xl shadow-amber-900/10 bg-white/70 backdrop-blur ring-1 ring-black/5">
          {/* Chip de nivel estilo medalla */}
          <button
            onClick={() => setShowTierModal(true)}
            className={`absolute right-3 top-3 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wide font-extrabold shadow ring-1 ring-black/10 ${tierBadgeColor(tier.name)} hover:opacity-95 transition`}
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

          {/* Progreso textual + barra (refuerzo visual adicional) */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cugini-dark">Progreso hacia {progressData.goal} pts</span>
              <span className="text-sm font-semibold text-cugini-dark">{animatedPct}%</span>
            </div>
            <ProgressBar pct={animatedPct} />
            <p className="mt-1 text-xs text-cugini-dark/70">
              Te faltan <span className="font-semibold text-cugini-dark">{Math.max(0, progressData.remain)}</span> puntos para tu siguiente recompensa.
            </p>
          </div>
        </div>

       
{/* —— BLOQUE de imagen + frase —— */}
<div className="my-10 sm:my-14 lg:my-16">
  {/* Moto con polvo: el motion no tapa el texto ni los toques */}
  <div className="flex justify-center py-2 select-none">
    <DeliveryMotion
  speed={1.25}     // más rápido = +dinamismo
  sway="soft"
  direction="forward"
  groundY={-50}      // <— SUBE el camino + estelas (prueba 4–8)
  yOffset={2}      // opcional: sube un pelín la moto
>
  <img
    src="/brand/repartidor.png"
    alt=""
    aria-hidden="true"
    loading="lazy"
    className={IMAGE_WIDTH_CLASS}
    style={{ opacity: 1, transform: `translateY(${IMAGE_OFFSET_Y}px)` }}
  />
</DeliveryMotion>

  </div>

  {/* Frase: fuerza stacking para que siempre se vea */}
  <div className="relative z-20 text-center mt-2" aria-live="polite">
    <span
      key={quoteIndex}
      className={`inline-block text-base sm:text-lg text-cugini-dark transition-opacity duration-500 ${
        fadeIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {QUOTES[quoteIndex]}
    </span>
  </div>
</div>



        {/* Últimos movimientos (visual cálido y diferenciado) */}
        <div className="rounded-3xl shadow-lg shadow-amber-900/10 bg-white/55 backdrop-blur-sm ring-1 ring-black/5">
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

                  const chip =
                    isPositive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 text-green-700 px-2 py-0.5 text-xs font-semibold">
                        <span aria-hidden>⬆️</span> +{amount}
                      </span>
                    ) : isNegative ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 text-red-700 px-2 py-0.5 text-xs font-semibold">
                        <span aria-hidden>⬇️</span> {amount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-600/10 text-slate-700 px-2 py-0.5 text-xs font-semibold">
                        {amount}
                      </span>
                    )

                  return (
                    <li
                      key={tx.id}
                      className={`
                        flex items-center justify-between rounded-2xl px-3 py-2 ring-1 ring-black/5
                        ${isPositive ? 'bg-green-50/70' : isNegative ? 'bg-red-50/70' : 'bg-white/60'} backdrop-blur-sm
                      `}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-cugini-dark truncate">
                          {tx.reason ? tx.reason : t === 'EARN' ? 'Puntos ganados' : 'Movimiento'}
                        </p>
                        <p className="text-xs text-cugini-dark/50">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                      {chip}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* === Avisos de Cugini === */}
        <div className="rounded-3xl shadow-lg shadow-amber-900/10 bg-white/55 backdrop-blur-sm ring-1 ring-black/5 mt-6">
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
                  <li
                    key={a.id}
                    className="rounded-2xl px-3 py-2 ring-1 ring-black/5 bg-white/70 backdrop-blur-sm"
                  >
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
      {/* Modal de niveles (rediseño visual, sin cambiar lógica) */}
{showTierModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    onClick={() => setShowTierModal(false)}
    role="dialog"
    aria-modal="true"
    aria-labelledby="niveles-title"
  >
    <div
      className="bg-white w-full max-w-md mx-4 rounded-2xl shadow-xl border border-cugini-dark/10 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header con degradado cálido */}
      <div className="px-5 py-4 bg-gradient-to-r from-[#FFF3E0] via-white to-[#FFE8CC] border-b border-black/5">
        <div className="flex items-start justify-between">
          <div>
            <h3 id="niveles-title" className="text-lg font-extrabold text-cugini-dark tracking-tight">
              Niveles Cugini
            </h3>
            <p className="mt-0.5 text-xs text-cugini-dark/70">
              Progresas según tus puntos acumulados históricos.
            </p>
          </div>
          <button
            onClick={() => setShowTierModal(false)}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-cugini-dark/70 hover:text-cugini-dark hover:bg-black/5 transition"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Lista de niveles mejorada visualmente */}
      <div className="px-5 py-4">
        <ul className="space-y-2.5">
          {TIERS.map((t) => {
            const isCurrent = t.name === resolveTier(totalEarned).name

            // Badge por nivel (degradados suaves y legibles)
            const badgeClass =
              t.name === 'Bronce'
                ? 'bg-gradient-to-r from-[#8B4513] to-[#CD7F32] text-white shadow-[0_0_8px_#CD7F32A0]'
                : t.name === 'Plata'
                ? 'bg-gradient-to-r from-[#B0C4DE] to-[#E0E0E0] text-cugini-dark shadow-[0_0_8px_#E0E0E0A0]'
                : t.name === 'Oro'
                ? 'bg-gradient-to-r from-[#FFD700] to-[#FFB703] text-cugini-dark shadow-[0_0_10px_#FFD700A0]'
                : t.name === 'Diamante'
                ? 'bg-gradient-to-r from-[#74EBD5] to-[#ACB6E5] text-cugini-dark shadow-[0_0_12px_#74EBD5A0]'
                : 'bg-amber-600 text-white'

            return (
              <li
                key={t.name}
                className={
                  (isCurrent
                    ? 'bg-white shadow-md ring-1 ring-amber-200 '
                    : 'bg-white/70 ring-1 ring-black/5 ') +
                  'rounded-2xl transition-shadow'
                }
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={'shrink-0 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider font-extrabold ' + badgeClass}>
                      {t.name}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-cugini-dark truncate">desde {t.min} pts</p>
                      {isCurrent && (
                        <p className="text-[11px] text-cugini-dark/60">
                          Tu nivel actual
                        </p>
                      )}
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cugini-dark">
                      <span aria-hidden>🏅</span> Activo
                    </span>
                  ) : (
                    <span className="text-[11px] text-cugini-dark/50">Objetivo</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {/* Nota / ayuda */}
        <div className="mt-3 rounded-xl bg-white/70 ring-1 ring-black/5 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-cugini-dark/70">
            Estos umbrales son referenciales mientras definimos el modelo final. El nivel puede cambiar cuando acumules más puntos 🎯.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowTierModal(false)}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#E63946] to-[#FFB703] text-white text-sm font-semibold shadow-md shadow-amber-700/20 hover:opacity-95 transition"
          >
            Listo
          </button>
        </div>
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
