import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, UserRole } from '@/types'
import { authApi } from '@/api'

interface AuthContextValue {
  user: User | null
  role: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>
  logout: () => void
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount — try to restore session from stored token
  useEffect(() => {
    const token =
      sessionStorage.getItem('access_token') ?? localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        sessionStorage.removeItem('access_token')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      const res = await authApi.login(email, password, rememberMe)
      const { access_token, refresh_token, user_id, full_name, role } = res.data

      // Store tokens — sessionStorage by default (closes on tab), localStorage for remember-me
      if (rememberMe) {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
      } else {
        sessionStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
      }

      setUser({ id: user_id, email, full_name, role, is_active: true })
    },
    []
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem('access_token')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
    window.location.href = '/login'
  }, [])

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
