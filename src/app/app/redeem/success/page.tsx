'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function RedeemSuccessPage() {
  const sp = useSearchParams()
  const code = sp.get('code') ?? '—'
  const reward = sp.get('reward') ?? ''

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [phone, setPhone] = useState<string>('')

  const [copied, setCopied] = useState(false)

  // 📲 Número oficial de Cugini (sin +, sin espacios)
  const phoneCugini = '56932383553'

  useEffect(() => {
    async function load() {
      // 1) Usuario
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        // Si no hay sesión, enviamos a /auth
        window.location.href = '/auth'
        return
      }
      setEmail(user.email ?? '')

      // 2) Perfil en DB
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .maybeSingle()

      // 3) Fallback a metadata (por si el perfil aún no existe)
      const meta = (user.user_metadata ?? {}) as Record<string, any>

      setFullName((prof?.full_name ?? meta.full_name ?? '').toString())
      setPhone((prof?.phone ?? meta.phone ?? '').toString())

      setLoading(false)
    }
    load()
  }, [])

  const profileComplete = fullName.trim().length > 0 && phone.trim().length > 0

  const waLink = useMemo(() => {
    const text = encodeURIComponent(
      [
        `Hola, acabo de canjear en la app Cugini.`,
        `Código: ${code}`,
        `Premio(s): ${reward || '—'}`,
        fullName ? `Nombre: ${fullName}` : ``,
        phone ? `Teléfono: ${phone}` : ``,
        email ? `Correo: ${email}` : ``,
      ]
        .filter(Boolean)
        .join('\n')
    )
    return `https://wa.me/${phoneCugini}?text=${text}`
  }, [code, reward, fullName, phone, email])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(
        [
          `Código: ${code}`,
          reward ? `Premio(s): ${reward}` : ``,
          fullName ? `Nombre: ${fullName}` : ``,
          phone ? `Teléfono: ${phone}` : ``,
          email ? `Correo: ${email}` : ``,
        ]
          .filter(Boolean)
          .join(' | ')
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // noop
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white rounded-xl shadow p-4">Cargando…</div>
      </div>
    )
  }

  // 🔒 Si el perfil NO está completo, bloqueamos y pedimos completarlo
  if (!profileComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold text-slate-800">Completa tu perfil para finalizar</h1>
          <p className="text-slate-600 text-sm">
            Para poder procesar tu canje online necesitamos tu <span className="font-medium">nombre completo</span> y tu{' '}
            <span className="font-medium">número de WhatsApp</span>.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm">
            <p className="text-slate-600">
              Código de canje: <span className="font-mono font-semibold">{code}</span>
            </p>
            {reward && (
              <p className="text-slate-600">
                Premio(s): <span className="font-medium">{reward}</span>
              </p>
            )}
          </div>
          <a
            href="/app/profile"
            className="block w-full text-center bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Completar mi perfil
          </a>
          <a href="/app" className="block text-center text-sm text-slate-400 hover:text-slate-600">
            ⬅ Volver a Mis puntos
          </a>
        </div>
      </div>
    )
  }

  // ✅ Perfil completo: flujo normal con WhatsApp
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6 mt-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-700 text-2xl">✅</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">¡Canje exitoso!</h1>
            <p className="text-slate-500 text-sm">
              Envía tu código por WhatsApp para que el equipo de Cugini lo valide y procese tu pedido online.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-1">
          <p className="text-sm text-slate-500">Código de canje</p>
          <div className="flex items-center justify-between gap-3">
            <code className="text-lg font-bold text-slate-800">{code}</code>
            <button
              onClick={copyCode}
              className="text-sm px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
            >
              {copied ? 'Copiado ✔' : 'Copiar'}
            </button>
          </div>

          {reward && (
            <p className="text-slate-600 text-sm">
              Premio(s): <span className="font-medium">{reward}</span>
            </p>
          )}
          <p className="text-slate-600 text-sm">
            Nombre: <span className="font-medium">{fullName}</span>
          </p>
          <p className="text-slate-600 text-sm">
            WhatsApp: <span className="font-medium">{phone}</span>
          </p>
          {email && (
            <p className="text-slate-600 text-sm">
              Correo: <span className="font-medium">{email}</span>
            </p>
          )}
        </div>

        {/* CTA principal: WhatsApp */}
        <a
          href={waLink}
          className="block w-full text-center bg-green-600 text-white py-2 rounded hover:bg-green-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          📲 Enviar por WhatsApp
        </a>

        <p className="text-xs text-slate-400">
          Si WhatsApp no abre automáticamente, presiona “Copiar” y pega el mensaje en tu chat con Cugini.
        </p>

        <div className="flex flex-wrap gap-2">
          <a
            href="/app"
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Ir a Mis puntos
          </a>
          <a
            href="/app/redeem"
            className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200"
          >
            Canjear más
          </a>
        </div>
      </div>
    </div>
  )
}
