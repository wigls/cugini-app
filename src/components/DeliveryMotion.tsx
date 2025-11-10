// src/components/DeliveryMotion.tsx
'use client';

type Props = {
  children: React.ReactNode;
  /** 1 = normal, 0.8 = más lento, 1.2 = más rápido */
  speed?: number;
  /** amplitud del bamboleo: 'sm' | 'md' */
  sway?: 'sm' | 'md';
};

/**
 * Envuelve al sticker y le da vida:
 * - balanceo sutil (lean) del cuerpo
 * - micro-salto y compresión de suspensión (bounce)
 * Todo con CSS puro para evitar hydration mismatches.
 */
export default function DeliveryMotion({ children, speed = 1, sway = 'sm' }: Props) {
  const scale = Math.max(0.6, Math.min(1.8, speed));
  const swayClass = sway === 'md' ? 'dm-lean-md' : 'dm-lean-sm';

  return (
    <div className={`dm-root ${swayClass}`} style={{ ['--dm-speed' as any]: `${scale}s` }}>
      {children}
      <style jsx>{`
        .dm-root {
          display: inline-block;
          /* “ciclo”: sutil balanceo + micro-bounce */
          animation: dmCycle var(--dm-speed, 1s) ease-in-out infinite;
          /* evita pixel-shimmer */
          will-change: transform;
        }
        /* balanceo adicional */
        .dm-lean-sm { animation-name: dmCycle, dmLeanSm; animation-duration: var(--dm-speed, 1s), calc(var(--dm-speed, 1s) * 1.8); animation-timing-function: ease-in-out, ease-in-out; animation-iteration-count: infinite, infinite; }
        .dm-lean-md { animation-name: dmCycle, dmLeanMd; animation-duration: var(--dm-speed, 1s), calc(var(--dm-speed, 1s) * 1.8); animation-timing-function: ease-in-out, ease-in-out; animation-iteration-count: infinite, infinite; }

        @keyframes dmCycle {
          0%   { transform: translateY(0) }
          40%  { transform: translateY(-1.5px) }
          60%  { transform: translateY(0) }
          100% { transform: translateY(0) }
        }
        @keyframes dmLeanSm {
          0% { rotate: 0deg }
          50%{ rotate: -0.6deg }
          100%{ rotate: 0deg }
        }
        @keyframes dmLeanMd {
          0% { rotate: 0deg }
          50%{ rotate: -1.1deg }
          100%{ rotate: 0deg }
        }
      `}</style>
    </div>
  );
}
