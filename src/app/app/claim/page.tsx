'use client'

import { useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import  SteamLottie  from '../../../components/SteamLottie'

type Variant = 'neutral' | 'success' | 'error' | 'warn'


export default function ClaimPage() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [variant, setVariant] = useState<Variant>('neutral')
  const [loading, setLoading] = useState(false)

  const canSubmit = useMemo(
    () => code.trim().length > 0 && !loading,
    [code, loading]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setMessage(null)
    setVariant('neutral')

    const cleanCode = code.trim()

    try {
      const { data, error } = await supabase.rpc('claim_points', {
        p_code: cleanCode,
      })

      if (error) {
        console.error('❌ claim_points error:', error)
        setVariant('error')
        setMessage('❌ Ocurrió un error al reclamar el código.')
        return
      }

      if (data === 'OK') {
        setVariant('success')
        setMessage('✅ Código reclamado. ¡Ya tienes tus puntos!')
        setCode('')
        return
      }

      if (data === 'INVALID_CODE' || data === 'INVALIDO_O_VENCIDO') {
        setVariant('warn')
        setMessage('⚠️ Código inválido o ya usado.')
        return
      }

      if (data === 'NO_AUTH') {
        setVariant('warn')
        setMessage('⚠️ Debes iniciar sesión para reclamar.')
        return
      }

      setVariant('warn')
      setMessage(
        `⚠️ Respuesta del servidor: ${
          String(data ?? '').trim() || 'Desconocida'
        }`
      )
    } catch (err) {
      console.error('handleSubmit fatal:', err)
      setVariant('error')
      setMessage('❌ Error inesperado. Revisa la consola.')
    } finally {
      setLoading(false)
    }
  }

  // === Estilos condicionales ===
  const alertClass =
    variant === 'success'
      ? 'bg-green-50 border border-green-200 text-green-700'
      : variant === 'error'
      ? 'bg-red-50 border border-red-200 text-red-700'
      : variant === 'warn'
      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
      : 'bg-slate-50 border border-slate-200 text-slate-600'

  // === Microanimaciones ===
  const inputAnimClass = variant === 'error' ? 'cgi-shake' : ''
  const alertAnimClass = variant === 'success' ? 'cgi-breathe' : ''

  return (
    <div className="min-h-screen claim-bg px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-7">

        {/* ===== Tarjeta: Reclamar código ===== */}
        <div className="relative rounded-[1.2rem] overflow-hidden 
                bg-gradient-to-br from-[#FFF8ED] via-[#FFF3E0] to-[#FFE5C2] 
                border border-[#F7D6A4]/70 shadow-[0_8px_25px_rgba(255,150,60,0.15)] 
                backdrop-blur-[3px]">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE7B8] text-[#D9480F]">
                🎟️
              </span>
              <div>
                <h1 className="text-lg font-extrabold text-[#1C3325] drop-shadow-sm">
                  Reclamar código
                </h1>
                <p className="text-sm text-cugini-dark/70">
                  Ingresa el código que viene en tu caja Cugini para sumar puntos.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-[#FFD9A0]/50 via-[#FFF] to-[#FFD9A0]/50" />

          <form onSubmit={handleSubmit} className="px-5 pt-5 pb-6">
            <label className="text-sm text-cugini-dark/70 block mb-1">
              Código de tu caja
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ej: CUGINI-1234"
              className={`w-full rounded-lg border border-[#F8D9A0]/70 px-3 py-2 
                          bg-white/60 focus:outline-none focus:ring-2 focus:ring-cugini-green/40 ${inputAnimClass}`}
            />

            <div className="mt-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full sm:w-auto px-6 py-2 rounded-full font-semibold text-white shadow hover:shadow-lg transition disabled:opacity-60"
                style={{
                  background: 'linear-gradient(90deg, #1C6B3C 0%, #2FB45D 100%)',
                }}
                title={
                  canSubmit
                    ? 'Reclamar código'
                    : 'Escribe un código válido para continuar'
                }
              >
                {loading ? 'Reclamando…' : 'Reclamar código'}
              </button>
            </div>

            {message && (
              <p
                className={`text-sm mt-3 rounded px-3 py-2 ${alertClass} ${alertAnimClass}`}
              >
                {message}
              </p>
            )}

            <p className="text-xs text-slate-500 mt-2">
              Tip: escribe el código tal como aparece (mayúsculas y guiones).
            </p>
          </form>
        </div>

        {/* ===== Tarjeta: Horario ===== */}
        <div className="rounded-[1.2rem] bg-gradient-to-br from-[#FFF1DB] via-[#FFE4BE] to-[#FFDFA6] 
             shadow-[0_6px_20px_rgba(255,140,60,0.15)] border border-[#F6C987]/70 
             px-5 py-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span>⏰</span>
            <h2 className="text-base font-bold text-cugini-dark drop-shadow-sm">
              Horario de atención
            </h2>
          </div>

          <div className="rounded-lg border border-[#F8D9A0]/50 p-3 flex items-center justify-between bg-white/60 backdrop-blur">
            <span className="text-cugini-dark/80">Miércoles a Domingo</span>
            <span className="font-semibold text-cugini-dark">
              18:00 – 23:00 hrs
            </span>
          </div>
        </div>

        {/* === Imagen decorativa (más visible y con sombra cálida) === */}

      {/* === Sticker “animacion” === */}
      <div className="relative flex justify-center">
  <img
    src="/brand/woman.png"
    alt="Repartidora Cugini"
    className="w-44 sm:w-52 md:w-60 lg:w-64 opacity-90"
  />

  {/* Animación de vapor encima de la caja */}
  <div className="absolute left-[66%] top-[22%] -translate-x-1/2 -translate-y-1/2">
    <SteamLottie size={100} />
  </div>
</div>

        {/* ===== Tarjeta: Dirección ===== */}
<div
  className="relative rounded-[1.2rem] overflow-hidden
             bg-gradient-to-br from-[#FFF1DB] via-[#FFE4BE] to-[#FFDFA6]
             border border-[#F6C987]/70 shadow-[0_6px_20px_rgba(255,140,60,0.15)]
             px-5 py-5"
>
  {/* Lottie en esquina (padre es relative) */}
  <SteamLottie
    src="/animations/Travel Icons - Map.lottie"
    size={80}
    className="absolute right-2 top-0 z-20 pointer-events-none"
    // Si quieres microajustar píxel a píxel, usa 'style':
    // style={{ right: '6px', top: '-11px' }}
  />

  <div className="flex items-center gap-2 mb-3 relative z-10">
    <span>📍</span>
    <h2 className="text-base font-bold text-cugini-dark drop-shadow-sm">
      Dónde estamos
    </h2>
  </div>

  <div className="rounded-lg border border-[#F8D9A0]/50 p-3 text-sm
                  bg-white/70 backdrop-blur relative z-10">
    <p className="text-cugini-dark/90">
      Exequiel Larenas 547, Coelemu, Ñuble
    </p>
    <a
      href="https://maps.app.goo.gl/aBtLezprD2BF9M1D9"
      target="_blank"
      className="inline-block mt-2 text-cugini-green underline hover:text-cugini-red transition-colors"
    >
      Ver en Google Maps
    </a>
  </div>
</div>



        {/* ===== Tarjeta: Carta ===== */}
        <div className="rounded-[1.2rem] bg-gradient-to-br from-[#FFF8ED] via-[#FFF3E0] to-[#FFE5C2] 
             shadow-[0_8px_24px_rgba(255,140,60,0.15)] border border-[#F9D7A5]/70 
             backdrop-blur-[3px] transition hover:shadow-[0_10px_32px_rgba(255,140,60,0.25)] 
             px-5 py-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span>📖</span>
            <h2 className="text-base font-bold text-cugini-dark drop-shadow-sm">
              Nuestra carta
            </h2>
          </div>

          <div className="rounded-lg border border-[#F8D9A0]/50 overflow-hidden bg-white/60 backdrop-blur">
            <img
              src="/brand/menu.jpg"
              alt="Carta Cugini Pizza"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>

          <p className="text-xs text-slate-500 mt-2 text-center">
            *Abre con zoom para ver todos los sabores disponibles.
          </p>
        </div>
      </div>
    </div>
  )
}
