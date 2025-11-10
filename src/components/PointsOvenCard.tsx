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
  {/* Resplandor más intenso */}
  <ellipse cx={cx} cy={cy + 4} rx="95" ry="100" fill="rgba(255,80,0,0.35)" />
  <ellipse cx={cx} cy={cy + 8} rx="88" ry="92" fill="rgba(255,130,20,0.28)" />

  {/* Núcleo principal de flama */}
  <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'flameBreath 2.2s ease-in-out infinite' }}>
    {/* Capas rojas profundas */}
    <path
      d={`M${cx} ${cy + 10} C${cx - 20} ${cy - 20},${cx + 24} ${cy - 30},${cx + 6} ${cy - 64}
          C${cx + 36} ${cy - 44},${cx + 48} ${cy - 10},${cx + 40} ${cy + 8} Z`}
      fill="#D42E1F"
      opacity=".95"
    />
    <path
      d={`M${cx - 26} ${cy + 8} C${cx - 38} ${cy - 20},${cx - 10} ${cy - 32},${cx - 12} ${cy - 52}
          C${cx + 8} ${cy - 38},${cx + 14} ${cy - 12},${cx + 8} ${cy + 8} Z`}
      fill="#FF5317"
      opacity=".92"
    />
    <path
      d={`M${cx + 24} ${cy + 8} C${cx + 20} ${cy - 10},${cx + 42} ${cy - 16},${cx + 36} ${cy - 40}
          C${cx + 48} ${cy - 26},${cx + 58} ${cy - 4},${cx + 52} ${cy + 10} Z`}
      fill="#FF8C1A"
      opacity=".95"
    />
    {/* Flamas más pequeñas al centro */}
    <path
      d={`M${cx} ${cy + 6} C${cx - 6} ${cy - 26},${cx + 6} ${cy - 28},${cx} ${cy - 56} Z`}
      fill="#FFD166"
      opacity=".9"
    />
  </g>

  {/* Lenguas laterales adicionales */}
  <g style={{ animation: 'tongues 2.4s ease-in-out infinite' }}>
    {Array.from({ length: 6 }).map((_, i) => {
      const offset = (i - 3) * 16
      const color = i % 2 === 0 ? 'rgba(255,80,0,0.5)' : 'rgba(255,199,44,0.45)'
      return (
        <path
          key={`tongue-${i}`}
          d={`M${cx + offset} ${cy + 10}
              C${cx + offset - 4} ${cy - 4},${cx + offset + 6} ${cy - 14},${cx + offset + 2} ${cy - 26}
              C${cx + offset + 10} ${cy - 18},${cx + offset + 14} ${cy - 6},${cx + offset + 12} ${cy + 8} Z`}
          fill={color}
        />
      )
    })}
  </g>

  {/* Chispas flotantes más vivas */}
  {Array.from({ length: 10 }).map((_, i) => {
    const x = cx - 45 + i * 10
    const delay = `${0.12 * i}s`
    const hue = i % 2 === 0 ? '#FFD166' : '#FF9B42'
    return (
      <circle
        key={`spark-${i}`}
        cx={x}
        cy={cy + 8}
        r="3.5"
        fill={hue}
        style={{ animation: `sparkFloat 1.8s ${delay} linear infinite` }}
      />
    )
  })}
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
