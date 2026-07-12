import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Fuel, DollarSign, ChevronLeft, ChevronRight, Truck
} from 'lucide-react'
import { fuelApi, expensesApi, vehiclesApi } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { extractError, formatCurrency } from '@/lib/utils'

// ------------------------------------------------------------------ //
// Zod schemas
// ------------------------------------------------------------------ //
const fuelSchema = z.object({
  vehicle_id: z.coerce.number().positive('Vehicle is required'),
  trip_id: z.coerce.number().optional().or(z.literal('')),
  liters: z.coerce.number().positive('Must be > 0'),
  cost: z.coerce.number().min(0, 'Cost cannot be negative'),
})
type FuelForm = z.infer<typeof fuelSchema>

const expenseSchema = z.object({
  vehicle_id: z.coerce.number().positive('Vehicle is required'),
  category: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  description: z.string().max(255).optional(),
})
type ExpenseForm = z.infer<typeof expenseSchema>

const EXPENSE_CATEGORIES = ['TOLL', 'MAINTENANCE', 'FUEL', 'OTHER']

// ------------------------------------------------------------------ //
// Modals
// ------------------------------------------------------------------ //
function FuelModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FuelForm>({
    resolver: zodResolver(fuelSchema)
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list({ limit: 1000 }).then(r => r.data.items),
  })

  const mutation = useMutation({
    mutationFn: (data: any) => fuelApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fuel'] })
      success('Fuel log added')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: FuelForm) => {
    mutation.mutate({
      ...data,
      trip_id: data.trip_id === '' ? null : Number(data.trip_id)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="p-5 border-b border-outline-variant flex justify-between">
          <h3 className="font-semibold text-on-surface">Log Fuel</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"><Truck className="w-3 h-3 inline mr-1"/>Vehicle *</label>
            <select {...register('vehicle_id')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:border-primary">
              <option value="">Select vehicle...</option>
              {vehicles?.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number}</option>
              ))}
            </select>
            {errors.vehicle_id && <p className="mt-1 text-xs text-error">{errors.vehicle_id.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Trip ID (Optional)</label>
            <input type="number" {...register('trip_id')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Liters *</label>
              <input type="number" step="0.01" {...register('liters')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
              {errors.liters && <p className="mt-1 text-xs text-error">{errors.liters.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Cost (₹) *</label>
              <input type="number" step="0.01" {...register('cost')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
              {errors.cost && <p className="mt-1 text-xs text-error">{errors.cost.message}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-surface-mid">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container disabled:opacity-50">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpenseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { success, error: toastError } = useToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema)
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list({ limit: 1000 }).then(r => r.data.items),
  })

  const mutation = useMutation({
    mutationFn: (data: any) => expensesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      success('Expense added')
      onClose()
    },
    onError: (err) => toastError(extractError(err)),
  })

  const onSubmit = (data: ExpenseForm) => mutation.mutate(data)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-sm animate-slide-up">
        <div className="p-5 border-b border-outline-variant flex justify-between">
          <h3 className="font-semibold text-on-surface">Log Expense</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5"><Truck className="w-3 h-3 inline mr-1"/>Vehicle *</label>
            <select {...register('vehicle_id')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:border-primary">
              <option value="">Select vehicle...</option>
              {vehicles?.map(v => (
                <option key={v.id} value={v.id}>{v.registration_number}</option>
              ))}
            </select>
            {errors.vehicle_id && <p className="mt-1 text-xs text-error">{errors.vehicle_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">Category *</label>
              <select {...register('category')} className="w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:border-primary">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-xs text-error">{errors.category.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">Amount (₹) *</label>
              <input type="number" step="0.01" {...register('amount')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
              {errors.amount && <p className="mt-1 text-xs text-error">{errors.amount.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">Description (Optional)</label>
            <input {...register('description')} className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm font-medium hover:bg-surface-mid">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container disabled:opacity-50">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ //
// Main Page
// ------------------------------------------------------------------ //
export default function FuelExpensesPage() {
  const { hasRole } = useAuth()
  const [tab, setTab] = useState<'fuel' | 'expenses'>('fuel')
  
  const [page, setPage] = useState(1)
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  const canManage = hasRole('FLEET_MANAGER', 'FINANCIAL_ANALYST', 'ADMIN')

  const { data: fuelData, isLoading: fuelLoading } = useQuery({
    queryKey: ['fuel', page],
    queryFn: () => fuelApi.list({ page, limit: 15 }).then(r => r.data),
    enabled: tab === 'fuel'
  })

  const { data: expenseData, isLoading: expLoading } = useQuery({
    queryKey: ['expenses', page],
    queryFn: () => expensesApi.list({ page, limit: 15 }).then(r => r.data),
    enabled: tab === 'expenses'
  })

  const activeData = tab === 'fuel' ? fuelData : expenseData
  const isLoading = tab === 'fuel' ? fuelLoading : expLoading
  const totalPages = activeData ? Math.ceil(activeData.total / 15) : 1

  return (
    <div className="flex-1 p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-headline-lg text-on-surface">Fuel & Expenses</h2>
          <p className="text-sm text-on-surface-variant mt-1">Manage operational costs</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setShowFuelModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/10 transition-colors">
              <Plus className="w-4 h-4" /> Fuel
            </button>
            <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors shadow-card">
              <Plus className="w-4 h-4" /> Expense
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-4 border-b border-outline-variant">
        <button
          onClick={() => { setTab('fuel'); setPage(1); }}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${tab === 'fuel' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <div className="flex items-center gap-2"><Fuel className="w-4 h-4"/> Fuel Logs</div>
        </button>
        <button
          onClick={() => { setTab('expenses'); setPage(1); }}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${tab === 'expenses' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
        >
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4"/> Expenses</div>
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-surface-mid rounded-lg animate-pulse" />)}
            </div>
          ) : activeData?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              {tab === 'fuel' ? <Fuel className="w-10 h-10 text-primary/30 mb-3" /> : <DollarSign className="w-10 h-10 text-primary/30 mb-3" />}
              <p className="font-semibold text-on-surface">No {tab === 'fuel' ? 'fuel logs' : 'expenses'} found</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                {tab === 'fuel' ? (
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Trip ID</th>
                    <th>Liters</th>
                    <th>Cost</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tab === 'fuel' && (activeData?.items as any[]).map((f) => (
                  <tr key={f.id}>
                    <td className="text-sm text-on-surface-variant">{new Date(f.log_date).toLocaleDateString()}</td>
                    <td className="font-mono text-xs">#{f.vehicle_id}</td>
                    <td className="font-mono text-xs text-on-surface-variant">{f.trip_id ? `#${f.trip_id}` : '—'}</td>
                    <td className="text-sm">{Number(f.liters).toFixed(2)} L</td>
                    <td className="text-sm font-semibold">{formatCurrency(Number(f.cost))}</td>
                  </tr>
                ))}
                {tab === 'expenses' && (activeData?.items as any[]).map((e) => (
                  <tr key={e.id}>
                    <td className="text-sm text-on-surface-variant">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="font-mono text-xs">#{e.vehicle_id}</td>
                    <td>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-mid text-on-surface">
                        {e.category}
                      </span>
                    </td>
                    <td className="text-sm">{e.description || '—'}</td>
                    <td className="text-sm font-semibold">{formatCurrency(Number(e.amount))}</td>
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

      {showFuelModal && <FuelModal onClose={() => setShowFuelModal(false)} />}
      {showExpenseModal && <ExpenseModal onClose={() => setShowExpenseModal(false)} />}
    </div>
  )
}
