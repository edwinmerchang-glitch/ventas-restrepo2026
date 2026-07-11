import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const Item = ({ a, icono, texto, cerrar }) => (
  <NavLink
    to={a}
    className={({ isActive }) => `nav-item${isActive ? ' activo' : ''}`}
    onClick={cerrar}
  >
    <span className="icono" aria-hidden>{icono}</span>
    {texto}
  </NavLink>
)

export default function Layout() {
  const { profile, employee, isAdmin, signOut } = useAuth()
  const [abierta, setAbierta] = useState(false)
  const cerrar = () => setAbierta(false)

  const inicial = (employee?.name || profile?.username || '?').charAt(0).toUpperCase()

  return (
    <>
      <header className="topbar-movil">
        <span className="logo">Locatel Restrepo</span>
        <button className="boton-menu" onClick={() => setAbierta(true)} aria-label="Abrir menú">
          ☰ Menú
        </button>
      </header>

      {abierta && <div className="telon" onClick={cerrar} />}

      <div className="app-shell">
        <aside className={`sidebar${abierta ? ' abierta' : ''}`}>
          <div className="sidebar-marca">
            <div className="logo">
              <span className="logo-punto">📈</span> Ventas AIS
            </div>
            <div className="sub">Locatel Restrepo</div>
          </div>

          <nav>
            <div className="nav-seccion">Mi trabajo</div>
            <Item a="/registrar" icono="📝" texto="Registrar ventas" cerrar={cerrar} />
            <Item a="/afiliaciones" icono="📱" texto="Afiliaciones" cerrar={cerrar} />
            <Item a="/desempeno" icono="🎯" texto="Mi desempeño" cerrar={cerrar} />

            <div className="nav-seccion">Equipo</div>
            <Item a="/" icono="📊" texto="Dashboard" cerrar={cerrar} />
            <Item a="/ranking" icono="🏆" texto="Ranking" cerrar={cerrar} />

            {isAdmin && (
              <>
                <div className="nav-seccion">Administración</div>
                <Item a="/admin/empleados" icono="👥" texto="Empleados" cerrar={cerrar} />
                <Item a="/admin/usuarios" icono="🔑" texto="Usuarios" cerrar={cerrar} />
              </>
            )}

            <div className="nav-seccion">Cuenta</div>
            <Item a="/perfil" icono="⚙️" texto="Mi perfil" cerrar={cerrar} />
          </nav>

          <div className="sidebar-pie">
            <div className="usuario-chip">
              <div className="avatar">{inicial}</div>
              <div>
                <div className="nombre">{employee?.name || profile?.username}</div>
                <div className="rol">{isAdmin ? 'Administrador' : 'Empleado'}</div>
              </div>
            </div>
            <button className="boton boton-secundario boton-bloque" onClick={signOut}>
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </>
  )
}
