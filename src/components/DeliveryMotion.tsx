'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  speed?: number;                             // 1 = base
  sway?: 'none' | 'soft' | 'medium';
  direction?: 'forward' | 'reverse';          // visual de avance
  groundY?: number;                           // <— sube/baja camino + estelas
  yOffset?: number;                           // <— sube/baja SOLO la moto
};

export default function DeliveryMotion({
  children,
  speed = 1,
  sway = 'soft',
  direction = 'forward',
  groundY = 10,
  yOffset = 0,
}: Props) {
  const dir = direction === 'reverse' ? -1 : 1;

  return (
    <div className="relative w-full flex justify-center select-none">
      {/* Moto */}
      <div
        className={[
          'relative z-10 will-change-transform',
          sway === 'none' ? '' : 'animate-cugi-sway',
          sway === 'medium' ? 'motion-medium' : '',
        ].join(' ')}
        style={{ transform: `translateY(${-yOffset}px)` }}
      >
        {children}
      </div>

      {/* Suelo + estelas (misma capa y se mueven juntas con groundY) */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-[360px] max-w-[92vw] z-0"
        style={{ top: `calc(100% + ${groundY}px)` }}
      >
        {/* Camino sólido (sin blur) */}
        <div
          className="mx-auto h-[10px] w-[62%] rounded-full bg-[rgba(0,0,0,0.22)]"
          style={{
            boxShadow: '0 2px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        />

        {/* Estelas por encima del camino */}
        <div
          className="relative mt-1 h-5 z-10"
          style={
            {
              ['--cugi-speed' as any]: String(speed),
              ['--cugi-dir' as any]: String(dir),
            } as React.CSSProperties
          }
        >
          {/* izquierda */}
          <span className="cugi-streak left-[18%]" />
          {/* centro */}
          <span className="cugi-streak left-1/2 -translate-x-1/2 w-[28%]" />
          {/* derecha */}
          <span className="cugi-streak right-[18%]" />
        </div>
      </div>

      {/* estilos locales */}
      <style jsx>{`
        /* Balanceo vertical */
        @keyframes cugi-sway {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-cugi-sway { animation: cugi-sway 1.7s ease-in-out infinite; }
        .motion-medium.animate-cugi-sway { animation-duration: 1.2s; }

        /* Estelas (sin blur, con opacidad suave) */
        .cugi-streak {
          position: absolute;
          top: 0.45rem;
          height: 4px;
          width: 22%;
          border-radius: 9999px;
          background: linear-gradient(
            to right,
            rgba(0,0,0,0.00) 0%,
            rgba(0,0,0,0.55) 40%,
            rgba(0,0,0,0.00) 100%
          );
          opacity: 0.9;
          transform: translate3d(0,0,0);
          will-change: transform, opacity;
          animation: cugi-dash calc(0.9s / var(--cugi-speed)) linear infinite;
        }
        .cugi-streak:nth-child(1) { animation-delay: 0s; }
        .cugi-streak:nth-child(2) { animation-delay: 0.15s; }
        .cugi-streak:nth-child(3) { animation-delay: 0.30s; }

        /* Movimiento en X con dirección */
        @keyframes cugi-dash {
          0% {
            transform: translate3d(calc(18px * var(--cugi-dir)), 0, 0) scaleX(0.7);
            opacity: 0;
          }
          10% { opacity: 1; }
          100% {
            transform: translate3d(calc(-52px * var(--cugi-dir)), 0, 0) scaleX(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
