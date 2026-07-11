import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase, CATEGORIAS, fmt, hoyISO, fechaLarga, totalVenta } from '../lib/supabase'
import { AnilloMeta, Aviso, InsigniaCargo, Progreso } from '../components/UI'

const VACIO = { autoliquidable: 0, oferta: 0, marca: 0, adicional: 0 }

export default function RegistrarVentas() {
  const { employee } = useAuth()
  const [fecha, setFecha] = useState(hoyISO())
  const [valores, setValores] = useState(VACIO)
  const [existente, setExistente] = useState(null)
  const [ventasMes, setVentasMes] = useState(0)
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    if (!employee) return
    const mes = fecha.slice(0, 7)
    const [{ data: reg }, { data: delMes }] = await Promise.all([
      supabase.from('sales').select('*')
        .eq('employee_id', employee.id).eq('date', fecha).maybeSingle(),
      supabase.from('sales').select('autoliquidable, oferta, marca, adicional')
        .eq('employee_id', employee.id)
        .gte('date', `${mes}-01`).lte('date', `${mes}-31`),
    ])
    setExistente(reg ?? null)
    setValores(reg ? {
      autoliquidable: reg.autoliquidable, oferta: reg.oferta,
      marca: reg.marca, adicional: reg.adicional,
    } : VACIO)
    setVentasMes((delMes ?? []).reduce((s, r) => s + totalVenta(r), 0))
  }

  useEffect(() => { cargar() }, [employee, fecha])

  const totalDia = useMemo(() => totalVenta(valores), [valores])

  const mesProyectado = useMemo(() => {
    const previo = existente ? totalVenta(existente) : 0
    return ventasMes - previo + totalDia
  }, [ventasMes, existente, totalDia])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('sales').upsert(
      { employee_id: employee.id, date: fecha, ...valores },
      { onConflict: 'employee_id,date' }
    )
    if (error) {
      setMensaje({ tipo: 'error', texto: `No se pudo guardar: ${error.message}` })
    } else {
      const cumplioMeta = mesProyectado >= employee.goal && ventasMes < employee.goal
      setMensaje({
        tipo: 'exito',
        texto: cumplioMeta
          ? `🎉 ¡Felicitaciones! Con este registro superaste tu meta mensual de ${fmt(employee.goal)} unidades.`
          : `Ventas del ${fechaLarga(fecha)} guardadas correctamente.`,
      })
      cargar()
    }
    setGuardando(false)
  }

  if (!employee) {
    return (
      <Aviso tipo="error">
        Tu usuario no tiene un empleado asociado. Pide al administrador que te vincule
        desde la sección <strong>Empleados</strong>.
      </Aviso>
    )
  }

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Registro diario</div>
        <h1>Registrar ventas</h1>
        <p>Ingresa las unidades vendidas del día. Si el día ya tiene registro, lo editas aquí mismo.</p>
      </header>

      <div className="tarjeta">
        <div className="fila entre">
          <div>
            <h3>{employee.name}</h3>
            <div className="fila" style={{ marginTop: 6 }}>
              <InsigniaCargo cargo={employee.position} />
              <span className="insignia insignia-neutra">{employee.department}</span>
              <span className="texto-suave">Meta mensual: <strong>{fmt(employee.goal)}</strong> unidades</span>
            </div>
          </div>
          <AnilloMeta actual={mesProyectado} meta={employee.goal} etiqueta="meta del mes" />
        </div>
      </div>

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}

      <form className="tarjeta" onSubmit={guardar}>
        <div className="tarjeta-titulo">Ventas del día</div>

        <div className="fila-campos" style={{ maxWidth: 420 }}>
          <label className="campo">
            <span className="nombre-campo">Fecha del registro</span>
            <input
              type="date"
              value={fecha}
              max={hoyISO()}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </label>
        </div>

        {existente && (
          <Aviso tipo="info">
            Ya registraste ventas para esta fecha. Estás <strong>editando</strong> ese registro.
          </Aviso>
        )}

        <div className="fila-campos">
          {CATEGORIAS.map((c) => (
            <label className="campo" key={c.key}>
              <span className="nombre-campo" style={{ color: c.color }}>{c.label}</span>
              <input
                type="number"
                min="0"
                step="1"
                value={valores[c.key]}
                onChange={(e) =>
                  setValores((v) => ({ ...v, [c.key]: Math.max(0, parseInt(e.target.value || '0', 10)) }))
                }
              />
            </label>
          ))}
        </div>

        <Progreso
          actual={mesProyectado}
          meta={employee.goal}
          titulo={`Progreso mensual con este registro (día: ${fmt(totalDia)} unidades)`}
        />

        <button className="boton boton-primario boton-bloque" disabled={guardando}>
          {guardando ? 'Guardando…' : existente ? 'Actualizar registro' : 'Guardar ventas'}
        </button>
      </form>
    </>
  )
}
