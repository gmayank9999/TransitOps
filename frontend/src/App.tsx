import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import VehiclesPage from '@/pages/VehiclesPage'
import DriversPage from '@/pages/DriversPage'
import TripsPage from '@/pages/TripsPage'
import MaintenancePage from '@/pages/MaintenancePage'
import FuelExpensesPage from '@/pages/FuelExpensesPage'
import ReportsPage from '@/pages/ReportsPage'
import SettingsPage from '@/pages/SettingsPage'
import UnauthorizedPage from '@/pages/UnauthorizedPage'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes — all inside AppLayout with sidebar */}
        <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <VehiclesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers"
            element={
              <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'SAFETY_OFFICER', 'DISPATCHER', 'ADMIN']}>
                <DriversPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips"
            element={
              <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'DISPATCHER', 'ADMIN']}>
                <TripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'ADMIN']}>
                <MaintenancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fuel-expenses"
            element={
              <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'ADMIN']}>
                <FuelExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'ADMIN']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
