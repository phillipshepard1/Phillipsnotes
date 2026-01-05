import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { ThemeProvider } from '@/hooks/useTheme'
import { LoginForm } from '@/components/auth/LoginForm'
import { AppShell } from '@/components/layout/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { useNoteCacheSync } from '@/hooks/useLocalSearch'
import { UpdatePrompt, InstallPrompt } from '@/components/pwa'

function AppContent() {
  const { user, isLoading } = useAuth()

  // Sync notes to IndexedDB for instant search
  useNoteCacheSync()

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <AppShell />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <UpdatePrompt />
          <InstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
