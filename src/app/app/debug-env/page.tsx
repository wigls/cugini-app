'use client'

export default function DebugEnvPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        background: '#f5f5f5',
        fontFamily: 'monospace',
      }}
    >
      <h1>🔍 DEBUG ENV (solo para pruebas)</h1>
      <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {url || '❌ no definida'}</p>
      <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {key ? '✅ existe' : '❌ no definida'}</p>
      <p style={{ marginTop: '1rem', color: '#888' }}>
        *Si alguno sale ❌, revisa tus variables en Vercel &gt; Settings &gt; Environment Variables.
      </p>
    </div>
  )
}
