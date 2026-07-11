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
      setError('Usuario o contraseña incorrectos. Verifica e intenta de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div className="acceso">
      <section className="acceso-panel">
        <div>
          <div className="eyebrow" style={{ color: 'var(--ambar)' }}>Locatel Restrepo</div>
          <h1>Cada venta del equipo, registrada en segundos.</h1>
          <p className="lema">
            Plataforma de seguimiento de ventas y afiliaciones del equipo AIS:
            registra tu día, mide tu meta y sube en el ranking.
          </p>
        </div>
        <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>Sistema interno · Equipo Locatel Restrepo</p>
      </section>

      <section className="acceso-form">
        <form className="caja" onSubmit={ingresar}>
          <h2>Ingresar</h2>
          <p className="sub">Usa el usuario y la contraseña que te asignó el administrador.</p>

          {error && <div className="aviso aviso-error">{error}</div>}

          <label className="campo">
            <span className="nombre-campo">Usuario</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="ej. maria.gomez"
              autoComplete="username"
              required
            />
          </label>

          <label className="campo">
            <span className="nombre-campo">Contraseña</span>
            <input
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button className="boton boton-primario boton-bloque" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}
