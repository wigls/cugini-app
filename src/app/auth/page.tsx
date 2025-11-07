'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AuthPage() {
  const searchParams = useSearchParams()

  // ---------- ESTADOS REGISTRO ----------
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regFullName, setRegFullName] = useState('')
  const [regPhone, setRegPhone] = useState('')

  // ---------- ESTADOS LOGIN ----------
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // ---------- RESET ----------
  const [resetEmail, setResetEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [isResetFlow, setIsResetFlow] = useState(false)
  const [showResetRequest, setShowResetRequest] = useState(false)

  // ---------- GENERALES ----------
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Modo post-registro: “revisa tu correo”
  const [checkEmailMode, setCheckEmailMode] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')

  // detectar si viene desde el correo (hash o query) para reset
  useEffect(() => {
    const byQuery = searchParams.get('type') === 'recovery'
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const byHash =
      hash.includes('type=recovery') ||
      hash.includes('recovery') ||
      hash.includes('access_token=')

    if (byQuery || byHash) {
      setIsResetFlow(true)
      setMessage('Escribe tu nueva contraseña para tu cuenta de Cugini Pizzas.')
    }
  }, [searchParams])

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  const authRedirect = `${origin}/auth`

  // -----------------------------
  // REGISTRO  (siempre exige verificación de correo)
  // -----------------------------
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!regFullName.trim()) {
      setMessage('⚠️ Debes ingresar tu nombre completo.')
      return
    }
    const phone = regPhone.trim()
    const phoneRegex = /^\+56\s?9\d{8}$/ // +56 9XXXXXXXX
    if (!phoneRegex.test(phone)) {
      setMessage('⚠️ El número debe tener el formato +56 912345678')
      return
    }

    if (regPassword !== regConfirmPassword) {
      setMessage('⚠️ Las contraseñas no coinciden.')
      return
    }
    if (regPassword.length < 8) {
      setMessage('⚠️ La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!/\d/.test(regPassword)) {
      setMessage('⚠️ La contraseña debe incluir al menos un número.')
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        emailRedirectTo: authRedirect, // tras verificar, volverá a /auth
        data: {
          full_name: regFullName.trim(),
          phone: phone,
        },
      },
    })
    setIsLoading(false)

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setMessage('⚠️ Ya existe una cuenta con este correo.')
      } else {
        setMessage('❌ Error al crear la cuenta: ' + error.message)
      }
      return
    }

    // Si tu proyecto permite autologin (session no-nula), podrías upsert profile aquí.
    // Pero como vamos a exigir confirmación, mostramos SIEMPRE la pantalla de “revisa tu correo”.
    setPendingEmail(regEmail)
    setCheckEmailMode(true)
    setMessage(
      'Te enviamos un enlace para verificar tu cuenta. Abre tu correo y sigue las instrucciones.'
    )
  }

  // Reenviar verificación
  async function handleResendVerification() {
    setMessage(null)
    if (!pendingEmail) {
      setMessage('Ingresa un correo para reenviar la verificación.')
      return
    }
    setIsLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo: authRedirect },
    })
    setIsLoading(false)
    if (error) {
      setMessage('❌ No se pudo reenviar: ' + error.message)
    } else {
      setMessage('📩 Te reenviamos el correo de verificación.')
    }
  }

  // -----------------------------
  // LOGIN
  // -----------------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    setIsLoading(false)

    if (error) {
      // Mensaje específico si la cuenta no está verificada
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setMessage('⚠️ Debes verificar tu correo antes de iniciar sesión.')
        setPendingEmail(loginEmail)
        setCheckEmailMode(true)
      } else {
        setMessage('❌ Error al iniciar sesión: ' + error.message)
      }
      return
    }

    // Sesión OK
    if (data?.user) {
      window.location.href = '/app'
    } else {
      // Raro, pero por si acaso
      setMessage('⚠️ Inicia sesión nuevamente.')
    }
  }

  // -----------------------------
  // PEDIR CORREO PARA RESET
  // -----------------------------
  async function handleResetPasswordRequest(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setIsLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: authRedirect,
    })

    setIsLoading(false)

    if (error) {
      setMessage('❌ Error al enviar el correo: ' + error.message)
    } else {
      setMessage(
        '📩 Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.'
      )
      setShowResetRequest(false)
    }
  }

  // -----------------------------
  // CAMBIAR CONTRASEÑA (después del correo)
  // -----------------------------
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== newPassword2) {
      setMessage('⚠️ Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 8) {
      setMessage('⚠️ La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    setIsLoading(false)

    if (error) {
      setMessage('❌ No se pudo actualizar la contraseña: ' + error.message)
    } else {
      setMessage('✅ Tu contraseña fue actualizada. Ahora puedes iniciar sesión.')
      setIsResetFlow(false)
      setShowResetRequest(false)
    }
  }

  // ============= RENDER =============
  // Pantalla intermedia: “Revisa tu correo”
  if (checkEmailMode && !isResetFlow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm space-y-3">
          <h2 className="text-2xl font-bold text-green-700 text-center">Revisa tu correo</h2>
          <p className="text-sm text-slate-600">
            Te enviamos un enlace de verificación a <span className="font-semibold">{pendingEmail}</span>.
            Abre el correo y haz clic en el enlace para activar tu cuenta.
          </p>

          <button
            onClick={handleResendVerification}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            {isLoading ? 'Enviando…' : 'Reenviar correo de verificación'}
          </button>

          <button
            onClick={() => {
              setCheckEmailMode(false)
              setMessage(null)
            }}
            className="w-full bg-slate-100 text-slate-700 py-2 rounded hover:bg-slate-200 text-sm"
          >
            Volver
          </button>

          {message && (
            <p className="mt-1 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
              {message}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center text-green-700">
          Cugini Pizzas 🍕
        </h2>

        {isResetFlow ? (
          // MODO: VIENE DEL CORREO (reset)
          <form onSubmit={handleChangePassword} className="space-y-3">
            <p className="text-sm text-slate-600">Ingresa tu nueva contraseña.</p>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="password"
              placeholder="Repetir nueva contraseña"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsResetFlow(false)
                setShowResetRequest(false)
                setMessage(null)
              }}
              className="w-full bg-slate-100 text-slate-700 py-2 rounded hover:bg-slate-200 text-sm"
            >
              Volver al inicio de sesión
            </button>
          </form>
        ) : !showResetRequest ? (
          <>
            {/* REGISTRO */}
            <form onSubmit={handleSignUp} className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Nombre completo"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Número de WhatsApp"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-slate-400 ml-1">Ejemplo: +56 912345678</p>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Repetir contraseña"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            {/* LOGIN */}
            <form onSubmit={handleLogin} className="space-y-3">
              <h3 className="text-center text-slate-600 text-sm mb-1">
                ¿Ya tienes cuenta?
              </h3>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-700 text-white py-2 rounded hover:bg-slate-800"
              >
                {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
              <p
                onClick={() => setShowResetRequest(true)}
                className="text-xs text-center text-blue-600 mt-2 cursor-pointer hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </p>
            </form>
          </>
        ) : (
          // MODO: pedir correo para reset
          <form onSubmit={handleResetPasswordRequest} className="space-y-3">
            <p className="text-sm text-slate-600">
              Ingresa tu correo y te enviaremos un enlace.
            </p>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {isLoading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <p
              onClick={() => setShowResetRequest(false)}
              className="text-xs text-center text-blue-600 mt-2 cursor-pointer hover:underline"
            >
              Volver
            </p>
          </form>
        )}

        {message && !checkEmailMode && (
          <p className="mt-4 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
