'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// 👇 le dejo el nombre en minúscula pero puede ser Reward igual
type Revision = {
  id: number
  name: string
  description: string | null
  points_cost: number
  is_active: boolean
  image_url?: string | null
}

export default function AdminRewardsPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [rewards, setRewards] = useState<Revision[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pointsCost, setPointsCost] = useState(200)
  const [message, setMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)

  // 👇 1. cargar premios desde la tabla REAL
  async function loadRewards() {
    const { data, error } = await supabase
      .from('revisión') // ← ESTA es la que tú estás usando
      .select('*')
      .order('points_cost', { ascending: true })

    if (error) {
      console.error('❌ Error al cargar premios:', error)
      return
    }

    if (data) {
      setRewards(data as Revision[])
    }
  }

  // 👇 2. comprobar que es admin y luego cargar
  useEffect(() => {
    async function check() {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data: adminRes } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!adminRes) {
        setIsAdmin(false)
        return
      }

      setIsAdmin(true)
      loadRewards()
    }

    check()
  }, [])

  // 👇 3. subir la imagen al STORAGE
  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!file) return null

    const fileExt = file.name.split('.').pop()
    const fileName = `reward-${Date.now()}.${fileExt}`
    const filePath = `rewards/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cugini-images') // ← este es TU bucket
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      // 👇 aquí mostramos todo el error
      console.error(
        '❌ Error al subir al storage:',
        JSON.stringify(uploadError, null, 2)
      )
      setMessage('❌ No se pudo subir la imagen al storage.')
      return null
    }

    console.log('✅ Subida ok:', uploadData)

    // crear URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('cugini-images').getPublicUrl(filePath)

    return publicUrl
  }

  // 👇 4. crear o editar premio
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    // subimos imagen si hay
    const imageUrl = await uploadImageIfNeeded()

    // --- EDITAR ---
    if (editingId) {
      const { error } = await supabase
        .from('revisión') // ← misma tabla
        .update({
          name,
          description: description || null,
          points_cost: pointsCost,
          is_active: true,
          // si no subimos imagen nueva, no la pisamos
          ...(imageUrl ? { image_url: imageUrl } : {}),
        })
        .eq('id', editingId)

      if (error) {
        console.error('❌ No se pudo actualizar el premio:', error)
        setMessage('❌ No se pudo actualizar el premio.')
        return
      }

      setMessage('✅ Premio actualizado.')
      setEditingId(null)
      setName('')
      setDescription('')
      setPointsCost(200)
      setFile(null)
      await loadRewards()
      return
    }

    // --- CREAR ---
    const { error } = await supabase.from('revisión').insert({
      name,
      description: description || null,
      points_cost: pointsCost,
      is_active: true,
      image_url: imageUrl,
    })

    if (error) {
      console.error('❌ No se pudo crear el premio:', error)
      setMessage('❌ No se pudo crear el premio.')
      return
    }

    setMessage('✅ Premio creado.')
    setName('')
    setDescription('')
    setPointsCost(200)
    setFile(null)
    await loadRewards()
  }

  // 👇 5. activar / desactivar
  async function toggleActive(id: number, current: boolean) {
    const { error } = await supabase
      .from('revisión')
      .update({ is_active: !current })
      .eq('id', id)

    if (error) {
      console.error('❌ No se pudo cambiar estado:', error)
      return
    }

    await loadRewards()
  }

  // 👇 6. poner datos en el form para editar
  function startEdit(r: Revision) {
    setEditingId(r.id)
    setName(r.name)
    setDescription(r.description ?? '')
    setPointsCost(r.points_cost)
    setFile(null)
  }

  // ------------------------------ UI ------------------------------
  if (isAdmin === null) {
    return <div className="p-6">Comprobando permisos...</div>
  }

  if (!isAdmin) {
    return <div className="p-6 text-red-500">No tienes acceso.</div>
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold mb-2">Premios / Canjes</h1>
          <p className="text-sm text-slate-500 mb-4">
            Agrega, edita o desactiva premios. Ahora puedes subir una imagen 🍕
          </p>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre del premio</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Pizza Familiar"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={2}
                placeholder="Cualquier sabor, retiro en local"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Costo en puntos</label>
              <input
                type="number"
                value={pointsCost}
                onChange={(e) => {
                  const v = e.target.value
                  setPointsCost(v === '' ? 0 : parseInt(v, 10))
                }}
                className="w-full border rounded px-3 py-2"
                min={1}
              />
            </div>
            {/* input de imagen más visible */}
            <div>
              <label className="block text-sm mb-1">Imagen (opcional)</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-md cursor-pointer hover:bg-slate-200 text-sm">
                <span>📷 Seleccionar imagen</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    setFile(
                      e.target.files && e.target.files[0]
                        ? e.target.files[0]
                        : null
                    )
                  }
                />
              </label>
              {file && (
                <p className="text-xs text-slate-500 mt-1">
                  Imagen seleccionada: {file.name}
                </p>
              )}
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {editingId ? 'Guardar cambios' : 'Crear premio'}
            </button>
          </form>

          {message && <p className="mt-3 text-sm">{message}</p>}
        </div>

        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Premios actuales</h2>
          {rewards.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay premios.</p>
          ) : (
            <ul className="space-y-2">
              {rewards.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between items-center border rounded px-3 py-2 gap-3"
                >
                  <div className="flex items-center gap-3">
                    {r.image_url ? (
                      <img
                        src={r.image_url}
                        alt={r.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slate-200" />
                    )}
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-slate-400">
                        {r.description ?? '—'} · {r.points_cost} pts
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => startEdit(r)}
                      className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActive(r.id, r.is_active)}
                      className={
                        r.is_active
                          ? 'text-xs px-2 py-1 bg-green-100 text-green-700 rounded'
                          : 'text-xs px-2 py-1 bg-slate-200 text-slate-500 rounded'
                      }
                    >
                      {r.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
