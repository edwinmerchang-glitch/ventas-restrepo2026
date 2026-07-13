import { useState } from 'react'
import { supabase, usernameToEmail } from '../lib/supabase'

export default function Login() {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const ingresar = async (e) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    const email = usuario.includes('@') ? usuario.trim() : usernameToEmail(usuario)
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error) {
      setError('Usuario o contraseña incorrectos.')
      setCargando(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--fondo)',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{
        width: 72, height: 72,
        borderRadius: 22,
        background: 'var(--verde-600)',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 20,
        boxShadow: '0 6px 24px rgba(14,124,107,0.28)',
      }}>
        <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '1.5rem', color: '#fff' }}>VA</span>
      </div>

      {/* Título */}
      <h1 style={{ fontSize: '1.55rem', fontWeight: 800, marginBottom: 4, textAlign: 'center' }}>
        Ventas AIS
      </h1>
      <p style={{ color: 'var(--tinta-2)', marginBottom: 32, fontSize: '0.9rem', textAlign: 'center' }}>
        Seguimiento de ventas y afiliaciones · Sede Restrepo
      </p>

      {/* Caja del formulario */}
      <form
        onSubmit={ingresar}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--superficie)',
          border: '1px solid var(--borde)',
          borderRadius: 18,
          padding: '28px 28px 24px',
          boxShadow: '0 4px 24px rgba(11,46,41,0.08)',
        }}
      >
        {error && (
          <div style={{
            background: 'var(--rojo-suave)',
            border: '1px solid #F0C4C4',
            color: '#9E2F2F',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: '0.86rem',
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <label className="campo">
          <span className="nombre-campo">Usuario</span>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Tu usuario"
            autoComplete="username"
            autoFocus
            required
          />
        </label>

        <label className="campo">
          <span className="nombre-campo">Contraseña</span>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        <button
          className="boton boton-primario boton-bloque"
          style={{ marginTop: 8, padding: '13px', fontSize: '0.95rem', borderRadius: 12 }}
          disabled={cargando}
        >
          {cargando ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>

      <p style={{ marginTop: 28, fontSize: '0.75rem', color: 'var(--tinta-3)', textAlign: 'center' }}>
        © 2026 Edwin Merchán · Locatel Restrepo
      </p>
    </div>
  )
}
