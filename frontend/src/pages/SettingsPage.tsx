import { Settings, Shield, MapPin, DollarSign, Ruler } from 'lucide-react'

const RBAC_MATRIX = [
  { module: 'Dashboard', FLEET_MANAGER: true, DISPATCHER: true, SAFETY_OFFICER: true, FINANCIAL_ANALYST: true },
  { module: 'Fleet (Vehicles)', FLEET_MANAGER: true, DISPATCHER: false, SAFETY_OFFICER: false, FINANCIAL_ANALYST: false },
  { module: 'Drivers', FLEET_MANAGER: true, DISPATCHER: true, SAFETY_OFFICER: true, FINANCIAL_ANALYST: false },
  { module: 'Trips', FLEET_MANAGER: true, DISPATCHER: true, SAFETY_OFFICER: false, FINANCIAL_ANALYST: false },
  { module: 'Maintenance', FLEET_MANAGER: true, DISPATCHER: false, SAFETY_OFFICER: false, FINANCIAL_ANALYST: false },
  { module: 'Fuel & Expenses', FLEET_MANAGER: true, DISPATCHER: false, SAFETY_OFFICER: false, FINANCIAL_ANALYST: true },
  { module: 'Analytics', FLEET_MANAGER: true, DISPATCHER: false, SAFETY_OFFICER: false, FINANCIAL_ANALYST: true },
  { module: 'Settings', FLEET_MANAGER: true, DISPATCHER: false, SAFETY_OFFICER: false, FINANCIAL_ANALYST: false },
]

type RoleName = 'FLEET_MANAGER' | 'DISPATCHER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST'
const ROLE_LABELS: Record<RoleName, string> = {
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
}

export default function SettingsPage() {
  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="font-display text-headline-lg text-on-surface">Settings</h2>
        <p className="text-sm text-on-surface-variant mt-1">General configuration and role permissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General config */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-on-surface">General</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5" htmlFor="setting-depot-name">Depot Name</label>
                <input
                  id="setting-depot-name"
                  type="text"
                  defaultValue="TransitOps HQ"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm text-on-surface bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5" htmlFor="setting-currency">
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Currency
                </label>
                <select
                  id="setting-currency"
                  defaultValue="INR"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm text-on-surface bg-white focus:border-primary outline-none"
                >
                  <option value="INR">INR (Indian Rupee ₹)</option>
                  <option value="USD">USD (US Dollar $)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5" htmlFor="setting-distance-unit">
                  <Ruler className="w-3 h-3 inline mr-1" />
                  Distance Unit
                </label>
                <select
                  id="setting-distance-unit"
                  defaultValue="km"
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm text-on-surface bg-white focus:border-primary outline-none"
                >
                  <option value="km">Kilometers (km)</option>
                  <option value="mi">Miles (mi)</option>
                </select>
              </div>
              <button
                id="btn-save-settings"
                className="w-full py-2 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* RBAC matrix — read-only display */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-on-surface">Role Permissions Matrix</h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              This matrix reflects the current access control rules enforced server-side. Making it live-editable is a stretch goal (see roadmap).
            </p>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    {(Object.keys(ROLE_LABELS) as RoleName[]).map((r) => (
                      <th key={r} className="text-center">{ROLE_LABELS[r]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RBAC_MATRIX.map((row) => (
                    <tr key={row.module}>
                      <td className="font-medium text-on-surface text-xs">{row.module}</td>
                      {(Object.keys(ROLE_LABELS) as RoleName[]).map((r) => (
                        <td key={r} className="text-center">
                          {row[r] ? (
                            <span className="inline-block w-4 h-4 rounded-sm bg-status-available-bg text-status-available text-[10px] font-bold flex items-center justify-center mx-auto">✓</span>
                          ) : (
                            <span className="text-outline text-xs">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
