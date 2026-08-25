import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSubscriptionQuery } from '../../features/billing/hooks'
import { useAuth } from '../../features/auth/useAuth'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import {
  BellIcon,
  CalendarIcon,
  ChartIcon,
  GearIcon,
  HomeIcon,
  PlusCircleIcon,
  TagIcon,
} from '../icons'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: HomeIcon },
  { to: '/schedule', label: '일정', icon: CalendarIcon },
  { to: '/items/new', label: '항목 추가', icon: PlusCircleIcon },
  { to: '/stats', label: '통계', icon: ChartIcon },
  { to: '/notifications', label: '알림', icon: BellIcon },
  { to: '/settings', label: '설정', icon: GearIcon },
  { to: '/pricing', label: '요금제', icon: TagIcon },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const { data: subscription } = useSubscriptionQuery()
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false)

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar p-4 text-slate-200">
        <div className="px-3 pb-6 pt-2">
          <p className="text-lg font-bold text-white">만료노트</p>
          <p className="text-[11px] tracking-wide text-slate-500">BEFORE PAY</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-slate-400 hover:bg-sidebar-active/50 hover:text-slate-200'
                }`
              }
            >
              <item.icon className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4 text-sm">
          <span className="font-medium text-white">{user?.name}님</span>
          <span className="text-xs text-slate-500">
            {subscription?.plan === 'premium' ? '프리미엄 구독 중' : '무료 플랜 사용 중'}
          </span>
          <button
            type="button"
            onClick={() => setIsConfirmingLogout(true)}
            className="mt-2 text-left text-xs text-slate-500 transition hover:text-slate-300"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-slate-50 p-8">
        <Outlet />
      </main>

      {isConfirmingLogout && (
        <ConfirmDialog
          title="로그아웃할까요?"
          description="등록한 일정과 알림은 계정에 안전하게 저장됩니다."
          confirmLabel="로그아웃"
          onCancel={() => setIsConfirmingLogout(false)}
          onConfirm={() => {
            setIsConfirmingLogout(false)
            logout()
          }}
        />
      )}
    </div>
  )
}
