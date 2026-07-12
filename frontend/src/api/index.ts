import { apiClient } from './client'
import type {
  TokenResponse,
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  FuelLog,
  Expense,
  DashboardKPIs,
  ActivityEvent,
  PaginatedResponse,
  FuelEfficiencyReport,
  OperationalCostReport,
  ROIReport,
  MonthlyRevenueReport,
} from '@/types'

// ------------------------------------------------------------------ //
// Auth
// ------------------------------------------------------------------ //
export const authApi = {
  login: (email: string, password: string, remember_me: boolean) =>
    apiClient.post<TokenResponse>('/auth/login', { email, password, remember_me }),

  me: () => apiClient.get('/auth/me'),

  refresh: (refresh_token: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token }),
}

// ------------------------------------------------------------------ //
// Vehicles
// ------------------------------------------------------------------ //
export const vehiclesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Vehicle>>('/vehicles', { params }),

  get: (id: number) => apiClient.get<Vehicle>(`/vehicles/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Vehicle>('/vehicles', data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put<Vehicle>(`/vehicles/${id}`, data),

  retire: (id: number) => apiClient.post<Vehicle>(`/vehicles/${id}/retire`),
}

// ------------------------------------------------------------------ //
// Drivers
// ------------------------------------------------------------------ //
export const driversApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Driver>>('/drivers', { params }),

  get: (id: number) => apiClient.get<Driver>(`/drivers/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Driver>('/drivers', data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put<Driver>(`/drivers/${id}`, data),

  toggleStatus: (id: number, status: string) =>
    apiClient.post<Driver>(`/drivers/${id}/status`, { status }),

  suspend: (id: number) => apiClient.post<Driver>(`/drivers/${id}/suspend`),

  reinstate: (id: number) => apiClient.post<Driver>(`/drivers/${id}/reinstate`),
}

// ------------------------------------------------------------------ //
// Trips
// ------------------------------------------------------------------ //
export const tripsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Trip>>('/trips', { params }),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Trip>('/trips', data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient.put<Trip>(`/trips/${id}`, data),

  dispatch: (id: number) => apiClient.post<Trip>(`/trips/${id}/dispatch`),

  complete: (id: number, data: Record<string, unknown>) =>
    apiClient.post<Trip>(`/trips/${id}/complete`, data),

  cancel: (id: number, reason?: string) =>
    apiClient.post<Trip>(`/trips/${id}/cancel`, { reason }),
}

// ------------------------------------------------------------------ //
// Maintenance
// ------------------------------------------------------------------ //
export const maintenanceApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<MaintenanceLog>>('/maintenance', { params }),

  create: (data: Record<string, unknown>) =>
    apiClient.post<MaintenanceLog>('/maintenance', data),

  close: (id: number) => apiClient.post<MaintenanceLog>(`/maintenance/${id}/close`),
}

// ------------------------------------------------------------------ //
// Fuel logs
// ------------------------------------------------------------------ //
export const fuelApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<FuelLog>>('/fuel-logs', { params }),

  create: (data: Record<string, unknown>) =>
    apiClient.post<FuelLog>('/fuel-logs', data),
}

// ------------------------------------------------------------------ //
// Expenses
// ------------------------------------------------------------------ //
export const expensesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Expense>>('/expenses', { params }),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Expense>('/expenses', data),
}

// ------------------------------------------------------------------ //
// Dashboard
// ------------------------------------------------------------------ //
export const dashboardApi = {
  kpis: (params?: { region?: string; vehicle_type?: string }) =>
    apiClient.get<DashboardKPIs>('/dashboard/kpis', { params }),

  activity: (limit?: number) =>
    apiClient.get<ActivityEvent[]>('/dashboard/activity', { params: { limit } }),
}

// ------------------------------------------------------------------ //
// Reports
// ------------------------------------------------------------------ //
export const reportsApi = {
  fuelEfficiency: () =>
    apiClient.get<FuelEfficiencyReport[]>('/reports/fuel-efficiency'),

  operationalCost: () =>
    apiClient.get<OperationalCostReport[]>('/reports/operational-cost'),

  roi: () => apiClient.get<ROIReport[]>('/reports/roi'),

  monthlyRevenue: () =>
    apiClient.get<MonthlyRevenueReport[]>('/reports/monthly-revenue'),

  topCostliest: (top_n?: number) =>
    apiClient.get<OperationalCostReport[]>('/reports/top-costliest-vehicles', {
      params: { top_n },
    }),

  exportCsv: (report: string) =>
    apiClient.get(`/reports/export.csv`, {
      params: { report },
      responseType: 'blob',
    }),
}
