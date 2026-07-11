import { fmt } from '../lib/supabase'

export function Kpi({ etiqueta, valor, detalle, color = '' }) {
  return (
    <div className={`kpi ${color}`}>
      <div className="etiqueta">{etiqueta}</div>
      <div className="valor">{valor}</div>
      {detalle && <div className="detalle">{detalle}</div>}
    </div>
  )
}

export function InsigniaCargo({ cargo }) {
  const clase = cargo?.includes('Droguería')
    ? 'insignia-drogueria'
    : cargo?.includes('Equipos')
    ? 'insignia-equipos'
    : cargo?.includes('Pasillos')
    ? 'insignia-pasillos'
    : cargo?.includes('Cajas')
    ? 'insignia-cajas'
    : 'insignia-neutra'
  return <span className={`insignia ${clase}`}>{cargo || 'Sin cargo'}</span>
}

export function Progreso({ actual, meta, titulo }) {
  const pct = meta > 0 ? Math.min((actual / meta) * 100, 100) : 0
  const color = pct >= 100 ? 'var(--verde-600)' : pct >= 60 ? 'var(--ambar)' : 'var(--rojo)'
  return (
    <div className="progreso">
      <div className="cabecera">
        <span>{titulo}</span>
        <span>
          {fmt(actual)} / {fmt(meta)} · {Math.round(meta > 0 ? (actual / meta) * 100 : 0)}%
        </span>
      </div>
      <div className="pista">
        <div className="relleno" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export function AnilloMeta({ actual, meta, etiqueta = 'de la meta' }) {
  const pct = meta > 0 ? (actual / meta) * 100 : 0
  const pctVisible = Math.min(pct, 100)
  const radio = 54
  const circunf = 2 * Math.PI * radio
  const color = pct >= 100 ? 'var(--verde-600)' : pct >= 60 ? 'var(--ambar)' : 'var(--rojo)'
  return (
    <div className="anillo" role="img" aria-label={`${Math.round(pct)}% ${etiqueta}`}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radio} fill="none" stroke="var(--borde)" strokeWidth="11" />
        <circle
          cx="65" cy="65" r={radio} fill="none"
          stroke={color} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={circunf}
          strokeDashoffset={circunf * (1 - pctVisible / 100)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="centro">
        <div className="porcentaje" style={{ color }}>{Math.round(pct)}%</div>
        <div className="meta-mini">{etiqueta}</div>
      </div>
    </div>
  )
}

export function Aviso({ tipo = 'info', children }) {
  return <div className={`aviso aviso-${tipo}`}>{children}</div>
}

export function Cargando({ texto = 'Cargando…' }) {
  return <div className="cargando">{texto}</div>
}
