import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase, fmt, hoyISO, primerDiaMesISO, fechaLarga } from '../lib/supabase'
import { AnilloMeta, Aviso, Cargando, Progreso } from '../components/UI'

export default function Afiliaciones() {
  const { employee, isAdmin } = useAuth()
  const [fecha, setFecha] = useState(hoyISO())
  const [cantidad, setCantidad] = useState(1)
  const [existente, setExistente] = useState(null)
  const [delMes, setDelMes] = useState(0)
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Resumen del equipo (visible para todos; edición solo propia)
  const [resumen, setResumen] = useState(null)

  const cargarPropias = async () => {
    if (!employee) return
    const mes = fecha.slice(0, 7)
    const [{ data: reg }, { data: mesData }] = await Promise.all([
      supabase.from('afiliaciones').select('*')
        .eq('employee_id', employee.id).eq('fecha', fecha).maybeSingle(),
      supabase.from('afiliaciones').select('cantidad')
        .eq('employee_id', employee.id)
        .gte('fecha', `${mes}-01`).lte('fecha', `${mes}-31`),
    ])
    setExistente(reg ?? null)
    setCantidad(reg ? reg.cantidad : 1)
    setDelMes((mesData ?? []).reduce((s, r) => s + r.cantidad, 0))
  }

  useEffect(() => { cargarPropias() }, [employee, fecha])

  useEffect(() => {
    const cargarResumen = async () => {
      const [{ data: emps }, { data: afil }] = await Promise.all([
        supabase.from('employees').select('id, name, department, meta_afiliaciones'),
        supabase.from('afiliaciones').select('employee_id, cantidad')
          .gte('fecha', primerDiaMesISO()).lte('fecha', hoyISO()),
      ])
      const porEmp = {}
      ;(afil ?? []).forEach((a) => {
        porEmp[a.employee_id] = (porEmp[a.employee_id] || 0) + a.cantidad
      })
      setResumen(
        (emps ?? [])
          .map((e) => ({ ...e, total: porEmp[e.id] || 0 }))
          .sort((a, b) => b.total - a.total)
      )
    }
    cargarResumen()
  }, [mensaje])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('afiliaciones').upsert(
      { employee_id: employee.id, fecha, cantidad },
      { onConflict: 'employee_id,fecha' }
    )
    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo guardar: ${error.message}` })
    } else {
      setMensaje({ tipo: 'exito', texto: `Afiliaciones del ${fechaLarga(fecha)} guardadas.` })
      cargarPropias()
    }
    setGuardando(false)
  }

  const metaAfil = employee?.meta_afiliaciones || 50
  const mesProyectado = useMemo(
    () => delMes - (existente?.cantidad || 0) + cantidad,
    [delMes, existente, cantidad]
  )

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Mi trabajo</div>
        <h1>Afiliaciones</h1>
        <p>Registra las afiliaciones que lograste cada día y sigue el avance del equipo.</p>
      </header>

      {employee ? (
        <>
          {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

          <form className="tarjeta" onSubmit={guardar}>
            <div className="fila entre">
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="tarjeta-titulo">Registrar afiliaciones</div>
                <div className="fila-campos">
                  <label className="campo">
                    <span className="nombre-campo">Fecha</span>
                    <input type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} required />
                  </label>
                  <label className="campo">
                    <span className="nombre-campo">Cantidad de afiliaciones</span>
                    <input
                      type="number" min="0" step="1" value={cantidad}
                      onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value || '0', 10)))}
                    />
                  </label>
                </div>
                {existente && (
                  <Aviso tipo="info">
                    Ya tienes <strong>{existente.cantidad}</strong> afiliación(es) para esta fecha. Estás editando ese registro.
                  </Aviso>
                )}
                <Progreso actual={mesProyectado} meta={metaAfil} titulo="Progreso mensual con este registro" />
                <button className="boton boton-primario" disabled={guardando}>
                  {guardando ? 'Guardando…' : existente ? 'Actualizar registro' : 'Guardar afiliaciones'}
                </button>
              </div>
              <AnilloMeta actual={mesProyectado} meta={metaAfil} etiqueta="meta del mes" />
            </div>
          </form>
        </>
      ) : (
        !isAdmin && <Aviso tipo="error">Tu usuario no tiene un empleado asociado. Contacta al administrador.</Aviso>
      )}

      <div className="tarjeta">
        <div className="tarjeta-titulo">Afiliaciones del equipo · este mes</div>
        {!resumen ? (
          <Cargando texto="Cargando…" />
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Departamento</th>
                  <th className="numero">Afiliaciones</th>
                  <th className="numero">Meta</th>
                  <th className="numero">Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => {
                  const pct = r.meta_afiliaciones > 0 ? Math.round((r.total / r.meta_afiliaciones) * 100) : 0
                  return (
                    <tr key={r.id}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.department}</td>
                      <td className="numero">{fmt(r.total)}</td>
                      <td className="numero">{fmt(r.meta_afiliaciones)}</td>
                      <td className="numero">
                        <span className={pct >= 100 ? 'tendencia-sube' : pct < 60 ? 'tendencia-baja' : ''}>
                          {pct}%
                        </span>
                      </td>
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
