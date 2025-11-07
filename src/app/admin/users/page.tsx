'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  points: number | null
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('admin_app_users') // 👈 la vista que creamos en SQL
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error trayendo usuarios:', error)
        setErrorMsg(error.message ?? 'Error consultando usuarios')
      } else if (data) {
        setUsers(data as AdminUser[])
      }

      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <Link
        href="/admin"
        className="text-sm text-slate-500 hover:text-slate-700 inline-block mb-4"
      >
        ← Volver al panel
      </Link>

      <h1 className="text-2xl font-bold mb-2 text-slate-800">
        Usuarios de Cugini
      </h1>
      <p className="text-slate-500 mb-6">
        Lista de personas registradas en la app, con sus puntos actuales.
      </p>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Puntos</th>
              <th className="px-4 py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-4">
                  Cargando...
                </td>
              </tr>
            ) : errorMsg ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-red-500">
                  {errorMsg}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-slate-400">
                  No hay usuarios registrados todavía.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b last:border-none">
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.full_name ?? '—'}</td>
                  <td className="px-4 py-2">{u.phone ?? '—'}</td>
                  <td className="px-4 py-2 font-semibold text-green-600">
                    {u.points ?? 0}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {new Date(u.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
