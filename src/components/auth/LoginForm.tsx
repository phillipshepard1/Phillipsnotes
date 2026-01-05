import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function LoginForm() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      if (isSignUp) {
        // Validate passwords match
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await signUp(email, password)
        setSuccess('Check your email to verify your account before signing in.')
        // Clear form after successful signup
        setEmail('')
        setPassword('')
        setConfirmPassword('')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Clear confirm password when switching modes
  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp)
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm p-8 bg-card rounded-xl shadow-sm border border-border">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Phillips Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(
                'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'text-sm placeholder:text-muted-foreground'
              )}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={cn(
                'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                'text-sm placeholder:text-muted-foreground'
              )}
              placeholder="Enter your password"
            />
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className={cn(
                  'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  'text-sm placeholder:text-muted-foreground'
                )}
                placeholder="Confirm your password"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full py-2 px-4 rounded-lg text-sm font-medium',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading
              ? 'Loading...'
              : isSignUp
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleModeSwitch}
            className="text-sm text-primary hover:text-primary/80"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
