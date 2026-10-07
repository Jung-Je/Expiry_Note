import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

// 로그인은 돼 있지만 is_staff가 아닌 사용자는 대시보드로 돌려보낸다 —
// ProtectedRoute와 달리 로그인 여부뿐 아니라 권한도 확인한다.
export function AdminRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">불러오는 중...</div>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!user.is_staff) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
