'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type EarnCode = {
  id: number
  code: string
  points: number
  is_claimed: boolean
  created_at: string
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const [points, setPoints] = useState<number>(200)
  const [code, setCode] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)

  const [message, setMessage] = useState<string | null>(null)
  const [codes, setCodes] = useState<EarnCode[]>([])

  // NUEVO: errores visibles
  const [authError, setAuthError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [codesError, setCodesError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setAuthError(null)
      setAdminError(null)
      setCodesError(null)
      setMessage(null)

      try {
        // 1) Usuario autenticado
        const { data: userRes, error: userErr } = await supabase.auth.getUser()
        if (userErr) {
          console.error('auth.getUser error:', userErr)
          setAuthError('No fue posible validar la sesión (auth.getUser).')
          setIsAdmin(false)
          return
        }
        const user = userRes?.user
        if (!user) {
          setIsAdmin(false)
          setAuthError('Debes iniciar sesión para acceder al panel de admin.')
          return
        }

        // 2) Check admin_users
        const { data: adminRes, error: adminChkErr } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (adminChkErr) {
          console.error('admin_users check error:', adminChkErr)
          setIsAdmin(false)
          setAdminError('No fue posible comprobar permisos de admin (admin_users).')
          return
        }

        if (!adminRes) {
          setIsAdmin(false)
          setAdminError('Tu cuenta no tiene permisos de administrador.')
          return
        }

        setIsAdmin(true)

        // 3) Últimos códigos
        const { data: codesRes, error: codesErr } = await supabase
          .from('earn_codes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20)

        if (codesErr) {
          console.error('earn_codes select error:', codesErr)
          setCodesError('No fue posible cargar los últimos códigos.')
          setCodes([])
        } else {
          setCodes(codesRes || [])
        }
      } catch (err) {
        console.error('load() fatal:', err)
        setAuthError('Ocurrió un error inesperado al cargar el panel.')
        setIsAdmin(false)
      }
    }

    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setCodesError(null)

    try {
      const rows: Array<{ code: string; points: number; is_claimed: boolean }> = []
      for (let i = 0; i < quantity; i++) {
        const base = code.trim()
        const finalCode =
          base !== ''
            ? `${base}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
            : `CUGINI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        rows.push({ code: finalCode, points, is_claimed: false })
      }

      const { error: insErr } = await supabase.from('earn_codes').insert(rows)
      if (insErr) {
        console.error('earn_codes insert error:', insErr)
        setMessage('❌ No se pudo crear el/los códigos.')
        return
      }

      setMessage(`✅ Se crearon ${quantity} código(s).`)

      const { data: codesRes, error: refreshErr } = await supabase
        .from('earn_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (refreshErr) {
        console.error('earn_codes refresh error:', refreshErr)
        setCodesError('No fue posible refrescar la lista de códigos.')
      } else {
        setCodes(codesRes || [])
      }

      setCode('')
    } catch (err) {
      console.error('handleCreate fatal:', err)
      setMessage('❌ Error inesperado al crear códigos.')
    }
  }

  if (isAdmin === null) {
    return <div className="p-6">Comprobando permisos...</div>
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Panel admin Cugini</h1>

          {authError && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
              {authError}
            </div>
          )}
          {adminError && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
              {adminError}
            </div>
          )}

          {!authError && !adminError && (
            <div className="text-red-500">No tienes acceso.</div>
          )}

          <a href="/app" className="inline-block text-sm text-slate-500 hover:text-slate-700">
            ⬅ Volver a la app
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Panel admin Cugini</h1>
          <a href="/app" className="text-sm text-slate-500 hover:text-slate-700">
            ⬅ Volver a la app
          </a>
        </div>

        {/* Alertas de error (superiores) */}
        {(authError || adminError || codesError) && (
          <div className="space-y-2">
            {authError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
                {authError}
              </div>
            )}
            {adminError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
                {adminError}
              </div>
            )}
            {codesError && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm">
                {codesError}
              </div>
            )}
          </div>
        )}

        {/* TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Usuarios Cugini */}
          <a
            href="/admin/users"
            className="bg-white rounded shadow p-4 hover:border-green-400 border border-transparent"
          >
            <h2 className="font-semibold">Usuarios Cugini</h2>
            <p className="text-xs text-slate-500 mt-1">
              Ver correos, nombres y puntos de los usuarios registrados.
            </p>
          </a>

          {/* 2. Premios / canjes */}
          <a
            href="/admin/rewards"
            className="bg-white rounded shadow p-4 hover:border-green-400 border border-transparent"
          >
            <h2 className="font-semibold">Premios / canjes</h2>
            <p className="text-xs text-slate-500 mt-1">
              Crear, editar o desactivar premios.
            </p>
          </a>

          {/* 3. Movimientos */}
          <a
            href="/admin/movimientos"
            className="bg-white rounded shadow p-4 hover:border-green-400 border border-transparent"
          >
            <h2 className="font-semibold">Movimientos</h2>
            <p className="text-xs text-slate-500 mt-1">
              Reclamos de códigos y canjes de clientes.
            </p>
          </a>

          {/* 4. Avisos de Cugini */}
          <a
            href="/admin/announcements"  // si tu panel está bajo /app/admin usa "/app/admin/announcements"
            className="bg-white rounded shadow p-4 hover:border-green-400 border border-transparent"
          >
            <h2 className="font-semibold">Avisos de Cugini</h2>
            <p className="text-xs text-slate-500 mt-1">
              Publica y administra mensajes que verán los clientes en su panel.
            </p>
          </a>
        </div>

        {/* FORMULARIO DE CREACIÓN DE CÓDIGOS */}
        <div className="bg-white rounded shadow p-6 space-y-4">
          <p className="text-slate-500 text-sm">
            Genera códigos de puntos para pegarlos en las cajas.
          </p>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">
                Código (opcional, para poner un nombre)
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="CUGINI-PROMO-VIERNES"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm mb-1">Puntos</label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value === '' ? 0 : parseInt(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                  min={1}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm mb-1">Cantidad</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? 1 : parseInt(e.target.value))}
                  className="w-full border rounded px-3 py-2"
                  min={1}
                  max={50}
                />
                <p className="text-xs text-slate-400">
                  Para imprimir muchas etiquetas iguales.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Crear código(s)
            </button>
          </form>

          {message && <p className="text-sm mt-2">{message}</p>}
        </div>

        {/* LISTA DE CÓDIGOS RECIENTES */}
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Últimos códigos</h2>
          {codesError && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 p-3 text-sm mb-3">
              {codesError}
            </div>
          )}
          <ul className="space-y-2">
            {codes.map((c) => (
              <li key={c.id} className="flex justify-between items-center border rounded px-3 py-2">
                <div>
                  <p className="font-mono text-sm">{c.code}</p>
                  <p className="text-xs text-slate-400">
                    {c.points} pts · {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={
                    c.is_claimed
                      ? 'text-xs px-2 py-1 bg-slate-200 rounded'
                      : 'text-xs px-2 py-1 bg-green-100 text-green-800 rounded'
                  }
                >
                  {c.is_claimed ? 'USADO' : 'DISPONIBLE'}
                </span>
              </li>
            ))}
            {codes.length === 0 && (
              <li className="text-sm text-slate-400">No hay códigos aún.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
