import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Filter, Truck, ChevronLeft, ChevronRight,
  Edit, PowerOff, X, AlertCircle, Loader2
} from 'lucide-react'
import { vehiclesApi } from '@/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { extractError, formatCurrency } from '@/lib/utils'
import type { Vehicle, VehicleStatus } from '@/types'

// ------------------------------------------------------------------ //
// Zod schema
// ------------------------------------------------------------------ //
const vehicleSchema = z.object({
  registration_number: z.string().min(1).max(20),
  name_model: z.string().min(1).max(100),
  vehicle_type: z.string().min(1),
  max_load_capacity_kg: z.coerce.number().positive('Must be > 0'),
  odometer_km: z.coerce.number().min(0, 'Cannot be negative'),
  acquisition_cost: z.coerce.number().min(0, 'Cannot be negative'),
  region: z.string().optional(),
})
type VehicleForm = z.infer<typeof vehicleSchema>

const VEHICLE_TYPES = ['Truck', 'Van', 'Mini-Truck', 'Pickup', 'Rickshaw', 'Bus', 'Other']
const STATUS_OPTIONS: Array<{ label: string; value: VehicleStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'On Trip', value: 'ON_TRIP' },
  { label: 'In Shop', value: 'IN_SHOP' },
  { label: 'Retired', value: 'RETIRED' },
]

// ------------------------------------------------------------------ //
// Modal
// ------------------------------------------------------------------ //
function VehicleModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()
  const isEdit = !!vehicle

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle
      ? {
          registration_number: vehicle.registration_number,
          name_model: vehicle.name_model,
          vehicle_type: vehicle.vehicle_type,
          max_load_capacity_kg: Number(vehicle.max_load_capacity_kg),
          odometer_km: Number(vehicle.odometer_km),
          acquisition_cost: Number(vehicle.acquisition_cost),
          region: vehicle.region ?? '',
        }
      : {},
  })

  const createMutation = useMutation({
    mutationFn: (data: VehicleForm) => vehiclesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      success('Vehicle added to fleet')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: VehicleForm) => vehiclesApi.update(vehicle!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      success('Vehicle updated')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: VehicleForm) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div>
            <h3 className="font-display font-semibold text-base text-on-surface">
              {isEdit ? 'Edit Vehicle' : 'Add Vehicle to Fleet'}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isEdit ? `Editing ${vehicle.registration_number}` : 'Register a new vehicle'}
            </p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-mid transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Reg number */}
          <div className="grid grid-cols-2 gap-3">
            <div className={isEdit ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Registration Number *</label>
              <input
                {...register('registration_number')}
                readOnly={isEdit}
                placeholder="e.g. MH-12-AB-1234"
                className={`w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono
                  ${isEdit ? 'bg-surface-mid text-on-surface-variant cursor-not-allowed' : 'bg-white'}
                  ${errors.registration_number ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
              />
              {errors.registration_number && <p className="mt-1 text-xs text-error">{errors.registration_number.message}</p>}
            </div>
            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Vehicle Type *</label>
                <select {...register('vehicle_type')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none">
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.vehicle_type && <p className="mt-1 text-xs text-error">{errors.vehicle_type.message}</p>}
              </div>
            )}
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Vehicle Type *</label>
              <select {...register('vehicle_type')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none">
                {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Model Name *</label>
            <input
              {...register('name_model')}
              placeholder="e.g. Tata Prima 4928.S"
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none
                ${errors.name_model ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
            />
            {errors.name_model && <p className="mt-1 text-xs text-error">{errors.name_model.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Load Capacity (kg) *</label>
              <input
                type="number"
                step="0.01"
                {...register('max_load_capacity_kg')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none
                  ${errors.max_load_capacity_kg ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
              />
              {errors.max_load_capacity_kg && <p className="mt-1 text-xs text-error">{errors.max_load_capacity_kg.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Odometer (km)</label>
              <input
                type="number"
                step="0.01"
                {...register('odometer_km')}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Acquisition Cost (₹) *</label>
              <input
                type="number"
                step="1"
                {...register('acquisition_cost')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none
                  ${errors.acquisition_cost ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
              />
              {errors.acquisition_cost && <p className="mt-1 text-xs text-error">{errors.acquisition_cost.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Region</label>
              <input
                {...register('region')}
                placeholder="e.g. North"
                className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 rounded-lg border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-mid transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main page
// ------------------------------------------------------------------ //
export default function VehiclesPage() {
  const { hasRole } = useAuth()
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalVehicle, setModalVehicle] = useState<Vehicle | null | 'new'>(null)

  const canManage = hasRole('FLEET_MANAGER', 'ADMIN')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', page, statusFilter, typeFilter],
    queryFn: () =>
      vehiclesApi.list({
        page,
        limit: 15,
        ...(statusFilter && { status: statusFilter }),
        ...(typeFilter && { vehicle_type: typeFilter }),
      }).then((r) => r.data),
  })

  const retireMutation = useMutation({
    mutationFn: (id: number) => vehiclesApi.retire(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      success('Vehicle retired')
    },
    onError: (err) => toastError(extractError(err)),
  })

  const filtered = (data?.items ?? []).filter((v) =>
    search
      ? v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
        v.name_model.toLowerCase().includes(search.toLowerCase())
      : true
  )

  const totalPages = data ? Math.ceil(data.total / 15) : 1

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Fleet</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {data?.total ?? 0} vehicles registered
          </p>
        </div>
        {canManage && (
          <button
            id="btn-add-vehicle"
            onClick={() => setModalVehicle('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors shadow-card"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reg. number or model..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as VehicleStatus | ''); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none"
        >
          <option value="">All types</option>
          {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-mid rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Truck className="w-10 h-10 text-primary/30 mb-3" />
              <p className="font-semibold text-on-surface">No vehicles found</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {search || statusFilter || typeFilter ? 'Try adjusting your filters' : 'Add a vehicle to get started'}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Odometer</th>
                  <th>Acq. Cost</th>
                  <th>Region</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="font-mono text-xs font-semibold text-on-surface">{v.registration_number}</span>
                    </td>
                    <td className="text-on-surface font-medium text-sm">{v.name_model}</td>
                    <td className="text-on-surface-variant text-sm">{v.vehicle_type}</td>
                    <td className="text-sm">{Number(v.max_load_capacity_kg).toLocaleString()} kg</td>
                    <td className="text-sm">{Number(v.odometer_km).toLocaleString()} km</td>
                    <td className="text-sm">{formatCurrency(Number(v.acquisition_cost))}</td>
                    <td className="text-sm text-on-surface-variant">{v.region ?? '—'}</td>
                    <td><StatusBadge status={v.status} type="vehicle" /></td>
                    {canManage && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModalVehicle(v)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-surface-mid text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {v.status !== 'RETIRED' && (
                            <button
                              onClick={() => {
                                if (confirm(`Retire ${v.registration_number}?`)) retireMutation.mutate(v.id)
                              }}
                              title="Retire"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-error transition-colors"
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">
              Page {page} of {totalPages} &bull; {data?.total} total
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant disabled:opacity-40 hover:bg-surface-mid transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant disabled:opacity-40 hover:bg-surface-mid transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVehicle !== null && (
        <VehicleModal
          vehicle={modalVehicle === 'new' ? null : modalVehicle}
          onClose={() => setModalVehicle(null)}
        />
      )}
    </div>
  )
}
