// ⛔️ No pongas 'use client' aquí
export default function DebugEnv() {
  return (
    <pre style={{padding:16, background:'#111', color:'#0f0', overflow:'auto'}}>
{`DEBUG ENV (solo para pruebas):
NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || '—'}
NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0,8) || '—'}... (oculto)
`}
    </pre>
  )
}
