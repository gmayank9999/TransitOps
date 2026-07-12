import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Fleet', path: '/vehicles', icon: Truck },
  { label: 'Drivers', path: '/drivers', icon: Users, roles: ['FLEET_MANAGER', 'SAFETY_OFFICER', 'DISPATCHER', 'ADMIN'] },
  { label: 'Trips', path: '/trips', icon: Route, roles: ['FLEET_MANAGER', 'DISPATCHER', 'ADMIN'] },
  { label: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['FLEET_MANAGER', 'ADMIN'] },
  { label: 'Fuel & Expenses', path: '/fuel-expenses', icon: Fuel, roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'ADMIN'] },
  { label: 'Analytics', path: '/reports', icon: BarChart3, roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'ADMIN'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['FLEET_MANAGER', 'ADMIN'] },
]

const ROLE_COLORS: Record<UserRole, string> = {
  FLEET_MANAGER: 'bg-primary/10 text-primary',
  DISPATCHER: 'bg-secondary/10 text-secondary',
  SAFETY_OFFICER: 'bg-amber-100 text-amber-700',
  FINANCIAL_ANALYST: 'bg-emerald-100 text-emerald-700',
  ADMIN: 'bg-red-100 text-red-700',
}

const ROLE_LABELS: Record<UserRole, string> = {
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
  ADMIN: 'Admin',
}

export default function Sidebar() {
  const { user, hasRole, logout } = useAuth()
  const { settings, toggleTheme } = useSettings()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <aside className="sidebar animate-fade-in">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-on-surface leading-tight">TransitOps</h1>
            <p className="text-[10px] text-on-surface-variant">Fleet Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                  ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-mid hover:text-on-surface'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-on-surface'}`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 text-primary" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info + Logout */}
      {user && (
        <div className="px-3 py-4 border-t border-outline-variant">
          <div className="px-3 py-3 rounded-lg bg-surface-mid mb-2">
            <p className="text-sm font-semibold text-on-surface leading-tight truncate">{user.full_name}</p>
            <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
            <span
              className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-red-50 hover:text-error transition-colors duration-150"
            id="btn-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-mid transition-colors duration-150"
            id="btn-theme-toggle"
          >
            {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
