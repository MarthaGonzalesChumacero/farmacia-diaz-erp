
import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import InventarioPage from './pages/InventarioPage'
import LoginPage from './pages/LoginPage'
import RegistrarMedicamentoPage from './pages/RegistrarMedicamentoPage'
import RegistrarLotePage from './pages/RegistrarLotePage'
import ConsultarLotesPage from './pages/ConsultarLotesPage'

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
          <ProtectedRoute>
            <RegistrarMedicamentoPage />
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
          <ProtectedRoute>
            <RegistrarLotePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
