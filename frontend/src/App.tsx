
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import InventarioPage from './pages/InventarioPage'
import LoginPage from './pages/LoginPage'
import RegistrarMedicamentoPage from './pages/RegistrarMedicamentoPage'
import RegistrarLotePage from './pages/RegistrarLotePage'
import ConsultarLotesPage from './pages/ConsultarLotesPage'
import VentasPage from './pages/VentasPage'
import RegistrarVentaPage from './pages/RegistrarVentaPage'
import AlertasPage from './pages/AlertasPage'
import ControlStockPage from './pages/ControlStockPage'
import UsuariosPage from './pages/UsuariosPage'
import ProveedoresPage from './pages/ProveedoresPage'
import EditarMedicamentoPage from './pages/EditarMedicamentoPage'
import ReportesPage from './pages/ReportesPage'

const IdentificarCodigoPage = lazy(
  () => import('./pages/IdentificarCodigoPage'),
)

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario"
        element={
          <ProtectedRoute>
            <InventarioPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/registrar"
        element={
          <ProtectedRoute requiredRole="administrador">
            <RegistrarMedicamentoPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/medicamentos/:id/editar"
        element={
          <ProtectedRoute requiredRole="administrador">
            <EditarMedicamentoPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/proveedores"
        element={
          <ProtectedRoute requiredRole="administrador">
            <ProveedoresPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/identificar"
        element={
          <ProtectedRoute>
            <Suspense fallback={<main className="p-8 text-center text-slate-500">Cargando lector...</main>}>
              <IdentificarCodigoPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/lotes"
        element={
          <ProtectedRoute>
            <ConsultarLotesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/lotes/registrar"
        element={
          <ProtectedRoute requiredRole="administrador">
            <RegistrarLotePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/stock"
        element={
          <ProtectedRoute>
            <ControlStockPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventario/reportes"
        element={
          <ProtectedRoute requiredRole="administrador">
            <ReportesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/alertas"
        element={
          <ProtectedRoute>
            <AlertasPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <VentasPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ventas/registrar"
        element={
          <ProtectedRoute>
            <RegistrarVentaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/usuarios"
        element={
          <ProtectedRoute requiredRole="administrador">
            <UsuariosPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
