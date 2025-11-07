'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';

type Announcement = {
  id: number;
  title: string | null;
  message: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  created_by: string | null;
};

export default function AdminAnnouncementsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState<string>('');
  const [endsAt, setEndsAt] = useState<string>('');

  const [items, setItems] = useState<Announcement[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setErr(null);
      const { data: ures, error: aerr } = await supabase.auth.getUser();
      if (aerr) { setIsAdmin(false); setErr(aerr.message); return; }
      const uid = ures?.user?.id;
      if (!uid) { setIsAdmin(false); return; }

      const { data: adminRow, error: admErr } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', uid)
        .maybeSingle();

      if (admErr) { setIsAdmin(false); setErr(admErr.message); return; }
      if (!adminRow) { setIsAdmin(false); return; }

      setIsAdmin(true);
      await reload();
    })();
  }, []);

  async function reload() {
    setErr(null);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { setErr(error.message || 'No se pudieron cargar los avisos.'); return; }
    setItems(data || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      if (!message.trim()) {
        setErr('El mensaje no puede estar vacío.');
        setSaving(false);
        return;
      }

      const { data: ures } = await supabase.auth.getUser();
      const uid = ures?.user?.id || null;

      const payload = {
        title: title.trim() || null,
        message: message.trim(),
        is_active: isActive,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        created_by: uid,
      };

      const { error } = await supabase.from('announcements').insert(payload);
      if (error) throw error;

      setTitle(''); setMessage(''); setIsActive(true); setStartsAt(''); setEndsAt('');
      await reload();
    } catch (e: any) {
      setErr(e?.message || 'Error al crear aviso.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: number, next: boolean) {
    setErr(null);
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: next })
      .eq('id', id);
    if (error) { setErr(error.message || 'No se pudo actualizar.'); return; }
    await reload();
  }

  if (isAdmin === null) return <div className="p-6">Comprobando permisos…</div>;
  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">No tienes acceso.</p>
        {err && <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-300 rounded p-2 mt-2">{err}</p>}
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">⬅ Volver al panel</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Avisos de Cugini</h1>
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">⬅ Volver al panel</Link>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded shadow p-6 space-y-3">
          <h2 className="font-semibold">Nuevo aviso</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Título (opcional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="¡Promo fin de semana!"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Mensaje *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="El amor puede esperar, la pizza no 🍕"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Activo
              </label>

              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm mb-1">Empieza (opcional)</label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>

              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm mb-1">Termina (opcional)</label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            <button type="submit" disabled={saving} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60">
              {saving ? 'Guardando…' : 'Publicar aviso'}
            </button>

            {err && <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-300 rounded p-2">{err}</p>}
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded shadow p-6">
          <h2 className="font-semibold mb-3">Últimos avisos</h2>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">No hay avisos aún.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((a) => (
                <li key={a.id} className="border rounded px-3 py-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.title || '(Sin título)'}</p>
                      <p className="text-sm text-slate-600 break-words">{a.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {a.is_active ? 'Activo' : 'Inactivo'} · {new Date(a.created_at).toLocaleString()}
                        {a.starts_at ? ` · desde ${new Date(a.starts_at).toLocaleString()}` : ''}
                        {a.ends_at ? ` · hasta ${new Date(a.ends_at).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <button
                        onClick={() => toggleActive(a.id, !a.is_active)}
                        className={`px-2 py-1 rounded text-xs ${a.is_active ? 'bg-slate-200' : 'bg-green-600 text-white'}`}
                      >
                        {a.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
