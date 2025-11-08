'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AuthPage() {
  const searchParams = useSearchParams();

  // ---------- ESTADOS REGISTRO ----------
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // ---------- ESTADOS LOGIN ----------
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ---------- RESET ----------
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);

  // Pantallas intermedias
  const [checkEmailMode, setCheckEmailMode] = useState(false); // verificación de signup
  const [pendingEmail, setPendingEmail] = useState('');
  const [resetEmailMode, setResetEmailMode] = useState(false); // NUEVO: “te enviamos el enlace”
  const [pendingResetEmail, setPendingResetEmail] = useState('');

  // ---------- GENERALES ----------
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Evitar redirección automática al /app cuando venimos con recovery
  const arrivingFromRecoveryRef = useRef(false);

  // URL base para los redirects
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const authRedirect = `${origin}/auth`;

  /**
   * Sincroniza/crea profiles con metadata (se usa post-signup verificado y al iniciar sesión).
   */
  async function ensureProfileFromAuth() {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return;

    const meta = (user.user_metadata ?? {}) as Record<string, any>;
    const metaName = (meta.full_name ?? '').toString().trim();
    const metaPhone = (meta.phone ?? '').toString().trim();

    const { error: upErr } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          full_name: metaName || null,
          phone: metaPhone || null,
        },
        { onConflict: 'user_id' }
      );

    if (upErr) console.warn('[profiles upsert after auth]', upErr.message);
  }

  /**
   * Parsea el hash que envía Supabase en magic/recovery links.
   */
  function parseHash() {
    if (typeof window === 'undefined' || !window.location.hash) return new URLSearchParams();
    return new URLSearchParams(window.location.hash.slice(1));
  }

  // 1) Detectar si viene desde enlace de correo (signup o recovery)
  useEffect(() => {
    const fromQueryRecovery = searchParams.get('type') === 'recovery';
    const hashParams = parseHash();
    const typeFromHash = hashParams.get('type');

    // Si es recovery: NO redirigir al /app, y levantar la sesión con los tokens del hash
    if (fromQueryRecovery || typeFromHash === 'recovery') {
      arrivingFromRecoveryRef.current = true;

      const access_token = hashParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token');

      (async () => {
        try {
          // Si vienen tokens en el hash, establece la sesión para poder cambiar contraseña
          if (access_token && refresh_token) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setErr) console.warn('setSession (recovery) error:', setErr.message);
          }
        } finally {
          setIsResetFlow(true);
          setMessage('Escribe tu nueva contraseña para tu cuenta de Cugini Pizzas.');
          // Limpia el hash para que no “parpadee” al refrescar
          if (typeof window !== 'undefined') {
            history.replaceState(null, '', window.location.pathname);
          }
        }
      })();

      return; // no procesar “signup” si ya estamos en recovery
    }

    // Si viene de verificación (signup), sincroniza profile y avisa
    if (typeFromHash === 'signup') {
      (async () => {
        try {
          await ensureProfileFromAuth();
          setMessage('✅ Tu correo fue verificado. Ahora puedes iniciar sesión.');
        } finally {
          if (typeof window !== 'undefined') {
            history.replaceState(null, '', window.location.pathname);
          }
        }
      })();
    }
  }, [searchParams]);

  // 2) Redirección automática al /app solo si NO estamos en flujo de recovery
  useEffect(() => {
    (async () => {
      if (arrivingFromRecoveryRef.current) return; // no redirigir, estamos en reset
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        window.location.href = '/app';
      }
    })();
  }, []);

  // -----------------------------
  // REGISTRO (con verificación por correo)
  // -----------------------------
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!regFullName.trim()) {
      setMessage('⚠️ Debes ingresar tu nombre completo.');
      return;
    }
    const phone = regPhone.trim();
    const phoneRegex = /^\+56\s?9\d{8}$/; // +56 9XXXXXXXX
    if (!phoneRegex.test(phone)) {
      setMessage('⚠️ El número debe tener el formato +56 912345678');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setMessage('⚠️ Las contraseñas no coinciden.');
      return;
    }
    if (regPassword.length < 8) {
      setMessage('⚠️ La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/\d/.test(regPassword)) {
      setMessage('⚠️ La contraseña debe incluir al menos un número.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        emailRedirectTo: authRedirect, // volverá a /auth tras verificar
        data: {
          full_name: regFullName.trim(),
          phone: phone,
        },
      },
    });
    setIsLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setMessage('⚠️ Ya existe una cuenta con este correo.');
      } else {
        setMessage('❌ Error al crear la cuenta: ' + error.message);
      }
      return;
    }

    setPendingEmail(regEmail);
    setCheckEmailMode(true);
    setMessage(
      'Te enviamos un enlace para verificar tu cuenta. Abre tu correo y sigue las instrucciones.'
    );
  }

  // Reenviar verificación
  async function handleResendVerification() {
    setMessage(null);
    if (!pendingEmail) {
      setMessage('Ingresa un correo para reenviar la verificación.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingEmail,
      options: { emailRedirectTo: authRedirect },
    });
    setIsLoading(false);
    if (error) {
      setMessage('❌ No se pudo reenviar: ' + error.message);
    } else {
      setMessage('📩 Te reenviamos el correo de verificación.');
    }
  }

  // -----------------------------
  // LOGIN
  // -----------------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setIsLoading(false);

    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setMessage('⚠️ Debes verificar tu correo antes de iniciar sesión.');
        setPendingEmail(loginEmail);
        setCheckEmailMode(true);
      } else {
        setMessage('❌ Error al iniciar sesión: ' + error.message);
      }
      return;
    }

    if (data?.user) {
      await ensureProfileFromAuth();
      window.location.href = '/app';
    } else {
      setMessage('⚠️ Inicia sesión nuevamente.');
    }
  }

  // -----------------------------
  // PEDIR CORREO PARA RESET
  // -----------------------------
  async function handleResetPasswordRequest(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: authRedirect, // el link volverá a /auth con #type=recovery...
    });

    setIsLoading(false);

    if (error) {
      setMessage('❌ Error al enviar el correo: ' + error.message);
    } else {
      // NUEVO: pantalla dedicada de “te enviamos el enlace”
      setPendingResetEmail(resetEmail);
      setResetEmailMode(true);
      setShowResetRequest(false);
      setMessage(
        'Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.'
      );
    }
  }

  // -----------------------------
  // CAMBIAR CONTRASEÑA (después del correo)
  // -----------------------------
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== newPassword2) {
      setMessage('⚠️ Las contraseñas no coinciden.');
      return;
    }
    if (newPassword.length < 8) {
      setMessage('⚠️ La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setIsLoading(false);

    if (error) {
      setMessage('❌ No se pudo actualizar la contraseña: ' + error.message);
    } else {
      setMessage('✅ Tu contraseña fue actualizada. Ahora puedes iniciar sesión.');
      setIsResetFlow(false);
      setShowResetRequest(false);
    }
  }

  // ============= RENDER =============

  // 1) Pantalla “Revisa tu correo” (signup)
  if (checkEmailMode && !isResetFlow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm space-y-3">
          <h2 className="text-2xl font-bold text-green-700 text-center">Revisa tu correo</h2>
          <p className="text-sm text-slate-600">
            Te enviamos un enlace de verificación a{' '}
            <span className="font-semibold">{pendingEmail}</span>. Abre el correo y haz clic en el
            enlace para activar tu cuenta.
          </p>

          <button
            onClick={handleResendVerification}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            {isLoading ? 'Enviando…' : 'Reenviar correo de verificación'}
          </button>

          <button
            onClick={() => {
              setCheckEmailMode(false);
              setMessage(null);
            }}
            className="w-full bg-slate-100 text-slate-700 py-2 rounded hover:bg-slate-200 text-sm"
          >
            Volver
          </button>

          {message && (
            <p className="mt-1 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 2) Pantalla “Te enviamos el enlace para restablecer” (password reset) — NUEVO
  if (resetEmailMode && !isResetFlow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm space-y-3">
          <h2 className="text-2xl font-bold text-green-700 text-center">Revisa tu correo</h2>
          <p className="text-sm text-slate-600">
            Te enviamos un enlace para restablecer tu contraseña a{' '}
            <span className="font-semibold">{pendingResetEmail}</span>. Abre el correo y sigue las
            instrucciones.
          </p>

          <button
            onClick={() => {
              setResetEmailMode(false);
              setMessage(null);
            }}
            className="w-full bg-slate-100 text-slate-700 py-2 rounded hover:bg-slate-200 text-sm"
          >
            Volver al inicio de sesión
          </button>

          {message && (
            <p className="mt-1 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3) UI principal (login/registro o cambio de contraseña si isResetFlow)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center text-green-700">Cugini Pizzas 🍕</h2>

        {isResetFlow ? (
          // MODO: VIENE DEL CORREO (reset)
          <form onSubmit={handleChangePassword} className="space-y-3">
            <p className="text-sm text-slate-600">Ingresa tu nueva contraseña.</p>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="password"
              placeholder="Repetir nueva contraseña"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {isLoading ? 'Guardando...' : 'Guardar nueva contraseña'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsResetFlow(false);
                setShowResetRequest(false);
                setMessage(null);
              }}
              className="w-full bg-slate-100 text-slate-700 py-2 rounded hover:bg-slate-200 text-sm"
            >
              Volver al inicio de sesión
            </button>
            {message && (
              <p className="mt-2 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
                {message}
              </p>
            )}
          </form>
        ) : !showResetRequest ? (
          <>
            {/* REGISTRO */}
            <form onSubmit={handleSignUp} className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Nombre completo"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Número de WhatsApp"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-slate-400 ml-1">Ejemplo: +56 912345678</p>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Repetir contraseña"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            {/* LOGIN */}
            <form onSubmit={handleLogin} className="space-y-3">
              <h3 className="text-center text-slate-600 text-sm mb-1">¿Ya tienes cuenta?</h3>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-700 text-white py-2 rounded hover:bg-slate-800"
              >
                {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
              <p
                onClick={() => setShowResetRequest(true)}
                className="text-xs text-center text-blue-600 mt-2 cursor-pointer hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </p>
            </form>

            {message && (
              <p className="mt-4 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
                {message}
              </p>
            )}
          </>
        ) : (
          // MODO: pedir correo para reset
          <form onSubmit={handleResetPasswordRequest} className="space-y-3">
            <p className="text-sm text-slate-600">
              Ingresa tu correo y te enviaremos un enlace.
            </p>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {isLoading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <p
              onClick={() => setShowResetRequest(false)}
              className="text-xs text-center text-blue-600 mt-2 cursor-pointer hover:underline"
            >
              Volver
            </p>
            {message && (
              <p className="mt-2 text-center text-sm text-slate-700 bg-slate-50 p-2 rounded">
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
