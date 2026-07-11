import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase, fmt } from '../lib/supabase'
import { Aviso, InsigniaCargo } from '../components/UI'

export default function Perfil() {
  const { profile, employee, isAdmin } = useAuth()
  const [nueva, setNueva] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiarClave = async (e) => {
    e.preventDefault()
    setMensaje(null)
    if (nueva.length < 8) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    if (nueva !== confirma) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
      return
    }
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: nueva })
    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo actualizar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada correctamente.' })
      setNueva('')
      setConfirma('')
    }
    setGuardando(false)
  }

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Cuenta</div>
        <h1>Mi perfil</h1>
        <p>Tus datos de trabajo y la administración de tu contraseña.</p>
      </header>

      <div className="tarjeta">
        <div className="tarjeta-titulo">Datos</div>
        <div className="fila" style={{ gap: 24 }}>
          <div>
            <div className="texto-suave">Usuario</div>
            <strong>{profile?.username}</strong>
          </div>
          <div>
            <div className="texto-suave">Rol</div>
            <span className={`insignia ${isAdmin ? 'insignia-admin' : 'insignia-neutra'}`}>
              {isAdmin ? 'Administrador' : 'Empleado'}
            </span>
          </div>
          {employee && (
            <>
              <div>
                <div className="texto-suave">Nombre</div>
                <strong>{employee.name}</strong>
              </div>
              <div>
                <div className="texto-suave">Cargo</div>
                <InsigniaCargo cargo={employee.position} />
              </div>
              <div>
                <div className="texto-suave">Meta de ventas</div>
                <strong>{fmt(employee.goal)}</strong>
              </div>
              <div>
                <div className="texto-suave">Meta de afiliaciones</div>
                <strong>{fmt(employee.meta_afiliaciones)}</strong>
              </div>
            </>
          )}
        </div>
      </div>

      <form className="tarjeta" onSubmit={cambiarClave} style={{ maxWidth: 480 }}>
        <div className="tarjeta-titulo">Cambiar contraseña</div>
        {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
        <label className="campo">
          <span className="nombre-campo">Nueva contraseña (mínimo 8 caracteres)</span>
          <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" required />
        </label>
        <label className="campo">
          <span className="nombre-campo">Confirmar contraseña</span>
          <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" required />
        </label>
        <button className="boton boton-primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </>
  )
}
