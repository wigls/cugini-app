'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

type RowRPC = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  balance: number | null;
  created_at: string;
};

type RowView = {
  id?: string;              // por si tu vista usa "id"
  user_id?: string;         // o "user_id"
  email: string;
  full_name: string | null;
  phone: string | null;
  balance?: number | null;  // vistas que traen balance
  points?: number | null;   // vistas que ya lo llaman points
  created_at: string;
};

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  points: number;
  created_at: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);

      // 1) Asegura sesión
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        setErrorMsg(`Error de sesión: ${authErr.message}`);
        setLoading(false);
        return;
      }
      if (!authData?.user) {
        // si quieres, redirige:
        // window.location.href = '/auth';
        setErrorMsg('Debes iniciar sesión para ver esta página.');
        setLoading(false);
        return;
      }

      // 2) INTENTO A) RPC con SECURITY DEFINER
      let acc: AdminUser[] | null = null;

      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_list_users');
      if (!rpcErr && rpcData && Array.isArray(rpcData)) {
        acc = (rpcData as RowRPC[]).map((r) => ({
          id: r.user_id,
          email: r.email,
          full_name: r.full_name,
          phone: r.phone,
          points: Number(r.balance ?? 0),
          created_at: r.created_at,
        }));
      } else {
        // 3) INTENTO B) Vista pública. Probamos primero user_directory y luego admin_app_users
        const tryViews = async (): Promise<AdminUser[] | null> => {
          // B.1: user_directory
          let { data: v1, error: e1 } = await supabase
            .from('user_directory')
            .select('*')
            .order('created_at', { ascending: false });

          if (!e1 && v1) {
            return (v1 as RowView[]).map((r) => ({
              id: (r.user_id || r.id) as string,
              email: r.email,
              full_name: r.full_name,
              phone: r.phone,
              points: Number((r.points ?? r.balance ?? 0) as number),
              created_at: r.created_at,
            }));
          }

          // B.2: admin_app_users (tu vista anterior)
          let { data: v2, error: e2 } = await supabase
            .from('admin_app_users')
            .select('*')
            .order('created_at', { ascending: false });

          if (!e2 && v2) {
            return (v2 as RowView[]).map((r) => ({
              id: (r.user_id || r.id) as string,
              email: r.email,
              full_name: r.full_name,
              phone: r.phone,
              points: Number((r.points ?? r.balance ?? 0) as number),
              created_at: r.created_at,
            }));
          }

          // Si ambos fallan, propaga el último error para debug
          setErrorMsg(
            `No se pudo consultar usuarios. ` +
              (rpcErr ? `RPC: ${rpcErr.message}. ` : '') +
              (e1 ? `user_directory: ${e1.message}. ` : '') +
              (e2 ? `admin_app_users: ${e2.message}.` : '')
          );
          return null;
        };

        acc = await tryViews();
      }

      if (acc) setUsers(acc);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <Link
        href="/admin"
        className="text-sm text-slate-500 hover:text-slate-700 inline-block mb-4"
      >
        ← Volver al panel
      </Link>

      <h1 className="text-2xl font-bold mb-2 text-slate-800">Usuarios de Cugini</h1>
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
                <td colSpan={5} className="px-4 py-4">Cargando...</td>
              </tr>
            ) : errorMsg ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-red-500">{errorMsg}</td>
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
                    {Number.isFinite(u.points) ? u.points : 0}
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
  );
}
