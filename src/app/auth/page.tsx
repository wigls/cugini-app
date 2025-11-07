'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
function DebugAuthPing({ email, password }: { email: string; password: string }) {
  async function ping() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ email, password }),
      });
      const txt = await res.text();
      console.log('PING STATUS', res.status);
      console.log('PING BODY', txt);
      alert(`PING status: ${res.status}`);
    } catch (e: any) {
      console.error('PING FAILED', e);
      alert(`PING failed: ${e?.message || e}`);
    }
  }
  return (
    <button
      type="button"
      onClick={ping}
      className="w-full bg-amber-100 text-amber-900 py-2 rounded text-sm mt-2"
      title="Llama al endpoint /auth/v1/token directamente"
    >
      🔧 Probar conexión Auth (debug)
    </button>
  );
}

export default function AuthPage() {
  // Forms
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  // UI
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'newpass'>('signup')

  // Detección de flujo de recuperación al entrar desde el correo
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const byHash = hash.includes('type=recovery') || hash.includes('access_token=')
    const byQuery = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('type') === 'recovery'
      : false

    if (byHash || byQuery) {
      setMode('newpass')
      setMsg('Escribe tu nueva contraseña.')
    }
  }, [])

  const origin = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    []
  )
  const authRedirect = `${origin}/auth`

  // ---------- SIGN UP ----------
  async function onSignup(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    if (!fullName.trim()) return setMsg('⚠️ Ingresa tu nombre completo.')
    const phoneRegex = /^\+56\s?9\d{8}$/ // +56 9XXXXXXXX
    if (!phoneRegex.test(phone.trim())) return setMsg('⚠️ Formato de teléfono: +56 9XXXXXXXX')

    if (password !== password2) return setMsg('⚠️ Las contraseñas no coinciden.')
    if (password.length < 8) return setMsg('⚠️ Mínimo 8 caracteres.')

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirect,
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    })
    setLoading(false)

    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('already registered')) return setMsg('⚠️ Ya existe una cuenta con ese correo.')
      return setMsg('❌ Error al crear la cuenta: ' + error.message)
    }

    setMsg('📩 Te enviamos un enlace para verificar tu cuenta. Revisa tu correo.')
    setMode('login')
  }

  // ---------- LOGIN ----------
  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })
    setLoading(false)

    if (error) {
      const m = error.message?.toLowerCase() ?? ''
      if (m.includes('email not confirmed') || m.includes('not confirmed')) {
        return setMsg('⚠️ Debes verificar tu correo antes de iniciar sesión.')
      }
      return setMsg('❌ Error al iniciar sesión: ' + error.message)
    }

    if (data?.user) {
      window.location.href = '/app'
    } else {
      setMsg('⚠️ Inicia sesión nuevamente.')
    }
  }

  // ---------- RESET (enviar correo) ----------
  async function onReset(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: authRedirect,
    })
    setLoading(false)
    if (error) return setMsg('❌ Error al enviar el correo: ' + error.message)
    setMsg('📩 Te enviamos un enlace para recuperar tu contraseña.')
    setMode('login')
  }

  // ---------- NEW PASSWORD (después del correo) ----------
  const [newPass1, setNewPass1] = useState('')
  const [newPass2, setNewPass2] = useState('')
  async function onNewPass(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (newPass1 !== newPass2) return setMsg('⚠️ Las contraseñas no coinciden.')
    if (newPass1.length < 8) return setMsg('⚠️ Mínimo 8 caracteres.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass1 })
    setLoading(false)
    if (error) return setMsg('❌ No se pudo actualizar: ' + error.message)
    setMsg('✅ Contraseña actualizada. Inicia sesión.')
    setMode('login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white shadow rounded-xl p-6 w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center text-green-700">Cugini Pizzas 🍕</h1>

        {mode === 'signup' && (
          <form onSubmit={onSignup} className="space-y-2">
            <input className="w-full border rounded px-3 py-2" placeholder="Nombre completo"
              value={fullName} onChange={e=>setFullName(e.target.value)} required />
            <input className="w-full border rounded px-3 py-2" placeholder="Número WhatsApp (+56 9XXXXXXXX)"
              value={phone} onChange={e=>setPhone(e.target.value)} required />
            <input className="w-full border rounded px-3 py-2" type="email" placeholder="Correo"
              value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="w-full border rounded px-3 py-2" type="password" placeholder="Contraseña"
              value={password} onChange={e=>setPassword(e.target.value)} required />
            <input className="w-full border rounded px-3 py-2" type="password" placeholder="Repetir contraseña"
              value={password2} onChange={e=>setPassword2(e.target.value)} required />
            <button disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              {loading ? 'Creando…' : 'Crear cuenta'}
            </button>
            <p className="text-xs text-center">
              ¿Ya tienes cuenta?{' '}
              <span className="text-blue-600 cursor-pointer" onClick={()=>setMode('login')}>Inicia sesión</span>
            </p>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={onLogin} className="space-y-2">
            <input className="w-full border rounded px-3 py-2" type="email" placeholder="Correo"
              value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required />
            <input className="w-full border rounded px-3 py-2" type="password" placeholder="Contraseña"
              value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required />
            <button disabled={loading} className="w-full bg-slate-700 text-white py-2 rounded hover:bg-slate-800">
              {loading ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
            <div className="text-xs text-center space-x-2">
              <span className="text-blue-600 cursor-pointer" onClick={()=>setMode('reset')}>¿Olvidaste tu contraseña?</span>
              <span>•</span>
              <span className="text-blue-600 cursor-pointer" onClick={()=>setMode('signup')}>Crear cuenta</span>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={onReset} className="space-y-2">
            <input className="w-full border rounded px-3 py-2" type="email" placeholder="Tu correo"
              value={resetEmail} onChange={e=>setResetEmail(e.target.value)} required />
            <button disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
            <p className="text-xs text-center">
              <span className="text-blue-600 cursor-pointer" onClick={()=>setMode('login')}>Volver</span>
            </p>
          </form>
        )}

        {mode === 'newpass' && (
          <form onSubmit={onNewPass} className="space-y-2">
            <input className="w-full border rounded px-3 py-2" type="password" placeholder="Nueva contraseña"
              value={newPass1} onChange={e=>setNewPass1(e.target.value)} required />
            <input className="w-full border rounded px-3 py-2" type="password" placeholder="Repetir contraseña"
              value={newPass2} onChange={e=>setNewPass2(e.target.value)} required />
            <button disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
            <p className="text-xs text-center">
              <span className="text-blue-600 cursor-pointer" onClick={()=>setMode('login')}>Volver</span>
            </p>
          </form>
        )}

        {msg && <p className="text-sm bg-slate-50 border rounded p-2 text-center">{msg}</p>}
      </div>
    </div>
  )
}
