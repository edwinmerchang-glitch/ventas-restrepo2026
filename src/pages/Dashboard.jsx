import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
  ComposedChart, Line, ReferenceLine, LabelList,
} from 'recharts'
import { supabase, DEPARTAMENTOS, DEPT_COLORS, CATEGORIAS, fmt, hoyISO, primerDiaMesISO, totalVenta } from '../lib/supabase'
import { Kpi, Cargando, Aviso } from '../components/UI'

const NOMBRES_SERIES = {
  autoliquidable: 'Autoliquidable', oferta: 'Oferta', marca: 'Marca propia',
  adicional: 'Adicional', acumulado: 'Acumulado', total: 'Total',
}

export default function Dashboard() {
  const [desde, setDesde] = useState(primerDiaMesISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [depto, setDepto] = useState('Todos')
  const [filas, setFilas] = useState(null)
  const [filasAnt, setFilasAnt] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [empleadoSel, setEmpleadoSel] = useState('')

  useEffect(() => {
    supabase.from('employees').select('id, name, department, goal').order('name')
      .then(({ data }) => setEmpleados(data ?? []))
  }, [])

  useEffect(() => {
    const cargar = async () => {
      setFilas(null)
      let q = supabase
        .from('sales')
        .select('*, employees!inner(name, department, position)')
        .gte('date', desde)
        .lte('date', hasta)
      if (depto !== 'Todos') q = q.eq('employees.department', depto)
      const { data } = await q

      const d1 = new Date(desde), d2 = new Date(hasta)
      const dias = Math.round((d2 - d1) / 86400000)
      const finAnt = new Date(d1); finAnt.setDate(finAnt.getDate() - 1)
      const iniAnt = new Date(finAnt); iniAnt.setDate(iniAnt.getDate() - dias)
      const iso = (d) => d.toISOString().slice(0, 10)

      let qa = supabase
        .from('sales')
        .select('autoliquidable, oferta, marca, adicional, employees!inner(department)')
        .gte('date', iso(iniAnt))
        .lte('date', iso(finAnt))
      if (depto !== 'Todos') qa = qa.eq('employees.department', depto)
      const { data: ant } = await qa

      setFilas(data ?? [])
      setFilasAnt(ant ?? [])
    }
    cargar()
  }, [desde, hasta, depto])

  const stats = useMemo(() => {
    if (!filas) return null
    const total = filas.reduce((s, r) => s + totalVenta(r), 0)
    const totalAnt = filasAnt.reduce((s, r) => s + totalVenta(r), 0)
    const variacion = totalAnt > 0 ? ((total - totalAnt) / totalAnt) * 100 : null
    const empleadosActivos = new Set(filas.map((r) => r.employee_id)).size
    const diasActivos = new Set(filas.map((r) => r.date)).size
    const promedioDia = diasActivos > 0 ? Math.round(total / diasActivos) : 0

    const porDia = {}
    filas.forEach((r) => { porDia[r.date] = (porDia[r.date] || 0) + totalVenta(r) })
    const serieDias = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ dia: date.slice(8) + '/' + date.slice(5, 7), total }))

    const porDepto = {}
    filas.forEach((r) => {
      const d = r.employees.department
      porDepto[d] = (porDepto[d] || 0) + totalVenta(r)
    })
    const serieDepto = Object.entries(porDepto).map(([name, value]) => ({ name, value }))

    const porCategoria = CATEGORIAS.map((c) => ({
      name: c.label,
      value: filas.reduce((s, r) => s + (r[c.key] || 0), 0),
      color: c.color,
    }))

    return { total, totalAnt, variacion, empleadosActivos, promedioDia, serieDias, serieDepto, porCategoria }
  }, [filas, filasAnt])

  // ── Comparativo de todos los funcionarios ──────────────────────────
  const comparativo = useMemo(() => {
    if (!filas) return null
    const visibles = empleados.filter((e) => depto === 'Todos' || e.department === depto)
    const porEmp = {}
    filas.forEach((r) => {
      const acc = porEmp[r.employee_id] || { autoliquidable: 0, oferta: 0, marca: 0, adicional: 0 }
      acc.autoliquidable += r.autoliquidable || 0
      acc.oferta += r.oferta || 0
      acc.marca += r.marca || 0
      acc.adicional += r.adicional || 0
      porEmp[r.employee_id] = acc
    })
    return visibles
      .map((e) => {
        const c = porEmp[e.id] || { autoliquidable: 0, oferta: 0, marca: 0, adicional: 0 }
        return {
          id: e.id,
          nombre: e.name,
          depto: e.department,
          ...c,
          total: c.autoliquidable + c.oferta + c.marca + c.adicional,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filas, empleados, depto])

  // ── Serie diaria del funcionario seleccionado ──────────────────────
  const serieIndividual = useMemo(() => {
    if (!filas || !empleadoSel) return null
    const propias = filas
      .filter((r) => r.employee_id === Number(empleadoSel))
      .sort((a, b) => a.date.localeCompare(b.date))
    let acum = 0
    return propias.map((r) => {
      acum += totalVenta(r)
      return {
        dia: r.date.slice(8) + '/' + r.date.slice(5, 7),
        autoliquidable: r.autoliquidable || 0,
        oferta: r.oferta || 0,
        marca: r.marca || 0,
        adicional: r.adicional || 0,
        acumulado: acum,
      }
    })
  }, [filas, empleadoSel])

  const empSel = empleados.find((e) => e.id === Number(empleadoSel))

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Equipo</div>
        <h1>Dashboard de ventas</h1>
        <p>Panorama del equipo en el período seleccionado, con comparativo frente al período anterior.</p>
      </header>

      <div className="tarjeta">
        <div className="fila-campos">
          <label className="campo">
            <span className="nombre-campo">Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>
          <label className="campo">
            <span className="nombre-campo">Hasta</span>
            <input type="date" value={hasta} max={hoyISO()} onChange={(e) => setHasta(e.target.value)} />
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

      {!stats ? (
        <Cargando texto="Cargando ventas…" />
      ) : filas.length === 0 ? (
        <Aviso tipo="info">
          No hay ventas registradas en este período. Ajusta las fechas o el departamento para ver resultados.
        </Aviso>
      ) : (
        <>
          <div className="grid-kpi">
            <Kpi
              etiqueta="Ventas totales"
              valor={fmt(stats.total)}
              detalle={
                stats.variacion === null ? 'Sin datos del período anterior' : (
                  <span className={stats.variacion >= 0 ? 'tendencia-sube' : 'tendencia-baja'}>
                    {stats.variacion >= 0 ? '▲' : '▼'} {Math.abs(stats.variacion).toFixed(1)}% vs período anterior
                  </span>
                )
              }
            />
            <Kpi etiqueta="Período anterior" valor={fmt(stats.totalAnt)} detalle="Mismo número de días" color="azul" />
            <Kpi etiqueta="Promedio por día" valor={fmt(stats.promedioDia)} detalle="Unidades / día activo" color="ambar" />
            <Kpi etiqueta="Vendedores activos" valor={stats.empleadosActivos} detalle="Con registros en el período" color="morado" />
          </div>

          {/* ── Seguimiento por funcionario (gráfica principal) ── */}
          <div className="tarjeta">
            <div className="tarjeta-titulo">Seguimiento por funcionario</div>
            <div className="fila-campos" style={{ maxWidth: 420 }}>
              <label className="campo">
                <span className="nombre-campo">Funcionario</span>
                <select value={empleadoSel} onChange={(e) => setEmpleadoSel(e.target.value)}>
                  <option value="">Todos — comparativo del equipo</option>
                  {empleados
                    .filter((e) => depto === 'Todos' || e.department === depto)
                    .map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </label>
            </div>

            {!empleadoSel ? (
              /* Comparativo de todos */
              <>
                <p className="texto-suave" style={{ marginTop: 0 }}>
                  Ventas por funcionario desglosadas por categoría, de mayor a menor.
                  Toca la barra de alguien (o selecciónalo arriba) para ver su registro día a día.
                </p>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart
                    data={comparativo}
                    margin={{ top: 24, bottom: 80, left: 0, right: 8 }}
                    onClick={(e) => {
                      const id = e?.activePayload?.[0]?.payload?.id
                      if (id) setEmpleadoSel(String(id))
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
                    <XAxis
                      dataKey="nombre" interval={0} angle={-38} textAnchor="end"
                      fontSize={10.5} tick={{ fill: 'var(--tinta-2)' }} height={80}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v, nombre) => [fmt(v), NOMBRES_SERIES[nombre] || nombre]} />
                    <Legend verticalAlign="top" align="right" formatter={(v) => NOMBRES_SERIES[v] || v} />
                    <Bar dataKey="autoliquidable" stackId="v" fill="#0E7C6B" cursor="pointer" />
                    <Bar dataKey="oferta" stackId="v" fill="#E8A13D" cursor="pointer" />
                    <Bar dataKey="marca" stackId="v" fill="#3E7CB1" cursor="pointer" />
                    <Bar dataKey="adicional" stackId="v" fill="#8A6FB0" cursor="pointer" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="total" position="top" fontSize={10.5}
                        formatter={(v) => (v > 0 ? fmt(v) : '')} fill="var(--tinta)" fontWeight={700} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : !serieIndividual || serieIndividual.length === 0 ? (
              <>
                <Aviso tipo="ambar">{empSel?.name} no tiene ventas registradas en este período.</Aviso>
                <button className="boton boton-secundario" onClick={() => setEmpleadoSel('')}>← Volver al comparativo</button>
              </>
            ) : (
              /* Detalle individual */
              <>
                <div className="fila entre" style={{ marginBottom: 12 }}>
                  <span className="texto-suave">
                    <span className="insignia insignia-neutra" style={{ marginRight: 8 }}>{empSel?.department}</span>
                    Total período: <strong>{fmt(serieIndividual[serieIndividual.length - 1].acumulado)}</strong>
                    {' '}· Días con registro: <strong>{serieIndividual.length}</strong>
                    {' '}· Meta mensual: <strong>{fmt(empSel?.goal || 0)}</strong>
                  </span>
                  <button className="boton boton-secundario" onClick={() => setEmpleadoSel('')}>← Volver al comparativo</button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={serieIndividual}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                    <XAxis dataKey="dia" fontSize={12} />
                    <YAxis yAxisId="dia" fontSize={12} />
                    <YAxis yAxisId="acum" orientation="right" fontSize={12} />
                    <Tooltip formatter={(v, nombre) => [fmt(v), NOMBRES_SERIES[nombre] || nombre]} />
                    <Legend formatter={(v) => NOMBRES_SERIES[v] || v} />
                    <Bar yAxisId="dia" dataKey="autoliquidable" stackId="v" fill="#0E7C6B" />
                    <Bar yAxisId="dia" dataKey="oferta" stackId="v" fill="#E8A13D" />
                    <Bar yAxisId="dia" dataKey="marca" stackId="v" fill="#3E7CB1" />
                    <Bar yAxisId="dia" dataKey="adicional" stackId="v" fill="#8A6FB0" radius={[5, 5, 0, 0]} />
                    <Line yAxisId="acum" type="monotone" dataKey="acumulado" stroke="#14201D" strokeWidth={2.5} dot={{ r: 3 }} />
                    <ReferenceLine yAxisId="acum" y={empSel?.goal || 0} stroke="#D64545" strokeDasharray="6 4"
                      label={{ value: 'Meta', fill: '#D64545', fontSize: 11, position: 'right' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}
          </div>

          <div className="tarjeta">
            <div className="tarjeta-titulo">Ventas por día</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.serieDias}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                <XAxis dataKey="dia" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v) => [fmt(v), 'Unidades']} />
                <Bar dataKey="total" fill="#0E7C6B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="fila-campos">
            <div className="tarjeta">
              <div className="tarjeta-titulo">Por departamento</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={stats.serieDepto} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {stats.serieDepto.map((d) => (
                      <Cell key={d.name} fill={DEPT_COLORS[d.name] || '#0E7C6B'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="tarjeta">
              <div className="tarjeta-titulo">Por categoría de producto</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.porCategoria} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={12} />
                  <Tooltip formatter={(v) => [fmt(v), 'Unidades']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {stats.porCategoria.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  )
}
