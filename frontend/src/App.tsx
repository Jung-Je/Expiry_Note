import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { ItemDetailPage } from './pages/ItemDetailPage'
import { ItemFormPage } from './pages/ItemFormPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { LoginPage } from './pages/auth/LoginPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PricingPage } from './pages/PricingPage'
import { SchedulePage } from './pages/SchedulePage'
import { SettingsPage } from './pages/SettingsPage'
import { SignupPage } from './pages/auth/SignupPage'
import { StatsPage } from './pages/StatsPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/items/new" element={<ItemFormPage />} />
                <Route path="/items/:id" element={<ItemDetailPage />} />
                <Route path="/items/:id/edit" element={<ItemFormPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/pricing" element={<PricingPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
