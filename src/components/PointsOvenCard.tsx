'use client'

type Props = {
  email?: string
  points: number
  pct: number          // porcentaje ya calculado (animatedPct)
  goal: number
  remain: number
  net: boolean         // USE_NET_FOR_GOALS
}

/* ===== Horno alineado (ladrillos con mortero, fuego interior+exterior y % centrado) ===== */
function OvenGauge({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)))

  // Geometría
  const cx = 180, cy = 160
  const R_OUT = 130
  const R_IN  = 102
  const ANG_START = 180
  const ANG_END   = 0

  // Fase pequeña (dejamos 0 porque ya alineaste con toRad)
  const BRICK_PHASE_DEG = 0
  const PHASE = (BRICK_PHASE_DEG / (ANG_START - ANG_END)) *100

  // Útiles
  const toRad = (deg: number) => (deg - 0.00000009) * Math.PI / 180   // <- tu corrección
  const polar = (r: number, ang: number) => ({ x: cx + r * Math.cos(toRad(ang)), y: cy + r * Math.sin(toRad(ang)) })

  // Paths
  const arcPath = (r: number) =>
    `M${polar(r, ANG_START).x},${polar(r, ANG_START).y} A${r},${r} 0 0 1 ${polar(r, ANG_END).x},${polar(r, ANG_END).y}`
  const archOuter = arcPath(R_OUT)
  const archInner = arcPath(R_IN)

  // Patrón de ladrillos homogéneo
  const BRICKS = 17
  const BRICK_ARC = 100 / BRICKS                    // proporción de cada ladrillo+gap
  const GAP_ARC   = Math.max(1.6, BRICK_ARC * 0.20) // mortero
  const TILE_ARC  = BRICK_ARC - GAP_ARC             // largo visible del ladrillo

  // NUEVO: radio del anillo de progreso (por dentro de los ladrillos, sin cruzarlos)
  // Los ladrillos usan stroke 36, así que su borde interior queda en R_OUT - 18.
  // Ponemos el progreso un poco más adentro para que no toque el ladrillo.
  const R_PROGRESS = R_OUT - 22
  const progressArc = arcPath(R_PROGRESS)

  return (
    <div className="flex w-full justify-center">
      <svg viewBox="0 0 360 230" className="w-full max-w-xl">
        <defs>
          <linearGradient id="brickGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#B63B33"/>
            <stop offset="100%" stopColor="#8E2A24"/>
          </linearGradient>
          <linearGradient id="innerMouth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#6E1E1A"/>
            <stop offset="100%" stopColor="#421311"/>
          </linearGradient>
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#BEBEBE"/>
            <stop offset="100%" stopColor="#9A9A9A"/>
          </linearGradient>
          <radialGradient id="warmGlow" cx="50%" cy="72%" r="70%">
            <stop offset="0%"  stopColor="rgba(255,199,44,0.60)"/>
            <stop offset="100%" stopColor="rgba(255,199,44,0)"/>
          </radialGradient>

          {/* Glow suave para el anillo de progreso */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <style>{`
            @keyframes sparkFloat { 0%{transform:translateY(0) scale(1);opacity:.85} 100%{transform:translateY(-20px) scale(.9);opacity:0} }
            @keyframes flameBreath { 0%{transform:translateY(0) scale(1)} 50%{transform:translateY(-2px) scale(1.03)} 100%{transform:translateY(0) scale(1)} }
            @keyframes tongues { 0%{transform:translateY(0)} 50%{transform:translateY(-6px)} 100%{transform:translateY(0)} }
            @keyframes flameTongue { 0%   { transform: translateY(0) scaleY(1);   opacity: .95; } 50%  { transform: translateY(-4px) scaleY(1.06); opacity: 1; }
    100% { transform: translateY(0) scaleY(1);   opacity: .95; }
  }
          `}</style>

          {/* Máscara para que la fogata llene toda la base de la boca */}
          <mask id="mouthMask">
            <path d={archInner} fill="none" stroke="#fff" strokeWidth="30"/>
            <path d={`M${polar(R_IN-1, ANG_START).x},${polar(R_IN-1, ANG_START).y} A${R_IN-1},${R_IN-1} 0 0 1 ${polar(R_IN-1, ANG_END).x},${polar(R_IN-1, ANG_END).y} L${cx+R_IN-1},${cy} L${cx-(R_IN-1)},${cy} Z`} fill="#fff"/>
          </mask>
        </defs>

        {/* Resplandor cálido */}
        <ellipse cx={cx} cy={cy-8} rx="135" ry="40" fill="url(#warmGlow)" />

        {/* —— LADRILLOS: un solo path con patrón ——— */}
        <path
          d={archOuter}
          fill="none"
          stroke="url(#brickGrad)"
          strokeWidth="36"
          strokeLinecap="butt"
          pathLength={100}
          strokeDasharray={`${TILE_ARC} ${GAP_ARC}`}
          strokeDashoffset={PHASE}
        />
        {/* Mortero: separaciones */}
        <path
          d={archOuter}
          fill="none"
          stroke="rgba(255,255,255,.72)"
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${GAP_ARC} ${TILE_ARC}`}
          strokeDashoffset={PHASE + TILE_ARC}
        />

        {/* ======== PROGRESO DELGADO (anillo interior, sin cruzar ladrillos) ======== */}
        <path
          d={progressArc}
          fill="none"
          stroke="#FFC72C"
          strokeWidth="6"            /* delgado */
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${safe} ${100 - safe}`}
          strokeDashoffset={10}       /* no hace falta fase aquí */
          filter="url(#softGlow)"
        />

        {/* Boca interior */}
        <path d={archInner} fill="none" stroke="url(#innerMouth)" strokeWidth="30"/>

        {/* Fogata que llena la base */}
        <g mask="url(#mouthMask)">
          <ellipse cx={cx} cy={cy+6} rx="90" ry="95" fill="rgba(255,199,44,0.28)" />
          <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'flameBreath 1.9s ease-in-out infinite' }}>
            <path d={`M${cx} ${cy+8} C${cx-18} ${cy-18},${cx+22} ${cy-28},${cx+8} ${cy-56} C${cx+32} ${cy-38},${cx+42} ${cy-12},${cx+38} ${cy+8} Z`} fill="#FF8C1A" opacity=".95"/>
            <path d={`M${cx-28} ${cy+10} C${cx-38} ${cy-12},${cx-12} ${cy-22},${cx-16} ${cy-42} C${cx} ${cy-30},${cx+10} ${cy-10},${cx+8} ${cy+10} Z`} fill="#FFA733" opacity=".9"/>
            <path d={`M${cx+26} ${cy+10} C${cx+22} ${cy-10},${cx+40} ${cy-18},${cx+36} ${cy-36} C${cx+46} ${cy-24},${cx+54} ${cy-8},${cx+50} ${cy+10} Z`} fill="#FFD166" opacity=".95"/>
          </g>
          {Array.from({ length: 8 }).map((_, i) => {
            const x = cx - 40 + i * 12
            const d = `${0.18 * i}s`
            return <circle key={`ins-${i}`} cx={x} cy={cy+6} r="4" fill="#FFC72C" style={{ animation: `sparkFloat 1.6s ${d} linear infinite` }} />
          })}
        </g>

        {/* Lenguas de fuego exteriores */}
        <g style={{ animation: 'tongues 2.2s ease-in-out infinite' }}>
          <path d={`M${cx-90} ${cy+6} C${cx-102} ${cy-6},${cx-82} ${cy-12},${cx-86} ${cy-28} C${cx-76} ${cy-18},${cx-70} ${cy-6},${cx-72} ${cy+10} Z`} fill="rgba(255,140,26,.65)"/>
          <path d={`M${cx+94} ${cy+6} C${cx+84} ${cy-10},${cx+104} ${cy-10},${cx+98} ${cy-28} C${cx+110} ${cy-18},${cx+116} ${cy-4},${cx+112} ${cy+12} Z`} fill="rgba(255,199,44,.55)"/>
        </g>

        {/* % centrado (blanco con sombra) */}
        <text x={cx} y={cy-28} textAnchor="middle" fontSize="30" fontWeight={900} fill="rgba(0,0,0,.35)">{safe}%</text>
        <text x={cx} y={cy-30} textAnchor="middle" fontSize="30" fontWeight={900} fill="#FFFFFF">{safe}%</text>

        {/* Piedra */}
        <rect x={cx-80} y={cy+16} width="160" height="24" rx="12" fill="url(#stoneGrad)"/>
      </svg>
    </div>
  )
}

/* ===== Tarjeta contenedora (fondo crema con degradado) ===== */
export default function PointsOvenCard({ email, points, pct, goal, remain, net }: Props) {
  return (
    <div
      className="mt-4 rounded-[28px] p-6 shadow-[0_18px_36px_-14px_rgba(0,0,0,0.28)] ring-1 ring-black/10"
      style={{ background: 'linear-gradient(180deg,#FFFFFF 0%, #F7F1E6 100%)' }}
    >
      <div className="mb-1 text-sm text-cugini-dark/80">{email}</div>

      <h2 className="text-3xl font-extrabold text-cugini-green">Tus puntos Cugini</h2>

      <div className="mt-1 text-6xl font-black" style={{ color: '#D9453C' }}>
        {points}
      </div>

      <div className="mt-1">
        <OvenGauge pct={pct} />
      </div>

      <div className="mt-3 text-center">
        <p className="font-semibold text-cugini-dark">
          Próxima recompensa a {goal} pts {net ? '(progreso según tu saldo actual)' : '(progreso histórico)'}
        </p>
        <p className="text-sm text-cugini-dark/60">
          Te faltan <b>{remain}</b> puntos para tu siguiente recompensa
        </p>
      </div>
    </div>
  )
}
