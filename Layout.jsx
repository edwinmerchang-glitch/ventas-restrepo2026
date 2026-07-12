import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

/* Iconos de línea (SVG) */
const I = {
  inicio: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
  registrar: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  afiliaciones: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  desempeno: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>,
  ranking: <path d="M8 21V10M12 21V4M16 21v-7M4 21h16" />,
  empleados: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5M16.5 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20c-.5-2.2-1.8-3.7-3.7-4.5" /></>,
  usuarios: <><circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c.9-3.6 3.7-5.5 7-5.5s6.1 1.9 7 5.5M17.5 9.5l1.2 1.2 2.3-2.3" /></>,
  perfil: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></>,
  salir: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
}

const Icono = ({ d }) => (
  <svg className="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
)

const Item = ({ a, icono, texto, cerrar }) => (
  <NavLink
    to={a}
    className={({ isActive }) => `nav-item${isActive ? ' activo' : ''}`}
    onClick={cerrar}
  >
    <Icono d={icono} />
    {texto}
  </NavLink>
)

export default function Layout() {
  const { profile, employee, isAdmin, signOut } = useAuth()
  const [abierta, setAbierta] = useState(false)
  const cerrar = () => setAbierta(false)

  const nombre = employee?.name || profile?.username || ''
  const iniciales = nombre
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]).join('').toUpperCase() || '?'

  return (
    <>
      <header className="topbar-movil">
        <button className="boton-menu" onClick={() => setAbierta(true)} aria-label="Abrir menú">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="logo">Ventas AIS</span>
        <div className="avatar avatar-mini">{iniciales}</div>
      </header>

      {abierta && <div className="telon" onClick={cerrar} />}

      <div className="app-shell">
        <aside className={`sidebar${abierta ? ' abierta' : ''}`}>
          <div className="sidebar-marca">
            <div className="logo">
              <span className="logo-punto">VA</span>
              <span>
                Ventas AIS
                <span className="sub">Sede Restrepo</span>
              </span>
            </div>
            <button className="boton-cerrar-menu" onClick={cerrar} aria-label="Cerrar menú">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="usuario-tarjeta">
            <div className="avatar">{iniciales}</div>
            <div>
              <div className="nombre">{nombre}</div>
              <div className="rol">
                {isAdmin ? 'ADMIN · ADMINISTRACIÓN' : (employee?.department || 'Empleado').toUpperCase()}
              </div>
            </div>
          </div>

          <nav>
            <div className="nav-seccion">Menú</div>
            <Item a="/" icono={I.inicio} texto="Inicio" cerrar={cerrar} />
            <Item a="/registrar" icono={I.registrar} texto="Registrar ventas" cerrar={cerrar} />
            <Item a="/afiliaciones" icono={I.afiliaciones} texto="Afiliaciones" cerrar={cerrar} />
            <Item a="/desempeno" icono={I.desempeno} texto="Mi desempeño" cerrar={cerrar} />
            <Item a="/ranking" icono={I.ranking} texto="Ranking" cerrar={cerrar} />
            {isAdmin && (
              <>
                <Item a="/admin/empleados" icono={I.empleados} texto="Empleados" cerrar={cerrar} />
                <Item a="/admin/usuarios" icono={I.usuarios} texto="Usuarios" cerrar={cerrar} />
              </>
            )}
            <Item a="/perfil" icono={I.perfil} texto="Mi perfil" cerrar={cerrar} />
          </nav>

          <div className="sidebar-pie">
            <button className="boton-salir" onClick={signOut}>
              <Icono d={I.salir} />
              Cerrar sesión
            </button>
            <div className="credito">© 2026 Locatel Restrepo · v1.0</div>
          </div>
        </aside>

        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </>
  )
}
