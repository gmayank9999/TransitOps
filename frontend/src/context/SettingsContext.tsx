import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface AppSettings {
  depotName: string
  currency: 'INR' | 'USD'
  distanceUnit: 'km' | 'mi'
  theme: 'light' | 'dark'
}

const DEFAULT_SETTINGS: AppSettings = {
  depotName: 'TransitOps HQ',
  currency: 'INR',
  distanceUnit: 'km',
  theme: 'light',
}

interface SettingsContextValue {
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
  toggleTheme: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('transitops_settings')
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  // Apply theme on mount and changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem('transitops_settings', JSON.stringify(next))
      return next
    })
  }, [])

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' })
  }, [settings.theme, updateSettings])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleTheme }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
