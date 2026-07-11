import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useAuth } from '../lib/AuthContext'
import { supabase, CATEGORIAS, fmt, hoyISO, primerDiaMesISO, totalVenta } from '../lib/supabase'
import { AnilloMeta, Kpi, Cargando, Aviso, InsigniaCargo } from '../components/UI'

export default function Desempeno() {
  const { employee } = useAuth()
  const [desde, setDesde] = useState(primerDiaMesISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [ventas, setVentas] = useState(null)
  const [afiliaciones, setAfiliaciones] = useState([])

  useEffect(() => {
    if (!employee) return
    const cargar = async () => {
      setVentas(null)
      const [{ data: v }, { data: a }] = await Promise.all([
        supabase.from('sales').select('*')
          .eq('employee_id', employee.id).gte('date', desde).lte('date', hasta)
          .order('date'),
        supabase.from('afiliaciones').select('cantidad')
          .eq('employee_id', employee.id).gte('fecha', desde).lte('fecha', hasta),
      ])
      setVentas(v ?? [])
      setAfiliaciones(a ?? [])
    }
    cargar()
  }, [employee, desde, hasta])

  const stats = useMemo(() => {
    if (!ventas) return null
    const total = ventas.reduce((s, r) => s + totalVenta(r), 0)
    const dias = ventas.length
    const totalAfil = afiliaciones.reduce((s, r) => s + (r.cantidad || 0), 0)
    const serie = ventas.map((r) => ({
      dia: r.date.slice(8) + '/' + r.date.slice(5, 7),
      total: totalVenta(r),
    }))
    const porCat = CATEGORIAS.map((c) => ({
      name: c.label,
      value: ventas.reduce((s, r) => s + (r[c.key] || 0), 0),
      color: c.color,
    })).filter((c) => c.value > 0)
    return { total, dias, totalAfil, serie, porCat }
  }, [ventas, afiliaciones])

  if (!employee) {
    return <Aviso tipo="error">Tu usuario no tiene un empleado asociado. Contacta al administrador.</Aviso>
  }

  return (
    <>
      <header className="encabezado-pagina">
        <div className="eyebrow">Mi trabajo</div>
        <h1>Mi desempeño</h1>
        <p>Tu progreso personal frente a las metas de ventas y afiliaciones.</p>
      </header>

      <div className="tarjeta">
        <div className="fila entre">
          <div>
            <h3>{employee.name}</h3>
            <div className="fila" style={{ marginTop: 6 }}>
              <InsigniaCargo cargo={employee.position} />
              <span className="insignia insignia-neutra">{employee.department}</span>
            </div>
          </div>
          <div className="fila">
            <div className="centrado">
              <AnilloMeta actual={stats?.total ?? 0} meta={employee.goal} etiqueta="meta ventas" />
            </div>
            <div className="centrado">
              <AnilloMeta actual={stats?.totalAfil ?? 0} meta={employee.meta_afiliaciones} etiqueta="meta afiliaciones" />
            </div>
          </div>
        </div>
      </div>

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
        </div>
      </div>

      {!stats ? (
        <Cargando texto="Cargando tu desempeño…" />
      ) : (
        <>
          <div className="grid-kpi">
            <Kpi etiqueta="Ventas del período" valor={fmt(stats.total)} detalle={`Meta: ${fmt(employee.goal)}`} />
            <Kpi etiqueta="Días con registro" valor={stats.dias} detalle="En el período" color="azul" />
            <Kpi
              etiqueta="Promedio por día"
              valor={fmt(stats.dias ? Math.round(stats.total / stats.dias) : 0)}
              detalle="Unidades / día activo"
              color="ambar"
            />
            <Kpi etiqueta="Afiliaciones" valor={fmt(stats.totalAfil)} detalle={`Meta: ${fmt(employee.meta_afiliaciones)}`} color="morado" />
          </div>

          {stats.serie.length === 0 ? (
            <Aviso tipo="info">Aún no tienes ventas registradas en este período. Registra tu primer día desde <strong>Registrar ventas</strong>.</Aviso>
          ) : (
            <div className="fila-campos">
              <div className="tarjeta">
                <div className="tarjeta-titulo">Mis ventas por día</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
                    <XAxis dataKey="dia" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(v) => [fmt(v), 'Unidades']} />
                    <Bar dataKey="total" fill="#0E7C6B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="tarjeta">
                <div className="tarjeta-titulo">Distribución por categoría</div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stats.porCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {stats.porCat.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
