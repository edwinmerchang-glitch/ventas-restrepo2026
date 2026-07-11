import { useEffect, useState } from 'react'
import { supabase, supabaseSignup, usernameToEmail } from '../lib/supabase'
import { Aviso, Cargando } from '../components/UI'

export default function AdminUsuarios() {
  const [perfiles, setPerfiles] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [rol, setRol] = useState('empleado')
  const [empleadoId, setEmpleadoId] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const [{ data: profs }, { data: emps }] = await Promise.all([
      supabase.from('profiles').select('*').order('username'),
      supabase.from('employees').select('id, name, user_id').order('name'),
    ])
    setPerfiles(profs ?? [])
    setEmpleados(emps ?? [])
  }

  useEffect(() => { cargar() }, [])

  const crear = async (e) => {
    e.preventDefault()
    setMensaje(null)
    if (clave.length < 8) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
      return
    }
    setGuardando(true)

    const username = usuario.trim().toLowerCase().replace(/\s+/g, '.')
    const { data, error } = await supabaseSignup.auth.signUp({
      email: usernameToEmail(username),
      password: clave,
      options: { data: { username, role: rol } },
    })

    if (error) {
      setMensaje({
        tipo: 'error',
        texto: error.message.includes('already registered')
          ? `El usuario "${username}" ya existe.`
          : `No se pudo crear: ${error.message}`,
      })
      setGuardando(false)
      return
    }

    // Vincular con el empleado seleccionado
    if (empleadoId && data?.user?.id) {
      const { error: linkErr } = await supabase
        .from('employees')
        .update({ user_id: data.user.id })
        .eq('id', Number(empleadoId))
      if (linkErr) {
        setMensaje({ tipo: 'ambar', texto: `Usuario creado, pero no se pudo vincular al empleado: ${linkErr.message}` })
        setGuardando(false)
        cargar()
        return
      }
    }

    setMensaje({
      tipo: 'exito',
      texto: `Usuario "${username}" creado. Entrégale sus credenciales: usuario ${username} y la contraseña que definiste.`,
    })
    setUsuario(''); setClave(''); setEmpleadoId(''); setRol('empleado')
    cargar()
    setGuardando(false)
  }

  const empleadosSinUsuario = empleados.filter((e) => !e.user_id)

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Administración</div>
        <h1>Usuarios</h1>
        <p>Crea las cuentas de acceso del equipo y vincúlalas a cada empleado.</p>
      </header>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <form className="tarjeta" onSubmit={crear}>
        <div className="tarjeta-titulo">Nuevo usuario</div>
        <div className="fila-campos">
          <label className="campo">
            <span className="nombre-campo">Nombre de usuario (ej. maria.gomez)</span>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required />
          </label>
          <label className="campo">
            <span className="nombre-campo">Contraseña inicial (mínimo 8 caracteres)</span>
            <input type="text" value={clave} onChange={(e) => setClave(e.target.value)} required />
          </label>
          <label className="campo">
            <span className="nombre-campo">Rol</span>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="empleado">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label className="campo">
            <span className="nombre-campo">Vincular al empleado</span>
            <select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)}>
              <option value="">— Sin vincular —</option>
              {empleadosSinUsuario.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
        </div>
        <Aviso tipo="info">
          Primero crea el empleado en la sección <strong>Empleados</strong> y luego créale aquí su
          usuario vinculado, para que sus ventas queden asociadas correctamente.
        </Aviso>
        <button className="boton boton-primario" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear usuario'}
        </button>
      </form>

      <div className="tarjeta">
        <div className="tarjeta-titulo">Usuarios registrados ({perfiles?.length ?? 0})</div>
        {!perfiles ? (
          <Cargando />
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Empleado vinculado</th>
                  <th>Creado</th>
                </tr>
              </thead>
              <tbody>
                {perfiles.map((p) => {
                  const emp = empleados.find((e) => e.user_id === p.id)
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.username}</strong></td>
                      <td>
                        <span className={`insignia ${p.role === 'admin' ? 'insignia-admin' : 'insignia-neutra'}`}>
                          {p.role === 'admin' ? 'Administrador' : 'Empleado'}
                        </span>
                      </td>
                      <td>{emp ? emp.name : <span className="texto-suave">—</span>}</td>
                      <td className="texto-suave">{new Date(p.created_at).toLocaleDateString('es-CO')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
