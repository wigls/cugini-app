// src/components/AppHeader.tsx
'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useState } from 'react'

export function AppHeader() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      router.push('/auth') // redirige al inicio o login
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header
      className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="h-12 px-3 flex items-center justify-center relative">
        {/* título centrado */}
        <h1 className="text-green-700 font-extrabold tracking-tight text-center">
          <span className="inline-flex items-center gap-2">
            <span className="text-[17px]">Cugini Pizza App</span>
            <span aria-hidden>🍕📱</span>
          </span>
        </h1>

        {/* botón de cerrar sesión a la derecha */}
        <div className="absolute right-3 inset-y-0 flex items-center">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="
              text-[13px] sm:text-sm font-semibold px-3 py-1.5 rounded-full
              border border-green-700 text-green-700 hover:bg-green-700 hover:text-white
              transition disabled:opacity-60
            "
          >
            {loggingOut ? 'Cerrando…' : 'Salir'}
          </button>
        </div>
      </div>
    </header>
  )
}
