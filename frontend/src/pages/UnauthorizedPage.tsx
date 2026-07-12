import { ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="w-8 h-8 text-error" />
        </div>
        <h1 className="font-display text-headline-md text-on-surface mb-2">Access Denied</h1>
        <p className="text-sm text-on-surface-variant mb-6 max-w-sm">
          You don't have permission to view this page. Contact your Fleet Manager if you need access.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-container transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
