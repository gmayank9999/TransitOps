import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Filter, Users, ChevronLeft, ChevronRight,
  Edit, ShieldAlert, ShieldCheck, AlertCircle, Loader2, Power
} from 'lucide-react'
import { driversApi } from '@/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { extractError } from '@/lib/utils'
import type { Driver, DriverStatus } from '@/types'

// ------------------------------------------------------------------ //
// Zod schema
// ------------------------------------------------------------------ //
const driverSchema = z.object({
  full_name: z.string().min(1).max(150),
  license_number: z.string().min(1).max(50),
  license_category: z.string().min(1).max(20),
  license_expiry_date: z.string().min(1),
  contact_number: z.string().min(1).max(20),
})
type DriverForm = z.infer<typeof driverSchema>

const LICENSE_CATEGORIES = ['LMV', 'HMV', 'Commercial', 'Two-Wheeler']
const STATUS_OPTIONS: Array<{ label: string; value: DriverStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'On Trip', value: 'ON_TRIP' },
  { label: 'Off Duty', value: 'OFF_DUTY' },
  { label: 'Suspended', value: 'SUSPENDED' },
]

// ------------------------------------------------------------------ //
// Modal
// ------------------------------------------------------------------ //
function DriverModal({
  driver,
  onClose,
}: {
  driver: Driver | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()
  const isEdit = !!driver

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: driver
      ? {
          full_name: driver.full_name,
          license_number: driver.license_number,
          license_category: driver.license_category,
          license_expiry_date: driver.license_expiry_date,
          contact_number: driver.contact_number,
        }
      : {},
  })

  const createMutation = useMutation({
    mutationFn: (data: DriverForm) => driversApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Driver added successfully')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: (data: DriverForm) => driversApi.update(driver!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Driver updated')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: DriverForm) => {
    if (isEdit) updateMutation.mutate(data)
    else createMutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div>
            <h3 className="font-display font-semibold text-base text-on-surface">
              {isEdit ? 'Edit Driver' : 'Register Driver'}
            </h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-mid transition-colors">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Full Name *</label>
            <input
              {...register('full_name')}
              placeholder="e.g. John Doe"
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none
                ${errors.full_name ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
            />
            {errors.full_name && <p className="mt-1 text-xs text-error">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">License Number *</label>
              <input
                {...register('license_number')}
                placeholder="e.g. DL-14-2021"
                className={`w-full px-3 py-2 rounded-lg border text-sm outline-none font-mono bg-white
                  ${errors.license_number ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
              />
              {errors.license_number && <p className="mt-1 text-xs text-error">{errors.license_number.message}</p>}
            </div>
            {!isEdit && (
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">License Category *</label>
                <select {...register('license_category')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none">
                  <option value="">Select category</option>
                  {LICENSE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.license_category && <p className="mt-1 text-xs text-error">{errors.license_category.message}</p>}
              </div>
            )}
          </div>

          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">License Category *</label>
              <select {...register('license_category')} className="w-full px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none">
                {LICENSE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">License Expiry Date *</label>
              <input
                type="date"
                {...register('license_expiry_date')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none
                  ${errors.license_expiry_date ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
              />
              {errors.license_expiry_date && <p className="mt-1 text-xs text-error">{errors.license_expiry_date.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Contact Number *</label>
              <input
                {...register('contact_number')}
                placeholder="+91..."
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none
                  ${errors.contact_number ? 'border-error' : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'}`}
              />
              {errors.contact_number && <p className="mt-1 text-xs text-error">{errors.contact_number.message}</p>}
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
              {isEdit ? 'Save Changes' : 'Register Driver'}
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
export default function DriversPage() {
  const { hasRole } = useAuth()
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DriverStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalDriver, setModalDriver] = useState<Driver | null | 'new'>(null)

  const canManage = hasRole('FLEET_MANAGER', 'SAFETY_OFFICER', 'ADMIN')
  const isDispatcher = hasRole('DISPATCHER')

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, statusFilter, categoryFilter],
    queryFn: () =>
      driversApi.list({
        page,
        limit: 15,
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { license_category: categoryFilter }),
      }).then((r) => r.data),
  })

  const suspendMutation = useMutation({
    mutationFn: (id: number) => driversApi.suspend(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Driver suspended')
    },
    onError: (err) => toastError(extractError(err)),
  })

  const reinstateMutation = useMutation({
    mutationFn: (id: number) => driversApi.reinstate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Driver reinstated')
    },
    onError: (err) => toastError(extractError(err)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: DriverStatus }) => driversApi.toggleStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] })
      success('Status updated')
    },
    onError: (err) => toastError(extractError(err)),
  })

  const filtered = (data?.items ?? []).filter((d) =>
    search
      ? d.full_name.toLowerCase().includes(search.toLowerCase()) ||
        d.license_number.toLowerCase().includes(search.toLowerCase())
      : true
  )

  const totalPages = data ? Math.ceil(data.total / 15) : 1

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Drivers</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {data?.total ?? 0} drivers registered
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setModalDriver('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors shadow-card"
          >
            <Plus className="w-4 h-4" />
            Add Driver
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
            placeholder="Search name or license..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as DriverStatus | ''); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white focus:border-primary outline-none"
        >
          <option value="">All categories</option>
          {LICENSE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
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
              <Users className="w-10 h-10 text-primary/30 mb-3" />
              <p className="font-semibold text-on-surface">No drivers found</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {search || statusFilter || categoryFilter ? 'Try adjusting your filters' : 'Add a driver to get started'}
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>License Number</th>
                  <th>Category</th>
                  <th>Expiry</th>
                  <th>Contact</th>
                  <th>Safety Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="text-on-surface font-medium text-sm">{d.full_name}</span>
                    </td>
                    <td className="font-mono text-xs font-semibold text-on-surface-variant">{d.license_number}</td>
                    <td className="text-sm">{d.license_category}</td>
                    <td className="text-sm">
                      <span className={new Date(d.license_expiry_date) < new Date() ? 'text-error font-medium' : ''}>
                        {d.license_expiry_date}
                      </span>
                    </td>
                    <td className="text-sm text-on-surface-variant">{d.contact_number}</td>
                    <td>
                      <span className={`text-sm font-semibold ${d.safety_score < 80 ? 'text-error' : d.safety_score < 90 ? 'text-amber-500' : 'text-status-available'}`}>
                        {d.safety_score}
                      </span>
                    </td>
                    <td><StatusBadge status={d.status} type="driver" /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button
                            onClick={() => setModalDriver(d)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-surface-mid text-on-surface-variant hover:text-primary transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(canManage || isDispatcher) && (
                           d.status === 'AVAILABLE' ? (
                             <button
                               onClick={() => statusMutation.mutate({ id: d.id, status: 'OFF_DUTY' })}
                               title="Set Off Duty"
                               className="p-1.5 rounded-lg hover:bg-surface-mid text-on-surface-variant hover:text-amber-500 transition-colors"
                             >
                               <Power className="w-3.5 h-3.5" />
                             </button>
                           ) : d.status === 'OFF_DUTY' ? (
                             <button
                               onClick={() => statusMutation.mutate({ id: d.id, status: 'AVAILABLE' })}
                               title="Set Available"
                               className="p-1.5 rounded-lg hover:bg-surface-mid text-on-surface-variant hover:text-status-available transition-colors"
                             >
                               <Power className="w-3.5 h-3.5" />
                             </button>
                           ) : null
                        )}
                        {canManage && (
                           d.status === 'SUSPENDED' ? (
                             <button
                               onClick={() => reinstateMutation.mutate(d.id)}
                               title="Reinstate"
                               className="p-1.5 rounded-lg hover:bg-status-available-bg text-on-surface-variant hover:text-status-available transition-colors"
                             >
                               <ShieldCheck className="w-3.5 h-3.5" />
                             </button>
                           ) : d.status !== 'ON_TRIP' && d.status !== 'SUSPENDED' ? (
                             <button
                               onClick={() => {
                                 if (confirm(`Suspend driver ${d.full_name}?`)) suspendMutation.mutate(d.id)
                               }}
                               title="Suspend"
                               className="p-1.5 rounded-lg hover:bg-red-50 text-on-surface-variant hover:text-error transition-colors"
                             >
                               <ShieldAlert className="w-3.5 h-3.5" />
                             </button>
                           ) : null
                        )}
                      </div>
                    </td>
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
      {modalDriver !== null && (
        <DriverModal
          driver={modalDriver === 'new' ? null : modalDriver}
          onClose={() => setModalDriver(null)}
        />
      )}
    </div>
  )
}
