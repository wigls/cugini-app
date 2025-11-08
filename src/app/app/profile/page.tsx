'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ProfilePage() {
  /* ---------- Refs & state ---------- */
  const fileRef = useRef<HTMLInputElement>(null)

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [favoritePizza, setFavoritePizza] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [birthday, setBirthday] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  /* ======= Editor de avatar (zoom/drag antes de subir) ======= */
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorImgUrl, setEditorImgUrl] = useState<string | null>(null)
  const editorImgRef = useRef<HTMLImageElement | null>(null)
  const [imgReady, setImgReady] = useState(false)

  // tamaño del marco de previsualización (px)
  const PREV = 280
  const CANVAS = 512 // export

  // pan/zoom en px relativos al cuadro de PREV
  const [scale, setScale] = useState(1) // 1..3
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; baseX: number; baseY: number }>({
    dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0
  })

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current.dragging) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    setOffset({ x: dragState.current.baseX + dx, y: dragState.current.baseY + dy })
  }
  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    dragState.current.dragging = false
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  // --- util: normalizar teléfono a formato +56 9XXXXXXXX
  function normalizePhone(input: string) {
    const digits = input.replace(/\D/g, '')
    // intenta detectar si ya viene con 56
    if (digits.startsWith('569') && digits.length >= 11) return `+${digits.slice(0, 11)}`
    if (digits.length >= 9 && digits.startsWith('9')) return `+569${digits.slice(0, 8)}`
    if (digits.length === 11 && digits.startsWith('569')) return `+${digits}`
    // fallback: devuelve como +56 + resto si calza
    return input.trim()
  }

  async function exportAndUploadCropped() {
    if (!editorImgRef.current) return
    const img = editorImgRef.current
    // baseScale: ajusta el lado menor de la imagen al marco PREV
    const baseScale = PREV / Math.min(img.naturalWidth, img.naturalHeight)
    const totalScale = baseScale * scale

    // tamaño final dibujado en PREV
    const drawW_prev = img.naturalWidth * totalScale
    const drawH_prev = img.naturalHeight * totalScale

    // centrado en el marco + offsets del usuario
    const dx_prev = (PREV - drawW_prev) / 2 + offset.x
    const dy_prev = (PREV - drawH_prev) / 2 + offset.y

    // llevamos a canvas 512x512 (mantenemos proporción)
    const k = CANVAS / PREV
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS
    canvas.height = CANVAS
    const ctx = canvas.getContext('2d')!

    // fondo blanco por si exportas a JPEG
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, CANVAS, CANVAS)

    ctx.drawImage(
      img,
      dx_prev * k,
      dy_prev * k,
      drawW_prev * k,
      drawH_prev * k
    )

    const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b as Blob), 'image/jpeg', 0.9)!)
    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return

    const path = `${user.id}-${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) {
      console.error(upErr)
      setMsg('❌ No se pudo subir la imagen. Revisa permisos del bucket "avatars".')
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = data?.publicUrl || null
    setPreviewUrl(publicUrl)
    setEditorOpen(false)
    setMsg('📷 Vista previa lista. Pulsa “Guardar cambios”.')
  }

  /* ---------- Cargar datos ---------- */
  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) { setLoading(false); return }
      setEmail(user.email ?? '')

      // Leer perfil desde DB
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, phone, favorite_pizza, preferred_time, birthday, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      // Respaldo: metadata del auth si el perfil está vacío
      const meta = (user.user_metadata ?? {}) as Record<string, any>

      setFullName((prof?.full_name ?? meta.full_name ?? '') as string)
      setWhatsapp((prof?.phone ?? meta.phone ?? '') as string)
      setFavoritePizza((prof?.favorite_pizza ?? '') as string)
      setPreferredTime((prof?.preferred_time ?? '') as string)
      setBirthday((prof?.birthday ?? '') as string)
      setAvatarUrl((prof?.avatar_url ?? null) as string | null)

      setLoading(false)
    })()
  }, [])

  const currentAvatar =
    previewUrl || avatarUrl || 'https://api.dicebear.com/7.x/thumbs/svg?seed=cugini'

  /* ---------- Avatar: seleccionar (abrir editor) ---------- */
  function openFile() {
    fileRef.current?.click()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // abrimos el editor con un objeto URL local
    const localUrl = URL.createObjectURL(file)
    setEditorImgUrl(localUrl)
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setImgReady(false)
    setEditorOpen(true)
  }

  /* ---------- Guardar perfil ---------- */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    try {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) throw new Error('No hay sesión activa.')

      const normalizedPhone = normalizePhone(whatsapp.trim())

      const payload: any = {
        user_id: user.id,
        full_name: fullName.trim(),
        phone: normalizedPhone,
        favorite_pizza: (favoritePizza || '').trim() || null,
        preferred_time: (preferredTime || '').trim() || null,
        birthday: birthday || null,
      }
      if (previewUrl) payload.avatar_url = previewUrl

      // 1) Guardar en public.profiles
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) {
        console.error(error)
        setMsg('❌ Error al guardar. Revisa la consola.')
        setSaving(false)
        return
      }

      // 2) Sincronizar en auth.users.metadata (para que "Usuarios Cugini" vea los cambios)
      const metaUpdate: Record<string, any> = {
        full_name: payload.full_name || null,
        phone: payload.phone || null,
      }
      if (previewUrl) metaUpdate.avatar_url = previewUrl

      const { error: metaErr } = await supabase.auth.updateUser({ data: metaUpdate })
      if (metaErr) {
        console.warn('[auth.updateUser metadata]', metaErr.message)
        // no detenemos, pero dejamos aviso suave al usuario
        setMsg('✅ Cambios guardados. (Nota: el panel admin puede demorar en reflejar el nombre).')
      } else {
        setMsg('✅ Cambios guardados correctamente.')
      }

      if (previewUrl) { setAvatarUrl(previewUrl); setPreviewUrl(null) }
    } catch (err) {
      console.error(err)
      setMsg('❌ Ocurrió un error guardando.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-white grid place-items-center">
        <p className="text-cugini-dark">Cargando…</p>
      </div>
    )
  }

  /* =======================================================================
     LAYOUT
     ======================================================================= */
  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto w-full max-w-[540px] px-3 py-6 relative">
        {/* ======================= CARD PRINCIPAL ======================= */}
        <div
          className="
            relative z-[1] w-full
            rounded-2xl bg-white/95 backdrop-blur
            shadow-[0_6px_30px_rgba(0,0,0,0.08)]
            overflow-hidden
          "
        >
          {/* -------- Portada -------- */}
          <div className="relative h-[180px] w-full">
            <img
              src="/cugini-cover.jpg"
              alt="Cugini cover"
              className="w-full h-full object-cover"
            />
          </div>

          {/* -------- Avatar + botón de cámara centrado debajo -------- */}
          <div className="relative -mt-14 flex flex-col items-center">
            <div className="relative p-[3px] rounded-full bg-gradient-to-br from-cugini-green/30 via-transparent to-cugini-red/30">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-white shadow-lg">
                <img src={currentAvatar} alt="avatar" className="w-full h-full object-cover" />
              </div>
            </div>

            <button
              type="button"
              onClick={openFile}
              className="mt-2 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full text-white shadow hover:shadow-md transition"
              style={{ background: '#1C6B3C' }}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
            >
              📷 <span className="hidden sm:inline">Cambiar foto</span>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          {/* -------- Título -------- */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xl">🍕</span>
            <h1 className="text-2xl font-extrabold text-cugini-dark">Mi perfil</h1>
          </div>

          {/* ======================= FORMULARIO ======================= */}
          <form onSubmit={handleSave} className="px-5 pb-6 pt-4">
            {/* Correo */}
            <div className="mb-3">
              <label className="text-sm text-cugini-dark/70 block mb-1">Correo</label>
              <input
                type="text"
                value={email}
                disabled
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 text-slate-600 px-3 py-2 break-all"
              />
            </div>

            {/* Nombre / WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-sm text-cugini-dark/70 block mb-1">Nombre completo *</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cugini-green/40"
                />
              </div>
              <div>
                <label className="text-sm text-cugini-dark/70 block mb-1">WhatsApp *</label>
                <input
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+56 912345678"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cugini-green/40 break-all"
                />
              </div>
            </div>

            {/* Pizza favorita */}
            <div className="mb-3">
              <label className="text-sm text-cugini-dark/70 block mb-1">Pizza favorita</label>
              <input
                value={favoritePizza}
                onChange={(e) => setFavoritePizza(e.target.value)}
                placeholder="ej: Pepperoni, Margarita…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cugini-green/40"
              />
            </div>

            {/* Horario / Cumpleaños */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-sm text-cugini-dark/70 block mb-1">¿En qué horario disfrutas tu pizza?</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cugini-green/40"
                >
                  <option value="">Selecciona…</option>
                  <option value="Mañana (11–14h)">Mañana (11–14h)</option>
                  <option value="Tarde (14–19h)">Tarde (14–19h)</option>
                  <option value="Noche (19–22h)">Noche (19–22h)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-cugini-dark/70 block mb-1">Cumpleaños</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cugini-green/40"
                />
              </div>
            </div>

            {/* CTA cumpleaños */}
            <p className="text-sm text-cugini-dark/80 mb-4">
              🎉 Si hoy es tu cumpleaños,&nbsp;
              <a
                href={`https://wa.me/56932383553?text=${encodeURIComponent('Hola Cugini, hoy es mi cumpleaños 🎉')}`}
                target="_blank"
                className="underline text-cugini-green"
              >
                escríbenos por WhatsApp
              </a>.
            </p>

            {/* Botón guardar */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-full font-semibold text-white shadow hover:shadow-md transition-shadow disabled:opacity-70"
                style={{ background: '#1C6B3C' }}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>

            {msg && (
              <div className="mt-3 text-center text-sm bg-cugini-cream/70 border border-cugini-dark/10 rounded-lg px-3 py-2">
                {msg}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ======= Modal editor de imagen ======= */}
      {editorOpen && editorImgUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditorOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-cugini-dark">Ajustar foto</h3>

            {/* Marco cuadrado con máscara circular */}
            <div
              className="mx-auto rounded-full overflow-hidden border shadow relative touch-none"
              style={{ width: PREV, height: PREV }}
              onPointerDown={startDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <img
                ref={editorImgRef}
                src={editorImgUrl}
                onLoad={() => setImgReady(true)}
                alt="preview"
                draggable={false}
                className="select-none"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-md border"
                onClick={() => { setEditorOpen(false); setEditorImgUrl(null) }}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-md text-white"
                style={{ background: '#1C6B3C' }}
                disabled={!imgReady}
                onClick={exportAndUploadCropped}
              >
                Usar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
