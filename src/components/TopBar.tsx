'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function TopBar() {
  const pathname = usePathname()

  // cache inmediato para evitar lag visual
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('cugini_is_admin') === '1'
  })
  const [hasUser, setHasUser] = useState<boolean>(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // valida admin desde profiles.is_admin o tabla admin_users
  async function fetchIsAdmin(userId: string) {
    // 1) intenta profiles.is_admin
    const { data: p } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', userId)
      .maybeSingle()

    if (p?.is_admin === true) return true

    // 2) fallback a admin_users
    const { data: a } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    return !!a
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes.user
      if (!mounted) return

      setHasUser(!!user)

      if (user) {
        const ok = await fetchIsAdmin(user.id)
        if (!mounted) return
        setIsAdmin(ok)
        localStorage.setItem('cugini_is_admin', ok ? '1' : '0')
      } else {
        setIsAdmin(false)
        localStorage.removeItem('cugini_is_admin')
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      const user = session?.user
      setHasUser(!!user)
      if (user) {
        const ok = await fetchIsAdmin(user.id)
        setIsAdmin(ok)
        localStorage.setItem('cugini_is_admin', ok ? '1' : '0')
      } else {
        setIsAdmin(false)
        localStorage.removeItem('cugini_is_admin')
      }
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    localStorage.removeItem('cugini_is_admin')
    window.location.href = '/auth'
  }

  // activo: exacto para /app; prefijo para el resto
  function isActive(href: string) {
    if (!pathname) return false
    if (href === '/app') return pathname === '/app'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function linkClass(href: string) {
    return (
      'px-3 py-1 rounded-md font-medium transition-colors duration-200 ' +
      (isActive(href)
        ? 'bg-cugini-green text-white shadow-sm'
        : 'text-cugini-dark hover:bg-cugini-green/20 hover:text-cugini-dark')
    )
  }

  const links = [
    { href: '/app', label: 'Mis puntos' },
    { href: '/app/claim', label: 'Reclamar código' },
    { href: '/app/redeem', label: 'Canjea tus puntos' },
    { href: '/app/profile', label: 'Mi perfil' },
  ]
  if (isAdmin) links.push({ href: '/admin', label: 'Admin' })

  return (
    <div className="w-full bg-cugini-cream border-b border-cugini-dark/10 shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo / Nombre */}
        <Link href="/app" className="flex items-center gap-1">
          <span className="text-2xl font-extrabold text-cugini-green tracking-tight">
            Cugini
          </span>
          <span className="text-cugini-red text-xl font-bold">Pizza</span>
        </Link>

        {/* Navegación */}
        <nav className="flex items-center gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Sesión */}
        <div className="flex items-center gap-2">
          {hasUser ? (
            <button
              onClick={handleLogout}
              className="text-sm text-cugini-dark hover:text-cugini-red"
              disabled={loggingOut}
            >
              {loggingOut ? 'Saliendo…' : 'Cerrar sesión'}
            </button>
          ) : (
            <Link
              href="/auth"
              className="text-sm text-cugini-dark hover:text-cugini-green"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
