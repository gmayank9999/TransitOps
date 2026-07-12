import { useQuery } from '@tanstack/react-query'
import { Download, TrendingUp, DollarSign, Fuel, BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { reportsApi } from '@/api'
import { formatCurrency, downloadBlob } from '@/lib/utils'

function SectionHeader({ title, reportKey }: { title: string; reportKey: string }) {
  const handleExport = async () => {
    try {
      const res = await reportsApi.exportCsv(reportKey)
      downloadBlob(res.data as Blob, `${reportKey}.csv`)
    } catch {
      alert('Export failed')
    }
  }
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-display font-semibold text-base text-on-surface">{title}</h3>
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        id={`btn-export-${reportKey}`}
      >
        <Download className="w-3.5 h-3.5" />
        Export CSV
      </button>
    </div>
  )
}

export default function ReportsPage() {
  const { data: fuelEff } = useQuery({
    queryKey: ['report-fuel-efficiency'],
    queryFn: () => reportsApi.fuelEfficiency().then((r) => r.data),
  })
  const { data: opCost } = useQuery({
    queryKey: ['report-op-cost'],
    queryFn: () => reportsApi.operationalCost().then((r) => r.data),
  })
  const { data: roi } = useQuery({
    queryKey: ['report-roi'],
    queryFn: () => reportsApi.roi().then((r) => r.data),
  })
  const { data: topCostly } = useQuery({
    queryKey: ['report-top-costly'],
    queryFn: () => reportsApi.topCostliest(8).then((r) => r.data),
  })

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="font-display text-headline-lg text-on-surface">Analytics</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Fleet performance, cost analysis, and ROI reporting.
        </p>
      </div>

      <div className="space-y-6">
        {/* Fuel Efficiency */}
        <div className="card p-5">
          <SectionHeader title="Fuel Efficiency (km / L)" reportKey="fuel-efficiency" />
          {fuelEff && fuelEff.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fuelEff.filter(v => v.efficiency_km_per_liter !== null)} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eeff" vertical={false} />
                <XAxis dataKey="registration_number" tick={{ fontSize: 11, fill: '#4a4455' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#4a4455' }} axisLine={false} tickLine={false} unit=" km/L" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #ccc3d8' }} formatter={(v: number) => [`${v} km/L`, 'Efficiency']} />
                <Bar dataKey="efficiency_km_per_liter" fill="#006973" radius={[4, 4, 0, 0]} name="Efficiency" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-on-surface-variant py-8 text-center">No fuel data available yet.</p>
          )}
        </div>

        {/* Operational Cost */}
        <div className="card p-5">
          <SectionHeader title="Operational Cost per Vehicle" reportKey="operational-cost" />
          {opCost && opCost.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={opCost} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eeff" vertical={false} />
                <XAxis dataKey="registration_number" tick={{ fontSize: 10, fill: '#4a4455' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#4a4455' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [formatCurrency(v)]} />
                <Bar dataKey="fuel_cost" fill="#650cd9" radius={[0, 0, 0, 0]} name="Fuel Cost" stackId="a" />
                <Bar dataKey="maintenance_cost" fill="#7e3af2" radius={[4, 4, 0, 0]} name="Maintenance Cost" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-on-surface-variant py-8 text-center">No cost data available yet.</p>
          )}
        </div>

        {/* Top Costliest Vehicles */}
        <div className="card p-5">
          <SectionHeader title="Top Costliest Vehicles" reportKey="top-costliest-vehicles" />
          {topCostly && topCostly.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Registration</th>
                    <th>Model</th>
                    <th>Fuel Cost</th>
                    <th>Maintenance Cost</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topCostly.map((v, i) => (
                    <tr key={v.vehicle_id}>
                      <td className="font-semibold text-on-surface-variant">{i + 1}</td>
                      <td className="font-mono text-xs">{v.registration_number}</td>
                      <td className="text-on-surface-variant">{v.name_model}</td>
                      <td>{formatCurrency(v.fuel_cost)}</td>
                      <td>{formatCurrency(v.maintenance_cost)}</td>
                      <td className="font-semibold text-primary">{formatCurrency(v.total_operational_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-8 text-center">No data available yet.</p>
          )}
        </div>

        {/* ROI */}
        <div className="card p-5">
          <SectionHeader title="Vehicle ROI" reportKey="roi" />
          {roi && roi.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Acquisition Cost</th>
                    <th>Revenue</th>
                    <th>Op. Cost</th>
                    <th>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {roi.map((v) => (
                    <tr key={v.vehicle_id}>
                      <td>
                        <div>
                          <p className="font-mono text-xs font-semibold">{v.registration_number}</p>
                          <p className="text-xs text-on-surface-variant">{v.name_model}</p>
                        </div>
                      </td>
                      <td>{formatCurrency(v.acquisition_cost)}</td>
                      <td>{formatCurrency(v.total_revenue)}</td>
                      <td>{formatCurrency(v.total_operational_cost)}</td>
                      <td>
                        {v.roi !== null ? (
                          <span className={`font-semibold ${v.roi >= 0 ? 'text-status-available' : 'text-error'}`}>
                            {(v.roi * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-xs">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-8 text-center">No ROI data yet — complete trips with revenue to calculate.</p>
          )}
        </div>
      </div>
    </div>
  )
}
