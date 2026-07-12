// Shared TypeScript types — mirroring backend Pydantic schemas

export type UserRole =
  | 'FLEET_MANAGER'
  | 'DISPATCHER'
  | 'SAFETY_OFFICER'
  | 'FINANCIAL_ANALYST'
  | 'ADMIN'

export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'IN_SHOP' | 'RETIRED'
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'SUSPENDED'
export type TripStatus = 'DRAFT' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED'
export type MaintenanceStatus = 'OPEN' | 'CLOSED'
export type ExpenseCategory = 'TOLL' | 'MAINTENANCE' | 'FUEL' | 'OTHER'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface AuthState {
  user: User | null
  access_token: string | null
  refresh_token: string | null
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  role: UserRole
  user_id: number
  full_name: string
}

export interface Vehicle {
  id: number
  registration_number: string
  name_model: string
  vehicle_type: string
  max_load_capacity_kg: number
  odometer_km: number
  acquisition_cost: number
  status: VehicleStatus
  region: string | null
}

export interface Driver {
  id: number
  full_name: string
  license_number: string
  license_category: string
  license_expiry_date: string
  contact_number: string
  safety_score: number
  status: DriverStatus
  trip_completion_pct: number | null
}

export interface Trip {
  id: number
  source: string
  destination: string
  vehicle_id: number | null
  driver_id: number | null
  cargo_weight_kg: number
  planned_distance_km: number
  actual_distance_km: number | null
  revenue: number | null
  status: TripStatus
  cancellation_reason: string | null
  dispatched_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_by: number
  created_at: string
  assignment_label: string | null
}

export interface MaintenanceLog {
  id: number
  vehicle_id: number
  description: string
  cost: number
  status: MaintenanceStatus
  opened_at: string
  closed_at: string | null
  created_by: number
}

export interface FuelLog {
  id: number
  vehicle_id: number
  trip_id: number | null
  liters: number
  cost: number
  log_date: string
  created_by: number
  created_at: string
}

export interface Expense {
  id: number
  vehicle_id: number
  category: ExpenseCategory
  amount: number
  description: string | null
  expense_date: string
  created_by: number
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface DashboardKPIs {
  vehicles: {
    total: number
    available: number
    on_trip: number
    in_shop: number
    retired: number
  }
  trips: {
    active: number
    pending: number
    completed: number
  }
  drivers: {
    total: number
    on_trip: number
    available: number
  }
  fleet_utilization_pct: number
}

export interface ActivityEvent {
  id: number
  message: string
  icon: string
  performed_by: number | null
  performed_at: string
  table: string
  action: string
}

export interface FuelEfficiencyReport {
  vehicle_id: number
  registration_number: string
  name_model: string
  vehicle_type: string
  total_distance_km: number
  total_fuel_liters: number
  efficiency_km_per_liter: number | null
}

export interface OperationalCostReport {
  vehicle_id: number
  registration_number: string
  name_model: string
  vehicle_type: string
  fuel_cost: number
  maintenance_cost: number
  total_operational_cost: number
}

export interface ROIReport {
  vehicle_id: number
  registration_number: string
  name_model: string
  acquisition_cost: number
  total_revenue: number
  total_operational_cost: number
  roi: number | null
}

export interface MonthlyRevenueReport {
  year: number
  month: number
  month_label: string
  total_revenue: number
  trip_count: number
}

export interface ApiError {
  detail: string
  error_code?: string
  field?: string
}
