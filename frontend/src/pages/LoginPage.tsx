import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Truck, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AxiosError } from 'axios'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    setIsLocked(false)
    try {
      await login(data.email, data.password, data.rememberMe)
      navigate(from, { replace: true })
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail: string }>
      const status = axiosErr.response?.status
      const detail = axiosErr.response?.data?.detail ?? 'Something went wrong. Please try again.'
      if (status === 423) {
        setIsLocked(true)
        setServerError(detail)
      } else {
        setServerError(detail)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-low via-background to-surface-mid flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Header card */}
        <div className="card p-8">
          {/* Brand mark */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-modal mb-4">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-headline-lg text-on-surface text-center">
              TransitOps
            </h1>
            <p className="text-sm text-on-surface-variant text-center mt-1">
              Smart Fleet Operations Platform
            </p>
          </div>

          {/* Locked account banner */}
          {isLocked && (
            <div className="mb-4 flex items-start gap-3 p-3.5 rounded-lg bg-error-container border border-error/20">
              <Lock className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-error">Account locked</p>
                <p className="text-xs text-error/80 mt-0.5">
                  Account locked after 5 failed attempts. Try again in 15 minutes.
                </p>
              </div>
            </div>
          )}

          {/* Server error (non-lockout) */}
          {serverError && !isLocked && (
            <div className="mb-4 flex items-center gap-3 p-3.5 rounded-lg bg-error-container border border-error/20">
              <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
              <p className="text-sm text-error">{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-on-surface mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="you@company.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white text-on-surface placeholder:text-on-surface-variant/60
                  transition-colors duration-150 outline-none
                  ${errors.email
                    ? 'border-error ring-1 ring-error/30'
                    : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'
                  }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-on-surface mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  placeholder="Enter your password"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white text-on-surface placeholder:text-on-surface-variant/60
                    transition-colors duration-150 outline-none
                    ${errors.password
                      ? 'border-error ring-1 ring-error/30'
                      : 'border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary/30'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer" htmlFor="login-remember">
                <input
                  id="login-remember"
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                />
                <span className="text-sm text-on-surface-variant">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium"
                onClick={() => alert('Password reset request submitted. Check your email.')}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-white text-sm font-semibold
                hover:bg-primary-container transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 pt-4 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant text-center font-medium mb-2">Demo accounts (password: Transit@123)</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-on-surface-variant">
              <span>fleetmanager@demo.com</span>
              <span>dispatcher@demo.com</span>
              <span>safety@demo.com</span>
              <span>finance@demo.com</span>
            </div>
          </div>

          {/* Security note */}
          <p className="mt-4 text-[10px] text-center text-on-surface-variant/60">
            Account locked after 5 consecutive failed login attempts.
          </p>
        </div>
      </div>
    </div>
  )
}
