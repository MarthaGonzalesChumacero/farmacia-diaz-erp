
import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import InventarioPage from './pages/InventarioPage'
import LoginPage from './pages/LoginPage'
import RegistrarMedicamentoPage from './pages/RegistrarMedicamentoPage'

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
    </Routes>
  )
}

export default App
