import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase, DEPARTAMENTOS, DEPT_COLORS, CATEGORIAS, fmt, hoyISO, primerDiaMesISO, totalVenta } from '../lib/supabase'
import { Kpi, Cargando, Aviso } from '../components/UI'

export default function Dashboard() {
  const [desde, setDesde] = useState(primerDiaMesISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [depto, setDepto] = useState('Todos')
  const [filas, setFilas] = useState(null)
  const [filasAnt, setFilasAnt] = useState([])

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

      // Período anterior comparable (mismo número de días, inmediatamente antes)
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
