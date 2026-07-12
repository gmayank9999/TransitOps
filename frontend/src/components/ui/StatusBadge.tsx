import type { VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus } from '@/types'

// ------------------------------------------------------------------ //
// Status badge config — color + label per status value
// ------------------------------------------------------------------ //
const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'bg-status-available-bg text-status-available' },
  ON_TRIP: { label: 'On Trip', className: 'bg-status-on-trip-bg text-status-on-trip' },
  IN_SHOP: { label: 'In Shop', className: 'bg-status-in-shop-bg text-status-in-shop' },
  RETIRED: { label: 'Retired', className: 'bg-status-retired-bg text-status-retired' },
}

const DRIVER_STATUS_CONFIG: Record<DriverStatus, { label: string; className: string }> = {
  AVAILABLE: { label: 'Available', className: 'bg-status-available-bg text-status-available' },
  ON_TRIP: { label: 'On Trip', className: 'bg-status-on-trip-bg text-status-on-trip' },
  OFF_DUTY: { label: 'Off Duty', className: 'bg-status-off-duty-bg text-status-off-duty' },
  SUSPENDED: { label: 'Suspended', className: 'bg-status-suspended-bg text-status-suspended' },
}

const TRIP_STATUS_CONFIG: Record<TripStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-status-draft-bg text-status-draft' },
  DISPATCHED: { label: 'Dispatched', className: 'bg-status-dispatched-bg text-status-dispatched' },
  COMPLETED: { label: 'Completed', className: 'bg-status-completed-bg text-status-completed' },
  CANCELLED: { label: 'Cancelled', className: 'bg-status-cancelled-bg text-status-cancelled' },
}

const MAINTENANCE_STATUS_CONFIG: Record<MaintenanceStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-status-in-shop-bg text-status-in-shop' },
  CLOSED: { label: 'Closed', className: 'bg-status-completed-bg text-status-completed' },
}

// ------------------------------------------------------------------ //
// Badge component
// ------------------------------------------------------------------ //
interface StatusBadgeProps {
  status: VehicleStatus | DriverStatus | TripStatus | MaintenanceStatus
  type: 'vehicle' | 'driver' | 'trip' | 'maintenance'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  let config: { label: string; className: string }

  switch (type) {
    case 'vehicle':
      config = VEHICLE_STATUS_CONFIG[status as VehicleStatus]
      break
    case 'driver':
      config = DRIVER_STATUS_CONFIG[status as DriverStatus]
      break
    case 'trip':
      config = TRIP_STATUS_CONFIG[status as TripStatus]
      break
    case 'maintenance':
      config = MAINTENANCE_STATUS_CONFIG[status as MaintenanceStatus]
      break
    default:
      config = { label: status, className: 'bg-surface-mid text-on-surface-variant' }
  }

  return (
    <span className={`badge ${config.className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      {config.label}
    </span>
  )
}
