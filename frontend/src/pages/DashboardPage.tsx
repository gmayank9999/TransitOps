import { useQuery } from '@tanstack/react-query'
import {
  Truck,
  Users,
  Route,
  TrendingUp,
  Activity,
  Plus,
  PlusCircle,
  Send,
  CheckCircle,
  XCircle,
  Edit,
  UserPlus,
  UserCheck,
  CheckSquare,
  Droplets,
  DollarSign,
  Info,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { dashboardApi, reportsApi } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { formatDistanceToNow } from '@/lib/utils'

// ------------------------------------------------------------------ //
// KPI Card
// ------------------------------------------------------------------ //
interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  iconBg: string
  sub?: string
  trend?: { value: string; up: boolean }
}

function KpiCard({ label, value, icon: Icon, iconBg, sub, trend }: KpiCardProps) {
  return (
    <div className="card card-hover p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend.up ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-display font-bold text-on-surface">{value}</p>
      <p className="text-sm font-medium text-on-surface mt-0.5">{label}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  )
}

// ------------------------------------------------------------------ //
// Activity icon map
// ------------------------------------------------------------------ //
const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  'plus-circle': PlusCircle,
  send: Send,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  edit: Edit,
  truck: Truck,
  activity: Activity,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  'check-square': CheckSquare,
  droplet: Droplets,
  'dollar-sign': DollarSign,
  info: Info,
}

const VEHICLE_PIE_COLORS = ['#006973', '#650cd9', '#952a00', '#ba1a1a']

// ------------------------------------------------------------------ //
// Dashboard page
// ------------------------------------------------------------------ //
export default function DashboardPage() {
  const { user } = useAuth()

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardApi.kpis().then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.activity(15).then((r) => r.data),
    refetchInterval: 15_000,
  })

  const { data: monthlyRevenue } = useQuery({
    queryKey: ['monthly-revenue'],
    queryFn: () => reportsApi.monthlyRevenue().then((r) => r.data),
  })

  const vehiclePieData = kpis
    ? [
        { name: 'Available', value: kpis.vehicles.available },
        { name: 'On Trip', value: kpis.vehicles.on_trip },
        { name: 'In Shop', value: kpis.vehicles.in_shop },
        { name: 'Retired', value: kpis.vehicles.retired },
      ].filter((d) => d.value > 0)
    : []

  if (kpisLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-32 animate-pulse bg-surface-mid" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <h2 className="font-display text-headline-lg text-on-surface">Dashboard</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Good {getGreeting()}, {user?.full_name?.split(' ')[0]}. Here's what's happening with your fleet.
        </p>
      </div>

      {/* Hero KPI banner */}
      <div className="card p-5 mb-6 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl shadow-modal">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Fleet Utilization</p>
            <p className="text-4xl font-display font-bold mt-1">{kpis?.fleet_utilization_pct ?? 0}%</p>
            <p className="text-xs opacity-70 mt-1">Vehicles currently on active trips</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>

      {/* KPI cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Vehicles"
          value={kpis?.vehicles.total ?? 0}
          icon={Truck}
          iconBg="bg-primary/10 text-primary"
          sub={`${kpis?.vehicles.available ?? 0} available`}
        />
        <KpiCard
          label="Active Trips"
          value={kpis?.trips.active ?? 0}
          icon={Route}
          iconBg="bg-secondary/10 text-secondary"
          sub={`${kpis?.trips.pending ?? 0} pending dispatch`}
        />
        <KpiCard
          label="Drivers on Duty"
          value={(kpis?.drivers.on_trip ?? 0) + (kpis?.drivers.available ?? 0)}
          icon={Users}
          iconBg="bg-amber-50 text-amber-600"
          sub={`${kpis?.drivers.on_trip ?? 0} currently on trip`}
        />
        <KpiCard
          label="Vehicles In Shop"
          value={kpis?.vehicles.in_shop ?? 0}
          icon={Activity}
          iconBg="bg-error/10 text-error"
          sub="Under maintenance"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Monthly revenue bar chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold text-base text-on-surface mb-4">Monthly Revenue</h3>
          {monthlyRevenue && monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyRevenue} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8eeff" vertical={false} />
                <XAxis
                  dataKey="month_label"
                  tick={{ fontSize: 11, fill: '#4a4455' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#4a4455' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #ccc3d8' }}
                  formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="total_revenue" fill="#650cd9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-on-surface-variant">
              No revenue data yet — complete some trips to see this chart.
            </div>
          )}
        </div>

        {/* Vehicle status pie */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-base text-on-surface mb-4">Fleet Status</h3>
          {vehiclePieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={vehiclePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {vehiclePieData.map((_, index) => (
                      <Cell key={index} fill={VEHICLE_PIE_COLORS[index % VEHICLE_PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {vehiclePieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: VEHICLE_PIE_COLORS[index] }}
                      />
                      <span className="text-on-surface-variant">{entry.name}</span>
                    </div>
                    <span className="font-semibold text-on-surface">{entry.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-on-surface-variant">
              No vehicle data
            </div>
          )}
        </div>
      </div>

      {/* Activity timeline */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-base text-on-surface mb-4">Activity Timeline</h3>
        {activityLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-surface-mid flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface-mid rounded w-3/4" />
                  <div className="h-2.5 bg-surface-mid rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : activity && activity.length > 0 ? (
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {activity.map((event) => {
              const Icon = ACTIVITY_ICONS[event.icon] ?? Info
              return (
                <div key={event.id} className="flex items-start gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-surface-mid flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-on-surface-variant" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface leading-snug">{event.message}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {event.performed_at ? formatDistanceToNow(event.performed_at) : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-sm text-on-surface-variant">
            No activity yet — start using the platform to see the timeline.
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
