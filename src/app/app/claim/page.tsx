'use client'

import { useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

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

    // Usa EXACTAMENTE la misma normalización que te funcionaba
    // (solo trim, sin upper ni limpieza agresiva)
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

      // Backend previo devolvía: 'OK', 'INVALID_CODE'/'INVALIDO_O_VENCIDO', 'NO_AUTH', etc.
      if (data === 'OK') {
        setVariant('success')
        setMessage('✅ Código reclamado. Ya tienes tus puntos.')
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

      // fallback por si devuelve otro texto
      setVariant('warn')
      setMessage(`⚠️ Respuesta del servidor: ${String(data ?? '').trim() || 'Desconocida'}`)
    } catch (err) {
      console.error('handleSubmit fatal:', err)
      setVariant('error')
      setMessage('❌ Error inesperado. Revisa la consola.')
    } finally {
      setLoading(false)
    }
  }

  const alertClass =
    variant === 'success'
      ? 'bg-green-50 border border-green-200 text-green-700'
      : variant === 'error'
      ? 'bg-red-50 border border-red-200 text-red-700'
      : variant === 'warn'
      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
      : 'bg-slate-50 border border-slate-200 text-slate-600'

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ===== Tarjeta: Reclamar código (estética bonita) ===== */}
        <div className="rounded-2xl bg-white/95 backdrop-blur shadow-[0_6px_30px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-100">🎟️</span>
              <div>
                <h1 className="text-lg font-extrabold text-cugini-dark">Reclamar código</h1>
                <p className="text-sm text-cugini-dark/70">
                  Ingresa el código que viene en tu caja Cugini para sumar puntos.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <form onSubmit={handleSubmit} className="px-5 pt-5 pb-6">
            <label className="text-sm text-cugini-dark/70 block mb-1">Código de tu caja</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ej: CUGINI-1234"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cugini-green/40"
            />

            <div className="mt-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full sm:w-auto px-6 py-2 rounded-full font-semibold text-white shadow hover:shadow-md transition disabled:opacity-60 ${
                  canSubmit ? '' : ''
                }`}
                style={{ background: '#1C6B3C' }}
                title={canSubmit ? 'Reclamar código' : 'Escribe un código válido'}
              >
                {loading ? 'Reclamando…' : 'Reclamar código'}
              </button>
            </div>

            {message && (
              <p className={`text-sm mt-3 rounded px-3 py-2 ${alertClass}`}>
                {message}
              </p>
            )}

            <p className="text-xs text-slate-500 mt-2">
              Tip: escribe el código tal como aparece (mayúsculas y guiones).
            </p>
          </form>
        </div>

        {/* ===== Tarjeta: Horario ===== */}
        <div className="rounded-2xl bg-white/95 backdrop-blur shadow-[0_6px_30px_rgba(0,0,0,0.08)] px-5 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span>⏰</span>
            <h2 className="text-base font-bold text-cugini-dark">Horario de atención</h2>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
            <span className="text-cugini-dark/80">Miércoles a Domingo</span>
            <span className="font-semibold text-cugini-dark">18:00 – 23:00 hrs</span>
          </div>
        </div>

        {/* === Imagen decorativa entre secciones === */}
        <div className="flex justify-center">
          <img
            src="/brand/woman.png"
            alt="Repartidor de pizzas"
            loading="lazy"
            className="w-44 sm:w-52 md:w-60 lg:w-64 opacity-25"
          />
        </div>

        {/* ===== Tarjeta: Dirección ===== */}
        <div className="rounded-2xl bg-white/95 backdrop-blur shadow-[0_6px_30px_rgba(0,0,0,0.08)] px-5 py-5">
          <div className="flex items-center gap-2 mb-3">
            <span>📍</span>
            <h2 className="text-base font-bold text-cugini-dark">Dónde estamos</h2>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 text-sm">
            <p className="text-cugini-dark/90">Exequiel Larenas 547,Coelemu, Ñuble</p>
            <a
              href="https://maps.app.goo.gl/aBtLezprD2BF9M1D9"
              target="_blank"
              className="inline-block mt-2 text-cugini-green underline"
            >
              Ver en Google Maps
            </a>
          </div>
        </div>

        {/* ===== Tarjeta: Carta ===== */}
        <div className="rounded-2xl bg-white/95 backdrop-blur shadow-[0_6px_30px_rgba(0,0,0,0.08)] px-5 pt-5 pb-7">
          <div className="flex items-center gap-2 mb-3">
            <span>📖</span>
            <h2 className="text-base font-bold text-cugini-dark">Nuestra carta</h2>
          </div>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
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
{/* Animaciones locales para micro-interacciones */}
<style jsx>{`
  @keyframes cgiShake { ... }
  .cgi-shake { ... }
  @keyframes cgiBreathe { ... }
  .cgi-breathe { ... }
`}</style>
