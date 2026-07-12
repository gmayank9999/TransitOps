import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Route as RouteIcon, ChevronLeft, ChevronRight,
  PlayCircle, CheckCircle, XCircle, Edit, MapPin, Navigation, Truck, User
} from 'lucide-react'
import { tripsApi, vehiclesApi, driversApi } from '@/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { extractError, formatCurrency } from '@/lib/utils'
import type { Trip, TripStatus, Vehicle, Driver } from '@/types'

// ------------------------------------------------------------------ //
// Zod schemas
// ------------------------------------------------------------------ //
const tripSchema = z.object({
  source: z.string().min(1, 'Source is required').max(150),
  destination: z.string().min(1, 'Destination is required').max(150),
  cargo_weight_kg: z.coerce.number().positive('Must be > 0'),
  planned_distance_km: z.coerce.number().positive('Must be > 0'),
  vehicle_id: z.coerce.number().optional().or(z.literal('')),
  driver_id: z.coerce.number().optional().or(z.literal('')),
})
type TripForm = z.infer<typeof tripSchema>

const completeSchema = z.object({
  actual_distance_km: z.coerce.number().positive('Must be > 0'),
  final_odometer_km: z.coerce.number().positive('Must be > 0'),
  fuel_liters: z.coerce.number().optional().or(z.literal('')),
  fuel_cost: z.coerce.number().optional().or(z.literal('')),
  revenue: z.coerce.number().optional().or(z.literal('')),
})
type CompleteForm = z.infer<typeof completeSchema>

const cancelSchema = z.object({
  reason: z.string().max(255).optional(),
})
type CancelForm = z.infer<typeof cancelSchema>

