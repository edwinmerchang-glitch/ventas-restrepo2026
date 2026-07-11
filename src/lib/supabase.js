import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, anonKey)

// Cliente secundario: permite al admin crear usuarios nuevos
// sin perder su propia sesión.
export const supabaseSignup = createClient(url, anonKey, {
  auth: { storageKey: 'sb-signup', persistSession: false, autoRefreshToken: false },
})

// Los usuarios ingresan con su nombre de usuario; internamente
// Supabase requiere formato de correo.
export const usernameToEmail = (username) =>
  `${username.trim().toLowerCase().replace(/\s+/g, '.')}@locatel-restrepo.app`

export const DEPARTAMENTOS = ['Droguería', 'Equipos Médicos', 'Pasillos', 'Cajas']

export const CARGOS = ['Ais Droguería', 'Ais Equipos Médicos', 'Ais Pasillos', 'Ais Cajas']

export const DEPT_COLORS = {
  'Droguería': '#D96459',
  'Equipos Médicos': '#0E7C6B',
  'Pasillos': '#3E7CB1',
  'Cajas': '#8A6FB0',
}

export const CATEGORIAS = [
  { key: 'autoliquidable', label: 'Autoliquidable', color: '#0E7C6B' },
  { key: 'oferta', label: 'Oferta de la semana', color: '#E8A13D' },
  { key: 'marca', label: 'Marca propia', color: '#3E7CB1' },
  { key: 'adicional', label: 'Producto adicional', color: '#8A6FB0' },
]

export const totalVenta = (r) =>
  (r.autoliquidable || 0) + (r.oferta || 0) + (r.marca || 0) + (r.adicional || 0)

export const fmt = (n) => new Intl.NumberFormat('es-CO').format(n ?? 0)

export const hoyISO = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const primerDiaMesISO = () => hoyISO().slice(0, 8) + '01'

export const fechaLarga = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
