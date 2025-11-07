'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Movement = {
  id: number
  user_id: string
  email: string | null
  type: string
  change: number | null
  points: number | null
  reason: string | null
  created_at: string
}

export default function AdminMovimientosPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [movs, setMovs] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'earn' | 'redeem'>('all')

  useEffect(() => {
    async function load() {
      // 1. comprobar admin
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const { data: adminRes } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!adminRes) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)

      // 2. traer movimientos usando la función SQL
      const { data, error } = await supabase.rpc(
        'get_admin_point_transactions'
      )

      if (!error && data) {
        setMovs(data as Movement[])
      }

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="p-6">Cargando movimientos…</div>
  }

  if (isAdmin === false) {
    return <div className="p-6 text-red-500">No tienes acceso.</div>
  }

  // aplicar filtro en el front
  const filtered = movs.filter((m) => {
    const t = m.type ? m.type.toUpperCase() : ''
    if (filter === 'all') return true
    if (filter === 'earn') return t === 'EARN'
    if (filter === 'redeem') return t === 'REDEEM'
    return true
  })

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded shadow p-6 space-y-4">
        {/* encabezado */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Movimientos de puntos</h1>
            <p className="text-sm text-slate-500">
              Reclamos de códigos y canjes de clientes.
            </p>
          </div>
          <a
            href="/admin"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ⬅ Volver
          </a>
        </div>

        {/* filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={
              filter === 'all'
                ? 'px-3 py-1 rounded bg-green-600 text-white text-sm'
                : 'px-3 py-1 rounded bg-slate-100 text-sm'
            }
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('earn')}
            className={
              filter === 'earn'
                ? 'px-3 py-1 rounded bg-green-600 text-white text-sm'
                : 'px-3 py-1 rounded bg-slate-100 text-sm'
            }
          >
            Sumó puntos
          </button>
          <button
            onClick={() => setFilter('redeem')}
            className={
              filter === 'redeem'
                ? 'px-3 py-1 rounded bg-green-600 text-white text-sm'
                : 'px-3 py-1 rounded bg-slate-100 text-sm'
            }
          >
            Canjes
          </button>
        </div>

        {/* tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3">Fecha</th>
                <th className="text-left py-2 pr-3">Usuario</th>
                <th className="text-left py-2 pr-3">Detalle</th>
                <th className="text-left py-2 pr-3">Tipo</th>
                <th className="text-right py-2">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-6 text-slate-400 text-sm"
                  >
                    No hay movimientos con ese filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const t = m.type ? m.type.toUpperCase() : ''

                  // ✅ monto correcto: primero points (earn), luego change (redeem)
                  const amount =
                    m.points ?? (m.change ?? 0)

                  const isPositive = amount > 0
                  const isNegative = amount < 0

                  const tipoBonito =
                    t === 'EARN'
                      ? 'Sumó puntos'
                      : t === 'REDEEM'
                      ? 'Canje de premio'
                      : 'Movimiento'

                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-600">
                        {m.email ?? m.user_id}
                      </td>
                      <td className="py-2 pr-3">
                        {m.reason ?? tipoBonito}
                      </td>
                      <td className="py-2 pr-3">
                        {t === 'EARN' ? (
                          <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">
                            {tipoBonito}
                          </span>
                        ) : t === 'REDEEM' ? (
                          <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
                            {tipoBonito}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs">
                            {tipoBonito}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {isPositive ? (
                          <span className="text-green-600 font-bold">
                            +{amount}
                          </span>
                        ) : isNegative ? (
                          <span className="text-red-600 font-bold">
                            {amount}
                          </span>
                        ) : (
                          <span className="text-slate-500">{amount}</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
