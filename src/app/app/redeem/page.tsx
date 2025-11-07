'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Reward = {
  id: number
  name: string
  description: string | null
  points_cost: number
  image_url?: string | null
  is_active?: boolean
}

export default function RedeemPage() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState(false)

  // cantidades por id de premio: { [rewardId]: qty }
  const [qtyById, setQtyById] = useState<Record<number, number>>({})

  useEffect(() => {
    async function load() {
      try {
        const { data: userRes } = await supabase.auth.getUser()
        const user = userRes.user
        if (!user) { setLoading(false); return }

        const { data: balanceRes } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        setBalance(balanceRes?.balance ?? 0)

        const { data: rewardsRes, error } = await supabase
          .from('revisión')
          .select('*')
          .order('points_cost', { ascending: true })

        if (error) {
          console.error('❌ Error al traer premios:', error)
          setRewards([])
        } else {
          const activeOnly = (rewardsRes || []).filter((r: any) => r.is_active !== false)
          setRewards(activeOnly)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalUnits = useMemo(
    () => Object.values(qtyById).reduce((a, b) => a + (b || 0), 0),
    [qtyById]
  )

  const totalSelected = useMemo(() => {
    let total = 0
    for (const r of rewards) {
      const q = qtyById[r.id] || 0
      if (q > 0) total += r.points_cost * q
    }
    return total
  }, [rewards, qtyById])

  const overLimit = totalSelected > balance

  function incQty(id: number) {
    if (redeeming) return
    setMessage(null)
    const reward = rewards.find(rr => rr.id === id)
    const cost = reward?.points_cost ?? 0
    const nextTotal = totalSelected + cost
    if (nextTotal > balance) {
      setMessage('⚠️ No te alcanzan los puntos para sumar esa unidad.')
      return
    }
    setQtyById(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  }

  function decQty(id: number) {
    if (redeeming) return
    setMessage(null)
    setQtyById(prev => {
      const cur = prev[id] || 0
      const next = Math.max(0, cur - 1)
      const copy: Record<number, number> = { ...prev, [id]: next }
      if (next === 0) delete copy[id]
      return copy
    })
  }

  async function handleRedeemSelected() {
    if (redeeming) return
    setMessage(null)

    if (totalUnits === 0) {
      setMessage('⚠️ No has seleccionado premios.')
      return
    }
    if (totalSelected > balance) {
      setMessage(`⚠️ Seleccionaste ${totalSelected} pts y solo tienes ${balance} pts.`)
      return
    }

    setRedeeming(true)
    try {
      let currentBalance = balance
      const redeemedMap: Record<number, number> = {}

      for (const r of rewards) {
        const qty = qtyById[r.id] || 0
        if (qty <= 0) continue

        for (let i = 0; i < qty; i++) {
          if (currentBalance < r.points_cost) {
            if (Object.keys(redeemedMap).length > 0) {
              setMessage(`⚠️ No alcanzaron los puntos para canjear todas las unidades de "${r.name}". Se canjearon solo algunas.`)
              break
            } else {
              setMessage('⚠️ No tienes puntos suficientes.')
              return
            }
          }

          const { data, error } = await supabase.rpc('redeem_reward', { p_reward_id: r.id })
          if (error || data !== 'OK') {
            console.error('❌ Error al canjear:', r.name, error || data)
            if (Object.keys(redeemedMap).length > 0) {
              setMessage('⚠️ Se canjearon algunos premios antes de que ocurriera un error.')
              break
            } else {
              setMessage('❌ Error al canjear.')
              return
            }
          }

          redeemedMap[r.id] = (redeemedMap[r.id] || 0) + 1
          currentBalance = currentBalance - r.points_cost

          // sincroniza con la vista de saldo
          const { data: userRes } = await supabase.auth.getUser()
          const user = userRes.user
          if (user) {
            const { data: balanceRes } = await supabase
              .from('user_points')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle()
            if (balanceRes?.balance !== undefined) currentBalance = balanceRes.balance
          }
        }
      }

      setBalance(currentBalance)
      if (Object.keys(redeemedMap).length === 0) return

      const summary = rewards
        .filter(r => redeemedMap[r.id] > 0)
        .map(r => `${r.name} x${redeemedMap[r.id]}`)
        .join(', ')

      const code = 'CUG-' + Math.floor(100000 + Math.random() * 900000).toString()
      setQtyById({})
      window.location.href =
        `/app/redeem/success?code=${encodeURIComponent(code)}&reward=${encodeURIComponent(summary)}`
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cugini-cream px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="bg-white/80 backdrop-blur rounded-lg border border-cugini-dark/10 p-4">
            <div className="h-6 w-48 bg-slate-200 rounded mb-2" />
            <div className="h-4 w-64 bg-slate-200 rounded" />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-cugini-dark/10 bg-white/80 backdrop-blur p-3">
                <div className="w-full h-36 bg-slate-200 rounded-lg mb-3" />
                <div className="h-5 w-40 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
                <div className="flex items-center justify-between">
                  <div className="h-6 w-24 bg-slate-200 rounded" />
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-slate-200 rounded" />
                    <div className="h-8 w-8 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cugini-cream px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* encabezado */}
        <div className="rounded-xl border border-cugini-dark/10 bg-white/90 backdrop-blur p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-cugini-green">Canjea tus puntos</h1>
            <p className="text-sm text-cugini-dark/70">Elige tus favoritos y confirma el canje.</p>
          </div>
          <div className="text-sm">
            <span className="text-cugini-dark/60">Tus puntos: </span>
            <span className="font-bold text-cugini-green">{balance}</span>
          </div>
        </div>

        {/* barra simple (sólida) */}
        <div className="bg-white rounded shadow p-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Ítems: {totalUnits}</p>
          <p className="text-sm">
            Total{' '}
            <span className={`font-bold ${overLimit ? 'text-red-600' : 'text-green-700'}`}>
              {totalSelected}
            </span>{' '}
            pts
            {overLimit && (
              <span className="ml-2 text-red-600">
                (te faltan {totalSelected - balance} pts)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { if (!redeeming) { setQtyById({}); setMessage(null) } }}
              className="px-3 py-1 rounded text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-60"
              disabled={redeeming}
            >
              Limpiar
            </button>
            <button
              onClick={handleRedeemSelected}
              disabled={totalUnits === 0 || overLimit || redeeming}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {redeeming ? 'Procesando…' : 'Canjear seleccionados'}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm px-3 py-2">
            {message}
          </div>
        )}

        {/* lista + TILE DECORATIVO AL FINAL */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.length === 0 ? (
            <div className="col-span-full">
              <div className="rounded-xl border border-cugini-dark/10 bg-white/90 backdrop-blur p-6 text-center">
                <p className="text-cugini-dark/60">No hay premios disponibles por ahora.</p>
              </div>
            </div>
          ) : (
            <>
              {rewards.map((r) => {
                const qty = qtyById[r.id] || 0
                const lineTotal = qty * r.points_cost

                return (
                  <div
                    key={r.id}
                    className="group rounded-2xl border border-cugini-dark/10 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                  >
                    <div className="relative">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={r.name}
                          className="w-full h-40 object-cover"
                        />
                      ) : (
                        <div className="w-full h-40 bg-slate-200" />
                      )}
                      <div className="absolute top-2 right-2 bg-cugini-green text-white text-xs px-2 py-1 rounded-full shadow">
                        {r.points_cost} pts
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-semibold text-cugini-dark">{r.name}</h3>
                      <p className="text-xs text-cugini-dark/60 line-clamp-2 mt-1">
                        {r.description ?? '—'}
                      </p>

                      <div className="mt-auto pt-3 flex items-center justify-between">
                        {qty > 0 ? (
                          <span className="text-sm text-cugini-dark/70">
                            = <span className="font-semibold">{lineTotal}</span> pts
                          </span>
                        ) : <span />}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decQty(r.id)}
                            disabled={redeeming}
                            className="w-9 h-9 rounded-lg bg-cugini-cream hover:bg-cugini-green/20 text-cugini-dark text-lg leading-none disabled:opacity-50"
                            aria-label={`Disminuir ${r.name}`}
                          >
                            –
                          </button>
                          <span className="min-w-6 text-center font-semibold">{qty}</span>
                          <button
                            onClick={() => incQty(r.id)}
                            disabled={redeeming}
                            className="w-9 h-9 rounded-lg bg-cugini-cream hover:bg-cugini-green/20 text-cugini-dark text-lg leading-none disabled:opacity-50"
                            aria-label={`Aumentar ${r.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* --- TILE DECORATIVO (ajustado) --- */}
<div
  aria-hidden="true"
  className="rounded-2xl border border-cugini-dark/10 bg-white shadow-sm overflow-hidden flex flex-col items-center justify-center pointer-events-none select-none"
>
  <div className="relative flex items-center justify-center w-full h-44">
    <img
      src="/brand/walker.png"  // ← o la imagen que prefieras
      alt=""
      className="h-40 w-auto object-contain opacity-40 scale-110 transform"
      loading="lazy"
    />
  </div>
  <div className="pb-4">
    <p className="text-center text-base font-bold text-cugini-green">
      Cugini Pizza
    </p>
  </div>
</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}