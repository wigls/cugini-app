'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type EarnCode = {
  id: number
  code: string
  points: number
  is_redeemed: boolean
  redeemed_by: string | null
  redeemed_at: string | null
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<EarnCode[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    async function load() {
      // comprobar admin
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

      const { data, error } = await supabase
        .from('earn_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCodes(data as EarnCode[])
      }
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <div className="p-6">Cargando...</div>
  if (isAdmin === false) return <div className="p-6 text-red-500">No tienes acceso.</div>

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Códigos generados</h1>
        <p className="text-sm text-slate-500">
          Aquí ves cuáles están activos y cuáles ya fueron usados.
        </p>

        <div className="space-y-2">
          {codes.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay códigos.</p>
          ) : (
            codes.map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center border rounded px-3 py-2"
              >
                <div>
                  <p className="font-mono text-sm">{c.code}</p>
                  <p className="text-xs text-slate-400">
                    {c.redeemed_at
                      ? `Canjeado: ${new Date(c.redeemed_at).toLocaleString()}`
                      : 'Disponible'}
                  </p>
                </div>
                <div className="flex gap-3 items-center">
                  <span className="text-sm font-bold text-green-700">
                    {c.points} pts
                  </span>
                  <span
                    className={
                      c.is_redeemed
                        ? 'px-2 py-1 text-xs rounded bg-red-100 text-red-700'
                        : 'px-2 py-1 text-xs rounded bg-green-100 text-green-700'
                    }
                  >
                    {c.is_redeemed ? 'USADO' : 'ACTIVO'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
