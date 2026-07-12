import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, LabelList, AreaChart, Area, Legend,
} from 'recharts'
import { useAuth } from '../lib/AuthContext'
import { supabase, DEPARTAMENTOS, DEPT_COLORS, fmt, hoyISO, primerDiaMesISO, fechaLarga } from '../lib/supabase'
import { AnilloMeta, Aviso, Cargando, Kpi, Progreso } from '../components/UI'

export default function Afiliaciones() {
  const { employee, isAdmin } = useAuth()

  // ── Registro propio ──────────────────────────────────────
  const [fecha, setFecha] = useState(hoyISO())
  const [cantidad, setCantidad] = useState(1)
  const [existente, setExistente] = useState(null)
  const [delMes, setDelMes] = useState(0)
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // ── Dashboard ────────────────────────────────────────────
  const [desde, setDesde] = useState(primerDiaMesISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [depto, setDepto] = useState('Todos')
  const [empleados, setEmpleados] = useState([])
  const [afil, setAfil] = useState(null)
  const [afilAnt, setAfilAnt] = useState([])

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

  // Cargar empleados una vez
  useEffect(() => {
    supabase.from('employees').select('id, name, department, meta_afiliaciones').order('name')
      .then(({ data }) => setEmpleados(data ?? []))
  }, [])

  // Cargar afiliaciones del dashboard al cambiar filtros
  useEffect(() => {
    const cargar = async () => {
      setAfil(null)
      let q = supabase.from('afiliaciones')
        .select('employee_id, fecha, cantidad, employees!inner(name, department)')
        .gte('fecha', desde).lte('fecha', hasta)
      if (depto !== 'Todos') q = q.eq('employees.department', depto)
      const { data } = await q

      // Período anterior
      const d1 = new Date(desde), d2 = new Date(hasta)
      const dias = Math.round((d2 - d1) / 86400000)
      const finAnt = new Date(d1); finAnt.setDate(finAnt.getDate() - 1)
      const iniAnt = new Date(finAnt); iniAnt.setDate(iniAnt.getDate() - dias)
      const iso = (d) => d.toISOString().slice(0, 10)

      let qa = supabase.from('afiliaciones')
        .select('cantidad, employees!inner(department)')
        .gte('fecha', iso(iniAnt)).lte('fecha', iso(finAnt))
      if (depto !== 'Todos') qa = qa.eq('employees.department', depto)
      const { data: ant } = await qa

      setAfil(data ?? [])
      setAfilAnt(ant ?? [])
    }
    cargar()
  }, [desde, hasta, depto, mensaje])

  const stats = useMemo(() => {
    if (!afil) return null
    const total = afil.reduce((s, r) => s + r.cantidad, 0)
    const totalAnt = afilAnt.reduce((s, r) => s + r.cantidad, 0)
    const variacion = totalAnt > 0 ? ((total - totalAnt) / totalAnt) * 100 : null
    const activos = new Set(afil.map((r) => r.employee_id)).size
    const diasActivos = new Set(afil.map((r) => r.fecha)).size

    // Serie diaria total
    const porDia = {}
    afil.forEach((r) => { porDia[r.fecha] = (porDia[r.fecha] || 0) + r.cantidad })
    const serieDias = Object.entries(porDia)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([f, v]) => ({ dia: f.slice(8) + '/' + f.slice(5, 7), total: v }))

    // Serie diaria por departamento
    const porDiaDepto = {}
    afil.forEach((r) => {
      const d = r.fecha, dep = r.employees.department
      if (!porDiaDepto[d]) porDiaDepto[d] = {}
      porDiaDepto[d][dep] = (porDiaDepto[d][dep] || 0) + r.cantidad
    })
    const serieEvolucion = Object.entries(porDiaDepto)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([f, deps]) => ({ dia: f.slice(8) + '/' + f.slice(5, 7), ...deps }))

    // Por empleado con meta
    const porEmp = {}
    afil.forEach((r) => { porEmp[r.employee_id] = (porEmp[r.employee_id] || 0) + r.cantidad })
    const visibles = empleados.filter((e) => depto === 'Todos' || e.department === depto)
    const porEmpleado = visibles
      .map((e) => ({
        id: e.id,
        nombre: e.name,
        depto: e.department,
        total: porEmp[e.id] || 0,
        meta: e.meta_afiliaciones,
        pct: e.meta_afiliaciones > 0 ? Math.round(((porEmp[e.id] || 0) / e.meta_afiliaciones) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)

    const metaTotal = visibles.reduce((s, e) => s + e.meta_afiliaciones, 0)
    const pctEquipo = metaTotal > 0 ? Math.round((total / metaTotal) * 100) : 0

    return { total, totalAnt, variacion, activos, diasActivos, serieDias, serieEvolucion, porEmpleado, metaTotal, pctEquipo }
  }, [afil, afilAnt, empleados, depto])

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

      {/* ── Registro propio ─────────────────────────────── */}
      {employee && (
        <>
          {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
          <form className="tarjeta" onSubmit={guardar}>
            <div className="fila entre">
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="tarjeta-titulo">Registrar mis afiliaciones</div>
                <div className="fila-campos">
                  <label className="campo">
                    <span className="nombre-campo">Fecha</span>
                    <input type="date" value={fecha} max={hoyISO()}
                      onChange={(e) => setFecha(e.target.value)} required />
                  </label>
                  <label className="campo">
                    <span className="nombre-campo">Cantidad</span>
                    <input type="number" min="0" step="1" value={cantidad}
                      onChange={(e) => setCantidad(Math.max(0, parseInt(e.target.value || '0', 10)))} />
                  </label>
                </div>
                {existente && (
                  <Aviso tipo="info">
                    Ya tienes <strong>{existente.cantidad}</strong> afiliación(es) para esta fecha. Estás editando ese registro.
                  </Aviso>
                )}
                <Progreso actual={mesProyectado} meta={metaAfil} titulo="Progreso mensual" />
                <button className="boton boton-primario" disabled={guardando}>
                  {guardando ? 'Guardando…' : existente ? 'Actualizar' : 'Guardar afiliaciones'}
                </button>
              </div>
              <AnilloMeta actual={mesProyectado} meta={metaAfil} etiqueta="meta del mes" />
            </div>
          </form>
        </>
      )}

      {/* ── Filtros del dashboard ────────────────────────── */}
      <div className="tarjeta">
        <div className="tarjeta-titulo">Dashboard de afiliaciones</div>
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
        <Cargando texto="Cargando afiliaciones…" />
      ) : (
        <>
          {/* ── KPIs ──────────────────────────────────────── */}
          <div className="grid-kpi">
            <Kpi
              etiqueta="Total afiliaciones"
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
            <Kpi etiqueta="Cumplimiento equipo"
              valor={`${stats.pctEquipo}%`}
              detalle={`${fmt(stats.total)} de ${fmt(stats.metaTotal)} meta colectiva`}
              color={stats.pctEquipo >= 100 ? '' : stats.pctEquipo >= 60 ? 'ambar' : 'morado'}
            />
            <Kpi etiqueta="Funcionarios activos" valor={stats.activos}
              detalle={`Con registros · ${stats.diasActivos} días activos`} color="ambar" />
          </div>

          {/* ── Comparativo por funcionario ───────────────── */}
          <div className="tarjeta">
            <div className="tarjeta-titulo">Afiliaciones por funcionario</div>
            <p className="texto-suave" style={{ marginTop: 0 }}>
              Total del período por persona, ordenado de mayor a menor. La franja gris muestra su meta.
            </p>
            <ResponsiveContainer width="100%" height={Math.max(280, stats.porEmpleado.length * 38)}>
              <BarChart data={stats.porEmpleado} margin={{ top: 20, bottom: 80, left: 0, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
                <XAxis dataKey="nombre" interval={0} angle={-38} textAnchor="end"
                  fontSize={10.5} tick={{ fill: 'var(--tinta-2)' }} height={80} />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(v, nombre) => [fmt(v), nombre === 'total' ? 'Afiliaciones' : 'Meta']}
                />
                <Bar dataKey="meta" fill="var(--borde)" radius={[6, 6, 0, 0]} name="Meta" />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} name="Afiliaciones">
                  {stats.porEmpleado.map((e) => (
                    <Cell key={e.id}
                      fill={e.pct >= 100 ? 'var(--verde-600)' : e.pct >= 60 ? 'var(--ambar)' : 'var(--rojo)'} />
                  ))}
                  <LabelList dataKey="total" position="top" fontSize={10.5}
                    formatter={(v) => (v > 0 ? fmt(v) : '')} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="fila" style={{ marginTop: 4, gap: 16 }}>
              <span className="texto-suave">🟢 ≥ 100% meta</span>
              <span className="texto-suave">🟡 60–99%</span>
              <span className="texto-suave">🔴 &lt; 60%</span>
            </div>
          </div>

          {/* ── Evolución diaria por departamento ────────── */}
          {stats.serieEvolucion.length > 1 && (
            <div className="tarjeta">
              <div className="tarjeta-titulo">Evolución diaria por departamento</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.serieEvolucion} margin={{ top: 8, right: 8 }}>
                  <defs>
                    {DEPARTAMENTOS.map((d) => (
                      <linearGradient key={d} id={`afil-grad-${d.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={DEPT_COLORS[d]} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={DEPT_COLORS[d]} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v, nombre) => [fmt(v), nombre]} />
                  <Legend />
                  {DEPARTAMENTOS
                    .filter((d) => depto === 'Todos' || d === depto)
                    .map((d) => (
                      <Area key={d} type="monotone" dataKey={d} name={d}
                        stroke={DEPT_COLORS[d]} strokeWidth={2.2}
                        fill={`url(#afil-grad-${d.replace(/\s/g, '')})`}
                        dot={{ r: 3, fill: DEPT_COLORS[d], strokeWidth: 0 }}
                        activeDot={{ r: 5 }} connectNulls />
                    ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Tabla detallada ───────────────────────────── */}
          <div className="tarjeta">
            <div className="tarjeta-titulo">Detalle por funcionario · este período</div>
            <div className="tabla-envoltura">
              <table>
                <thead>
                  <tr>
                    <th>Funcionario</th>
                    <th>Departamento</th>
                    <th className="numero">Afiliaciones</th>
                    <th className="numero">Meta</th>
                    <th className="numero">Cumplimiento</th>
                    <th style={{ minWidth: 120 }}>Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.porEmpleado.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.nombre}</strong></td>
                      <td>{r.depto}</td>
                      <td className="numero">{fmt(r.total)}</td>
                      <td className="numero">{fmt(r.meta)}</td>
                      <td className="numero">
                        <span className={r.pct >= 100 ? 'tendencia-sube' : r.pct < 60 ? 'tendencia-baja' : ''}>
                          {r.pct}%
                        </span>
                      </td>
                      <td>
                        <div className="pista" style={{ height: 8, borderRadius: 999, background: 'var(--borde)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 999,
                            width: `${Math.min(r.pct, 100)}%`,
                            background: r.pct >= 100 ? 'var(--verde-600)' : r.pct >= 60 ? 'var(--ambar)' : 'var(--rojo)',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fila-total">
                    <td colSpan={2}><strong>Total equipo</strong></td>
                    <td className="numero">{fmt(stats.total)}</td>
                    <td className="numero">{fmt(stats.metaTotal)}</td>
                    <td className="numero">{stats.pctEquipo}%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