const STATUS_OPTIONS: Array<{ label: string; value: TripStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

// ------------------------------------------------------------------ //
// Trip Form Modal (Create/Edit Draft)
// ------------------------------------------------------------------ //
function TripModal({ trip, onClose }: { trip: Trip | null, onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()
  const isEdit = !!trip

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TripForm>({
    resolver: zodResolver(tripSchema),
    defaultValues: trip ? {
      source: trip.source,
      destination: trip.destination,
      cargo_weight_kg: Number(trip.cargo_weight_kg),
      planned_distance_km: Number(trip.planned_distance_km),
      vehicle_id: trip.vehicle_id || '',
      driver_id: trip.driver_id || '',
    } : {}
  })

  // Fetch available resources — only AVAILABLE vehicles (no retired/in-shop)
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'AVAILABLE'],
    queryFn: () => vehiclesApi.list({ status: 'AVAILABLE', limit: 1000 }).then(r => r.data.items),
  })
  
  // Filter out expired license and suspended drivers
  const { data: drivers } = useQuery({
    queryKey: ['drivers', 'AVAILABLE'],
    queryFn: () => driversApi.list({ status: 'AVAILABLE', limit: 1000 }).then(r => r.data.items),
    select: (items) => items.filter(d => {
      const expiryDate = new Date(d.license_expiry_date)
      return expiryDate >= new Date() // exclude expired licenses
    }),
  })

  const mutationFn = isEdit 
    ? (data: any) => tripsApi.update(trip.id, data)
    : (data: any) => tripsApi.create(data)

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      success(`Trip ${isEdit ? 'updated' : 'created'}`)
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: TripForm) => {
    const payload = {
      ...data,
      vehicle_id: data.vehicle_id === '' ? null : Number(data.vehicle_id),
      driver_id: data.driver_id === '' ? null : Number(data.driver_id),
    }
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <h3 className="font-display font-semibold text-base text-on-surface">
            {isEdit ? 'Edit Draft Trip' : 'Create Trip'}
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-mid transition-colors">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5"><MapPin className="w-3 h-3 inline mr-1" />Source *</label>
              <input {...register('source')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none" />
              {errors.source && <p className="mt-1 text-xs text-error">{errors.source.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5"><Navigation className="w-3 h-3 inline mr-1" />Destination *</label>
              <input {...register('destination')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none" />
              {errors.destination && <p className="mt-1 text-xs text-error">{errors.destination.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Cargo Weight (kg) *</label>
              <input type="number" step="0.01" {...register('cargo_weight_kg')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Planned Distance (km) *</label>
              <input type="number" step="0.01" {...register('planned_distance_km')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none" />
            </div>
          </div>

          <div className="border-t border-outline-variant pt-4 mt-2">
            <p className="text-xs font-semibold text-on-surface mb-3 uppercase tracking-wider">Assignment (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5"><Truck className="w-3 h-3 inline mr-1"/>Vehicle</label>
                <select {...register('vehicle_id')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none">
                  <option value="">Unassigned</option>
                  {vehicles?.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} — {v.name_model} ({v.max_load_capacity_kg}kg)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5"><User className="w-3 h-3 inline mr-1"/>Driver</label>
                <select {...register('driver_id')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none">
                  <option value="">Unassigned</option>
                  {drivers?.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name} — {d.license_number} (Score: {d.safety_score})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 rounded-lg border border-outline-variant text-sm font-medium hover:bg-surface-mid transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50">
              {isEdit ? 'Save Changes' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Complete Trip Modal
// ------------------------------------------------------------------ //
function CompleteModal({ tripId, onClose }: { tripId: number, onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema)
  })

  const mutation = useMutation({
    mutationFn: (data: any) => tripsApi.complete(tripId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Trip completed')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: CompleteForm) => {
    mutation.mutate({
      actual_distance_km: Number(data.actual_distance_km),
      final_odometer_km: Number(data.final_odometer_km),
      fuel_liters: data.fuel_liters ? Number(data.fuel_liters) : null,
      fuel_cost: data.fuel_cost ? Number(data.fuel_cost) : null,
      revenue: data.revenue ? Number(data.revenue) : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="p-5 border-b border-outline-variant flex justify-between">
          <h3 className="font-semibold">Complete Trip #{tripId}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Actual Dist. (km) *</label>
              <input type="number" step="0.01" {...register('actual_distance_km')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Final Odometer *</label>
              <input type="number" step="0.01" {...register('final_odometer_km')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div className="border-t border-outline-variant pt-3 mt-2">
            <p className="text-xs text-on-surface-variant mb-2">Optional Additions</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5">Fuel (Liters)</label>
                <input type="number" step="0.01" {...register('fuel_liters')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Fuel Cost (₹)</label>
                <input type="number" step="0.01" {...register('fuel_cost')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium mb-1.5">Revenue (₹)</label>
              <input type="number" step="0.01" {...register('revenue')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-lg bg-status-available-bg text-status-available font-semibold hover:opacity-80">
            Complete
          </button>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Cancel Trip Modal
// ------------------------------------------------------------------ //
function CancelModal({ tripId, onClose }: { tripId: number, onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<CancelForm>({
    resolver: zodResolver(cancelSchema)
  })

  const mutation = useMutation({
    mutationFn: (data: any) => tripsApi.cancel(tripId, data.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Trip cancelled')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: CancelForm) => {
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="p-5 border-b border-outline-variant flex justify-between">
          <h3 className="font-semibold text-error">Cancel Trip #{tripId}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">Reason (Optional)</label>
            <input {...register('reason')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-error" placeholder="e.g. Vehicle broke down" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-2 rounded-lg bg-error text-white font-semibold hover:bg-error/90">
            Cancel Trip
          </button>
        </form>
      </div>
    </div>
  )
}


// ------------------------------------------------------------------ //
// Main Page
// ------------------------------------------------------------------ //
export default function TripsPage() {
  const { hasRole } = useAuth()
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<TripStatus | ''>('')
  
  const [modalTrip, setModalTrip] = useState<Trip | null | 'new'>(null)
  const [completeTripId, setCompleteTripId] = useState<number | null>(null)
  const [cancelTripId, setCancelTripId] = useState<number | null>(null)

  const canManage = hasRole('FLEET_MANAGER', 'DISPATCHER', 'ADMIN')

  const { data, isLoading } = useQuery({
    queryKey: ['trips', page, statusFilter],
    queryFn: () => tripsApi.list({
      page, limit: 15, ...(statusFilter && { status: statusFilter })
    }).then(r => r.data)
  })

  // Fetch vehicle/driver lookup for name resolution
  const { data: allVehicles } = useQuery({
    queryKey: ['vehicles-lookup'],
    queryFn: () => vehiclesApi.list({ limit: 1000 }).then(r => r.data.items),
    staleTime: 60_000,
  })
  const { data: allDrivers } = useQuery({
    queryKey: ['drivers-lookup'],
    queryFn: () => driversApi.list({ limit: 1000 }).then(r => r.data.items),
    staleTime: 60_000,
  })

  const vehicleMap = new Map<number, Vehicle>()
  allVehicles?.forEach(v => vehicleMap.set(v.id, v))
  const driverMap = new Map<number, Driver>()
  allDrivers?.forEach(d => driverMap.set(d.id, d))

  const dispatchMutation = useMutation({
    mutationFn: (id: number) => tripsApi.dispatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Trip dispatched')
    },
    onError: (err) => toastError(extractError(err)),
  })

  const totalPages = data ? Math.ceil(data.total / 15) : 1

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Trip Dispatcher</h2>
          <p className="text-sm text-on-surface-variant mt-1">{data?.total ?? 0} trips total</p>
        </div>
        {canManage && (
          <button onClick={() => setModalTrip('new')} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container shadow-card">
            <Plus className="w-4 h-4" /> Add Trip
          </button>
        )}
      </div>

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as TripStatus | ''); setPage(1) }} className="px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white outline-none focus:border-primary">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-surface-mid rounded-lg animate-pulse" />)}
            </div>
          ) : data?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RouteIcon className="w-10 h-10 text-primary/30 mb-3" />
              <p className="font-semibold text-on-surface">No trips found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Route</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Cargo / Dist.</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data?.items.map(t => {
                  const vehicle = t.vehicle_id ? vehicleMap.get(t.vehicle_id) : null
                  const driver = t.driver_id ? driverMap.get(t.driver_id) : null
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-xs">#{t.id}</td>
                      <td>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="truncate max-w-[120px]">{t.source}</span>
                          <ChevronRight className="w-3 h-3 text-on-surface-variant" />
                          <span className="truncate max-w-[120px]">{t.destination}</span>
                        </div>
                      </td>
                      <td>
                        {vehicle ? (
                          <div>
                            <span className="font-mono text-xs font-semibold">{vehicle.registration_number}</span>
                            <p className="text-[10px] text-on-surface-variant">{vehicle.name_model}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Unassigned</span>
                        )}
                      </td>
                      <td>
                        {driver ? (
                          <span className="text-sm">{driver.full_name}</span>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Unassigned</span>
                        )}
                      </td>
                      <td className="text-sm">
                        {Number(t.cargo_weight_kg)} kg / {Number(t.planned_distance_km)} km
                      </td>
                      <td>
                        <StatusBadge status={t.status} type="trip" />
                      </td>
                      {canManage && (
                        <td>
                          <div className="flex items-center gap-1">
                            {t.status === 'DRAFT' && (
                              <>
                                <button onClick={() => setModalTrip(t)} title="Edit Draft" className="p-1.5 rounded hover:bg-surface-mid text-on-surface-variant hover:text-primary"><Edit className="w-4 h-4"/></button>
                                <button onClick={() => dispatchMutation.mutate(t.id)} title="Dispatch" className="p-1.5 rounded hover:bg-status-on-trip-bg text-on-surface-variant hover:text-status-on-trip"><PlayCircle className="w-4 h-4"/></button>
                              </>
                            )}
                            {t.status === 'DISPATCHED' && (
                              <button onClick={() => setCompleteTripId(t.id)} title="Complete" className="p-1.5 rounded hover:bg-status-available-bg text-on-surface-variant hover:text-status-available"><CheckCircle className="w-4 h-4"/></button>
                            )}
                            {(t.status === 'DRAFT' || t.status === 'DISPATCHED') && (
                              <button onClick={() => setCancelTripId(t.id)} title="Cancel" className="p-1.5 rounded hover:bg-error/10 text-on-surface-variant hover:text-error"><XCircle className="w-4 h-4"/></button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-outline-variant disabled:opacity-40 hover:bg-surface-mid"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-outline-variant disabled:opacity-40 hover:bg-surface-mid"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {modalTrip !== null && <TripModal trip={modalTrip === 'new' ? null : modalTrip} onClose={() => setModalTrip(null)} />}
      {completeTripId !== null && <CompleteModal tripId={completeTripId} onClose={() => setCompleteTripId(null)} />}
      {cancelTripId !== null && <CancelModal tripId={cancelTripId} onClose={() => setCancelTripId(null)} />}
    </div>
  )
}
