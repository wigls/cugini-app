'use client';

import * as React from 'react';
import clsx from 'clsx';

type Props = {
  children?: React.ReactNode;
  /** Por si más adelante quieres alternar fondos. Default: 'warm' */
  variant?: 'warm' | 'cool';
  className?: string;
};

/**
 * Fondo principal de la app.
 * - 'warm': degradados cálidos que evocan horno/pizza (recomendación del análisis).
 * - Capas radiales + blurs suaves para dar profundidad sin distraer el contenido.
 */
export default function PizzaBackground({ children, variant = 'warm', className }: Props) {
  if (variant === 'cool') {
    // Opción de reserva (no usada por ahora)
    return (
      <div className={clsx('relative min-h-screen bg-gradient-to-b from-slate-50 via-sky-50 to-indigo-100', className)}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />
        </div>
        {children}
      </div>
    );
  }

  // Variante cálida (por defecto)
  return (
    <div
      className={clsx(
        'relative min-h-screen',
        // Degradado principal cálido
        'bg-gradient-to-b from-[#FFF1E6] via-[#FFD166] to-[#E63946]',
        className
      )}
    >
      {/* Capa radial superior: luz de horno */}
      <div className="pointer-events-none absolute inset-0">
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full
                     bg-[radial-gradient(closest-side,rgba(255,243,201,0.65),rgba(255,243,201,0.0))]
                     blur-2xl"
        />
        {/* Glows laterales suaves */}
        <div
          aria-hidden
          className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-[#FFB703]/30 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-[#E63946]/25 blur-3xl"
        />
        {/* Sutil textura con puntos de “chispa” muy discretos */}
        <div
          aria-hidden
          className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:14px_14px] opacity-20"
        />
      </div>

      {/* Contenido */}
      <div className="relative">{children}</div>
    </div>
  );
}
