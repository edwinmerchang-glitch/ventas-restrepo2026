import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RegistrarVentas from './pages/RegistrarVentas'
import Ranking from './pages/Ranking'
import Desempeno from './pages/Desempeno'
import Afiliaciones from './pages/Afiliaciones'
import Perfil from './pages/Perfil'
import AdminEmpleados from './pages/AdminEmpleados'
import AdminUsuarios from './pages/AdminUsuarios'
import { Cargando } from './components/UI'

function Rutas() {
  const { session, loading, isAdmin } = useAuth()

  if (loading) return <Cargando texto="Iniciando…" />
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/registrar" element={<RegistrarVentas />} />
        <Route path="/afiliaciones" element={<Afiliaciones />} />
        <Route path="/desempeno" element={<Desempeno />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/admin/empleados" element={isAdmin ? <AdminEmpleados /> : <Navigate to="/" replace />} />
        <Route path="/admin/usuarios" element={isAdmin ? <AdminUsuarios /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rutas />
      </AuthProvider>
    </BrowserRouter>
  )
}
