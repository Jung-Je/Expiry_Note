import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'

const NAV_ITEMS = [
  { to: '/', label: '대시보드' },
  { to: '/schedule', label: '일정' },
  { to: '/items/new', label: '항목 추가' },
  { to: '/stats', label: '통계' },
  { to: '/settings', label: '설정' },
  { to: '/pricing', label: '요금제' },
]

export function AppLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col gap-1 bg-slate-950 p-4 text-slate-200">
        <div className="mb-4 px-3 text-lg font-semibold text-white">만료노트</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm transition ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-2 border-t border-slate-800 pt-4 text-sm">
          <span className="truncate text-slate-400">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="text-left text-slate-400 transition hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 p-8">
        <Outlet />
      </main>
    </div>
  )
}
