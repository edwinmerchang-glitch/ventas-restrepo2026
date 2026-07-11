import { useEffect, useState } from 'react'
import { supabase, CARGOS, DEPARTAMENTOS, fmt } from '../lib/supabase'
import { Aviso, Cargando, InsigniaCargo } from '../components/UI'

const NUEVO = {
  name: '', position: CARGOS[0], department: DEPARTAMENTOS[0],
  goal: 300, meta_afiliaciones: 50,
}

export default function AdminEmpleados() {
  const [empleados, setEmpleados] = useState(null)
  const [form, setForm] = useState(NUEVO)
  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { data } = await supabase.from('employees').select('*').order('name')
    setEmpleados(data ?? [])
  }

  useEffect(() => { cargar() }, [])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    const payload = {
      name: form.name.trim(),
      position: form.position,
      department: form.department,
      goal: Number(form.goal) || 0,
      meta_afiliaciones: Number(form.meta_afiliaciones) || 0,
    }
    const { error } = editandoId
      ? await supabase.from('employees').update(payload).eq('id', editandoId)
      : await supabase.from('employees').insert(payload)
    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: editandoId ? 'Empleado actualizado.' : `Empleado ${payload.name} creado. Ahora puedes crearle un usuario en la sección Usuarios.` })
      setForm(NUEVO)
      setEditandoId(null)
      cargar()
    }
    setGuardando(false)
  }

  const editar = (emp) => {
    setEditandoId(emp.id)
    setForm({
      name: emp.name, position: emp.position || CARGOS[0],
      department: emp.department || DEPARTAMENTOS[0],
      goal: emp.goal, meta_afiliaciones: emp.meta_afiliaciones,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const eliminar = async (emp) => {
    if (!window.confirm(`¿Eliminar a ${emp.name}? Se borrarán también sus ventas y afiliaciones. Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('employees').delete().eq('id', emp.id)
    if (error) setMensaje({ tipo: 'error', texto: `No se pudo eliminar: ${error.message}` })
    else { setMensaje({ tipo: 'exito', texto: `${emp.name} eliminado.` }); cargar() }
  }

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Administración</div>
        <h1>Empleados</h1>
        <p>Crea y administra el equipo, sus cargos y sus metas mensuales.</p>
      </header>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <form className="tarjeta" onSubmit={guardar}>
        <div className="tarjeta-titulo">{editandoId ? 'Editar empleado' : 'Nuevo empleado'}</div>
        <div className="fila-campos">
          <label className="campo">
            <span className="nombre-campo">Nombre completo</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="campo">
            <span className="nombre-campo">Cargo</span>
            <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              {CARGOS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="campo">
            <span className="nombre-campo">Departamento</span>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="campo">
            <span className="nombre-campo">Meta mensual de ventas</span>
            <input type="number" min="0" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </label>
          <label className="campo">
            <span className="nombre-campo">Meta mensual de afiliaciones</span>
            <input type="number" min="0" value={form.meta_afiliaciones} onChange={(e) => setForm({ ...form, meta_afiliaciones: e.target.value })} />
          </label>
        </div>
        <div className="fila">
          <button className="boton boton-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : 'Crear empleado'}
          </button>
          {editandoId && (
            <button type="button" className="boton boton-secundario" onClick={() => { setEditandoId(null); setForm(NUEVO) }}>
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <div className="tarjeta">
        <div className="tarjeta-titulo">Equipo ({empleados?.length ?? 0})</div>
        {!empleados ? (
          <Cargando />
        ) : empleados.length === 0 ? (
          <Aviso tipo="info">Aún no hay empleados. Crea el primero con el formulario de arriba.</Aviso>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cargo</th>
                  <th>Departamento</th>
                  <th className="numero">Meta ventas</th>
                  <th className="numero">Meta afil.</th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((emp) => (
                  <tr key={emp.id}>
                    <td><strong>{emp.name}</strong></td>
                    <td><InsigniaCargo cargo={emp.position} /></td>
                    <td>{emp.department}</td>
                    <td className="numero">{fmt(emp.goal)}</td>
                    <td className="numero">{fmt(emp.meta_afiliaciones)}</td>
                    <td>
                      {emp.user_id
                        ? <span className="insignia insignia-equipos">Vinculado</span>
                        : <span className="insignia insignia-neutra">Sin usuario</span>}
                    </td>
                    <td>
                      <div className="fila" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <button className="boton boton-secundario" style={{ padding: '6px 12px' }} onClick={() => editar(emp)}>Editar</button>
                        <button className="boton boton-peligro" style={{ padding: '6px 12px' }} onClick={() => eliminar(emp)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
