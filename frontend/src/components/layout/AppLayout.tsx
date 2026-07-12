import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import { useAuth } from '@/context/AuthContext'

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="layout-root">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
