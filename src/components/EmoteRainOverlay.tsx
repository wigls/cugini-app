function EmoteRainOverlay() {
  const EMOTES = ['🍕', '🧄', '🧅', '🫒', '🌿', '🧀', '🍅']
  const items = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    em: EMOTES[i % EMOTES.length],
    left: `${(i * 29) % 100}%`,
    size: 22 + (i % 6) * 3,        // 22–37 px
    dur: 18 + (i % 8) * 3,         // 18–42 s
    delay: (i % 10) * 0.6,         // desfase
    opacity: 0.5 + ((i % 4) * 0.08), // 0.5–0.74
    rot: (i % 2 === 0) ? -10 : 10, // rotación leve
  }))

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2147483000,
      }}
    >
      <style>{`
        @keyframes cuginiFloatDown {
          0%   { transform: translateY(-15%) rotate(0deg); }
          50%  { transform: translateY(50%) rotate(15deg); }
          100% { transform: translateY(120%) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cugini-emote { animation: none !important; }
        }
      `}</style>

      {items.map((it) => (
        <div
          key={it.id}
          className="cugini-emote select-none"
          style={{
            position: 'absolute',
            top: '-15%',
            left: it.left,
            fontSize: it.size,
            lineHeight: 1,
            opacity: it.opacity,
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
            transform: `rotate(${it.rot}deg)`,
            willChange: 'transform',
            animation: `cuginiFloatDown ${it.dur}s linear ${it.delay}s infinite`,
            userSelect: 'none',
          }}
        >
          {it.em}
        </div>
      ))}
    </div>
  )
}
