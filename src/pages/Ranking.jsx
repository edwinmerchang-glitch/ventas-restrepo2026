import { useEffect, useMemo, useState } from 'react'
import { supabase, DEPARTAMENTOS, fmt, hoyISO, totalVenta } from '../lib/supabase'
import { Cargando, Aviso, InsigniaCargo } from '../components/UI'

const PERIODOS = ['Este mes', 'Mes anterior', 'Esta semana', 'Este trimestre', 'Este año', 'Todo']

function rangoPeriodo(p) {
  const hoy = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  switch (p) {
    case 'Este mes': return [iso(inicioMes), hoyISO()]
    case 'Mes anterior': {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return [iso(ini), iso(fin)]
    }
    case 'Esta semana': {
      const dia = (hoy.getDay() + 6) % 7 // lunes = 0
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - dia)
      return [iso(ini), hoyISO()]
    }
    case 'Este trimestre': {
      const ini = new Date(hoy.getFullYear(), Math.floor(hoy.getMonth() / 3) * 3, 1)
      return [iso(ini), hoyISO()]
    }
    case 'Este año': return [`${hoy.getFullYear()}-01-01`, hoyISO()]
    default: return ['2000-01-01', hoyISO()]
  }
}

const medalla = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`)

export default function Ranking() {
  const [periodo, setPeriodo] = useState('Este mes')
  const [depto, setDepto] = useState('Todos')
  const [empleados, setEmpleados] = useState(null)
  const [ventas, setVentas] = useState([])

  useEffect(() => {
    const cargar = async () => {
      setEmpleados(null)
      const [ini, fin] = rangoPeriodo(periodo)
      let qe = supabase.from('employees').select('*')
      if (depto !== 'Todos') qe = qe.eq('department', depto)
      const [{ data: emps }, { data: vts }] = await Promise.all([
        qe,
        supabase.from('sales').select('employee_id, date, autoliquidable, oferta, marca, adicional')
          .gte('date', ini).lte('date', fin),
      ])
      setEmpleados(emps ?? [])
      setVentas(vts ?? [])
    }
    cargar()
  }, [periodo, depto])

  const filas = useMemo(() => {
    if (!empleados) return null
    const porEmp = {}
    ventas.forEach((v) => {
      const acc = porEmp[v.employee_id] || { total: 0, dias: new Set() }
      acc.total += totalVenta(v)
      acc.dias.add(v.date)
      porEmp[v.employee_id] = acc
    })
    return empleados
      .map((e) => ({
        ...e,
        total: porEmp[e.id]?.total || 0,
        dias: porEmp[e.id]?.dias.size || 0,
      }))
      .sort((a, b) => b.total - a.total)
  }, [empleados, ventas])

  const maximo = filas?.[0]?.total || 1

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Equipo</div>
        <h1>Ranking de ventas</h1>
        <p>Posiciones del equipo según unidades vendidas en el período.</p>
      </header>

      <div className="tarjeta">
        <div className="fila-campos">
          <label className="campo">
            <span className="nombre-campo">Período</span>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {PERIODOS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="campo">
            <span className="nombre-campo">Departamento</span>
            <select value={depto} onChange={(e) => setDepto(e.target.value)}>
              <option>Todos</option>
              {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        </div>
      </div>

      {!filas ? (
        <Cargando texto="Calculando ranking…" />
      ) : filas.length === 0 ? (
        <Aviso tipo="info">No hay empleados registrados en este departamento.</Aviso>
      ) : (
        <div className="tarjeta">
          <div className="tarjeta-titulo">Posiciones · {periodo}</div>
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Pos.</th>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th className="numero">Días activos</th>
                  <th className="numero">Total</th>
                  <th style={{ minWidth: 140 }}>Frente al líder</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id}>
                    <td><span className="medalla">{medalla(i)}</span></td>
                    <td>
                      <strong>{f.name}</strong>
                      <div className="texto-suave">{f.department}</div>
                    </td>
                    <td><InsigniaCargo cargo={f.position} /></td>
                    <td className="numero">{f.dias}</td>
                    <td className="numero"><strong>{fmt(f.total)}</strong></td>
                    <td>
                      <div className="barra-ranking">
                        <div style={{ width: `${(f.total / maximo) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
