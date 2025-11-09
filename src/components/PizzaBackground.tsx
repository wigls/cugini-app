// src/components/PizzaBackground.tsx
// Fondo con franjas dinámicas (export por DEFAULT, sin hooks)

export default function PizzaBackground() {
  return (
    <svg
      className="w-full h-full block"
      viewBox="0 0 1440 1024"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        {/* Gradientes de franjas */}
        <linearGradient id="band1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#FFF7EA" />
          <stop offset="100%" stopColor="#FFEFD3" />
        </linearGradient>
        <linearGradient id="band2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#FFD889" />
          <stop offset="100%" stopColor="#FFC962" />
        </linearGradient>
        <linearGradient id="band3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#F29A6A" />
          <stop offset="100%" stopColor="#E3724C" />
        </linearGradient>
        <linearGradient id="band4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#D45749" />
          <stop offset="100%" stopColor="#C2433E" />
        </linearGradient>
        <linearGradient id="band5" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#A52D36" />
          <stop offset="100%" stopColor="#8B1E2A" />
        </linearGradient>

        {/* Textura de puntitos */}
        <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="2" fill="#000" opacity="0.06" />
        </pattern>

        {/* Blur para discos */}
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="40" />
        </filter>

        <style>{`
          @keyframes stripeShift {
            0%   { transform: translateX(-60px); }
            100% { transform: translateX(60px); }
          }
          @keyframes floatSlow {
            0%   { transform: translateY(0px) }
            50%  { transform: translateY(-8px) }
            100% { transform: translateY(0px) }
          }
          @keyframes dotsDrift {
            0%   { transform: translateX(0) }
            100% { transform: translateX(-48px) }
          }
          @media (prefers-reduced-motion: reduce) {
            .anim, .parallax, .dotsMove { animation: none !important; }
          }
        `}</style>
      </defs>

      {/* Franjas diagonales */}
      <g transform="rotate(-16 720 512)">
        <g className="anim" style={{ animation: 'stripeShift 28s ease-in-out infinite alternate' }}>
          <rect x="-120" y="0"   width="1680" height="220" fill="url(#band1)" />
        </g>
        <g className="anim" style={{ animation: 'stripeShift 32s ease-in-out 0.4s infinite alternate' }}>
          <rect x="-120" y="220" width="1680" height="220" fill="url(#band2)" />
        </g>
        <g className="anim" style={{ animation: 'stripeShift 30s ease-in-out 0.8s infinite alternate' }}>
          <rect x="-120" y="440" width="1680" height="220" fill="url(#band3)" />
        </g>
        <g className="anim" style={{ animation: 'stripeShift 34s ease-in-out 1.2s infinite alternate' }}>
          <rect x="-120" y="660" width="1680" height="220" fill="url(#band4)" />
        </g>
        <g className="anim" style={{ animation: 'stripeShift 36s ease-in-out 1.6s infinite alternate' }}>
          <rect x="-120" y="880" width="1680" height="220" fill="url(#band5)" />
        </g>
      </g>

      {/* Discos “masa” difusos */}
      <g opacity="0.16" filter="url(#softBlur)">
        <circle className="parallax" cx="220"  cy="160" r="140" fill="#FFC05A" style={{ animation: 'floatSlow 12s ease-in-out infinite' }} />
        <circle className="parallax" cx="1180" cy="220" r="120" fill="#D64F44" style={{ animation: 'floatSlow 15s ease-in-out 0.8s infinite' }} />
        <circle className="parallax" cx="980"  cy="820" r="160" fill="#E67E4F" style={{ animation: 'floatSlow 18s ease-in-out 0.4s infinite' }} />
        <circle className="parallax" cx="320"  cy="760" r="180" fill="#FFDA93" style={{ animation: 'floatSlow 16s ease-in-out 1.2s infinite' }} />
      </g>

      {/* Textura de puntitos en movimiento leve */}
      <g opacity="0.25" className="dotsMove" style={{ animation: 'dotsDrift 60s linear infinite' }}>
        <rect x="-100" y="-100" width="1640" height="1224" fill="url(#dots)" />
      </g>

      {/* Chispitas del horno */}
      <g opacity="0.22">
        {[...Array(20)].map((_, i) => {
          const x = (i * 67) % 1440
          const y = 100 + ((i * 139) % 824)
          const d = 6 + (i % 5)
          const delay = `${(i % 7) * 0.35}s`
          const dur = `${10 + (i % 6)}s`
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={d / 2}
              fill="#FFC72C"
              className="parallax"
              style={{ animation: `floatSlow ${dur} ease-in-out ${delay} infinite` }}
            />
          )
        })}
      </g>
    </svg>
  )
}
