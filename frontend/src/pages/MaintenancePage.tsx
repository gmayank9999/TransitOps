import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Wrench, ChevronLeft, ChevronRight, CheckCircle, Truck
} from 'lucide-react'
import { maintenanceApi, vehiclesApi } from '@/api'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { extractError, formatCurrency } from '@/lib/utils'
import type { MaintenanceLog, MaintenanceStatus } from '@/types'

// ------------------------------------------------------------------ //
// Zod schema
// ------------------------------------------------------------------ //
const maintenanceSchema = z.object({
  vehicle_id: z.coerce.number().positive('Vehicle is required'),
  description: z.string().min(1, 'Description is required').max(255),
  cost: z.coerce.number().min(0, 'Cost cannot be negative').optional(),
})
type MaintenanceForm = z.infer<typeof maintenanceSchema>

const STATUS_OPTIONS: Array<{ label: string; value: MaintenanceStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Closed', value: 'CLOSED' },
]

// ------------------------------------------------------------------ //
// Modal
// ------------------------------------------------------------------ //
function MaintenanceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { cost: 0 }
  })

  // Only AVAILABLE vehicles can be put into maintenance
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'AVAILABLE'],
    queryFn: () => vehiclesApi.list({ status: 'AVAILABLE', limit: 1000 }).then(r => r.data.items),
  })

  const mutation = useMutation({
    mutationFn: (data: any) => maintenanceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      success('Maintenance record created')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: MaintenanceForm) => {
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <h3 className="font-display font-semibold text-base text-on-surface">Log Maintenance</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-mid">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"><Truck className="w-3 h-3 inline mr-1"/>Vehicle *</label>
            <select {...register('vehicle_id')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:border-primary">
              <option value="">Select available vehicle...</option>
              {vehicles?.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number} - {v.name_model}</option>
              ))}
            </select>
            {errors.vehicle_id && <p className="mt-1 text-xs text-error">{errors.vehicle_id.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Description *</label>
            <input {...register('description')} placeholder="e.g. Oil change and brake pad replacement" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
            {errors.description && <p className="mt-1 text-xs text-error">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Cost (₹)</label>
            <input type="number" step="0.01" {...register('cost')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
            {errors.cost && <p className="mt-1 text-xs text-error">{errors.cost.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 rounded-lg border text-sm font-medium hover:bg-surface-mid">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container disabled:opacity-50">
              Save Log
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main Page
// ------------------------------------------------------------------ //
export default function MaintenancePage() {
  const { hasRole } = useAuth()
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | ''>('')
  const [showModal, setShowModal] = useState(false)

  const canManage = hasRole('FLEET_MANAGER', 'ADMIN')

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', page, statusFilter],
    queryFn: () => maintenanceApi.list({
      page, limit: 15, ...(statusFilter && { status: statusFilter })
    }).then(r => r.data)
  })

  const closeMutation = useMutation({
    mutationFn: (id: number) => maintenanceApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      success('Maintenance closed')
    },
    onError: (err) => toastError(extractError(err)),
  })

  const totalPages = data ? Math.ceil(data.total / 15) : 1

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Maintenance</h2>
          <p className="text-sm text-on-surface-variant mt-1">{data?.total ?? 0} maintenance records</p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container shadow-card">
            <Plus className="w-4 h-4" /> Log Maintenance
          </button>
        )}
      </div>

      <div className="card p-4 mb-4 flex gap-3 items-center">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as MaintenanceStatus | ''); setPage(1) }} className="px-3 py-2 rounded-lg border border-outline-variant text-sm bg-white outline-none focus:border-primary">
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
              <Wrench className="w-10 h-10 text-primary/30 mb-3" />
              <p className="font-semibold text-on-surface">No maintenance records found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vehicle</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th>Date Opened</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data?.items.map(m => (
                  <tr key={m.id}>
                    <td className="font-mono text-xs">#{m.id}</td>
                    <td className="font-mono text-xs">#{m.vehicle_id}</td>
                    <td className="text-sm">{m.description}</td>
                    <td className="text-sm">{formatCurrency(Number(m.cost))}</td>
                    <td className="text-sm text-on-surface-variant">{new Date(m.opened_at).toLocaleDateString()}</td>
                    <td><StatusBadge status={m.status} type="maintenance" /></td>
                    {canManage && (
                      <td>
                        {m.status === 'OPEN' && (
                          <button onClick={() => closeMutation.mutate(m.id)} title="Close Maintenance" className="p-1.5 rounded hover:bg-status-completed-bg text-on-surface-variant hover:text-status-completed">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && <MaintenanceModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
