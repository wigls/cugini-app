'use client'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

export default function SteamLottie({
  size = 100,
  loop = true,
  autoplay = true,
  className = '',
  src = '/animations/Fumaa.lottie',
}: {
  size?: number
  loop?: boolean
  autoplay?: boolean
  className?: string
  src?: string
}) {
  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <DotLottieReact
        src={src}     // ← ruta pública, no se importa el archivo
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
