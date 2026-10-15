import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import type { Subscription } from '../../features/billing/api'
import { useUnansweredInquiryCountQuery } from '../../features/admin/hooks'
import { useSubscriptionQuery } from '../../features/billing/hooks'
import { useAuth } from '../../features/auth/useAuth'
import { useUnreadNotificationCountQuery } from '../../features/notifications/hooks'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import {
  BellIcon,
  CalendarIcon,
  ChartIcon,
  ClipboardIcon,
  CloseIcon,
  GearIcon,
  HistoryIcon,
  HomeIcon,
  MegaphoneIcon,
  MenuIcon,
  MessageIcon,
  PlusCircleIcon,
  UsersIcon,
  WonIcon,
} from '../icons'

// end: true면 경로가 정확히 일치할 때만 활성 표시한다 — '/'는 모든 경로의,
// '/items'는 '/items/new'(항목 추가)의 접두사라서 필요하다.
const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: HomeIcon, end: true },
  { to: '/items', label: '항목 목록', icon: ClipboardIcon, end: true },
  { to: '/schedule', label: '일정', icon: CalendarIcon },
  { to: '/items/new', label: '항목 추가', icon: PlusCircleIcon },
  { to: '/stats', label: '통계', icon: ChartIcon },
  { to: '/notifications', label: '알림', icon: BellIcon },
  { to: '/settings', label: '설정', icon: GearIcon },
]

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: '개요', icon: ChartIcon },
  { to: '/admin/users', label: '회원 관리', icon: UsersIcon },
  { to: '/admin/payments', label: '결제 내역', icon: WonIcon },
  { to: '/admin/inquiries', label: '문의 관리', icon: MessageIcon },
  { to: '/admin/notices', label: '공지 발송', icon: MegaphoneIcon },
  { to: '/admin/logs', label: '작업 기록', icon: HistoryIcon },
]

const PLAN_LABELS: Record<Subscription['plan'], string> = {
  free: '무료 플랜',
  basic: '베이직',
  pro: '프로',
}

function planUsageLabel(subscription: Subscription | undefined): string {
  if (!subscription) return '무료 플랜 사용 중'
  if (subscription.item_limit == null) return `${PLAN_LABELS[subscription.plan]} · 무제한 사용`
  return `${PLAN_LABELS[subscription.plan]} · ${subscription.item_count}/${subscription.item_limit}개 사용`
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { data: subscription } = useSubscriptionQuery()
  const { data: unreadCount = 0 } = useUnreadNotificationCountQuery()
  // 관리자가 아니면 요청 자체를 보내지 않는다(보내도 403이다).
  const { data: unansweredCount = 0 } = useUnansweredInquiryCountQuery(Boolean(user?.is_staff))
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false)
  // 좁은 화면(lg 미만)에서는 사이드바를 숨겨 두고 상단 바의 메뉴 버튼으로 연다.
  // 메뉴를 하나 누르면 바로 닫는다 — 열린 채로 남으면 이동한 화면을 가린다.
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <div className="flex min-h-screen">
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col overflow-y-auto bg-sidebar p-4 text-slate-200 transition-transform lg:static lg:w-60 lg:translate-x-0 lg:overflow-visible ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-3 pb-6 pt-2">
          <div>
            <p className="text-lg font-bold text-white">만료노트</p>
            <p className="text-[11px] tracking-wide text-slate-500">BEFORE PAY</p>
          </div>
          <button
            type="button"
            onClick={closeMenu}
            className="-mr-1 rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
            aria-label="메뉴 닫기"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeMenu}
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
              {item.to === '/notifications' && unreadCount > 0 && (
                <span
                  className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white"
                  aria-label={`읽지 않은 알림 ${unreadCount}개`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {user?.is_staff && (
          <nav className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-500">관리자</p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                onClick={closeMenu}
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
                {item.to === '/admin/inquiries' && unansweredCount > 0 && (
                  <span
                    className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white"
                    aria-label={`미답변 문의 ${unansweredCount}건`}
                  >
                    {unansweredCount > 99 ? '99+' : unansweredCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4 text-sm">
          <span className="font-medium text-white">{user?.name}님</span>
          <span className="text-xs text-slate-500">{planUsageLabel(subscription)}</span>
          <button
            type="button"
            onClick={() => setIsConfirmingLogout(true)}
            className="mt-2 text-left text-xs text-slate-500 transition hover:text-slate-300"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-sidebar px-4 py-3 text-white lg:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="-ml-1 rounded-lg p-1 text-slate-300 hover:text-white"
            aria-label="메뉴 열기"
          >
            <MenuIcon width={22} height={22} />
          </button>
          <p className="text-base font-bold">만료노트</p>
          <NavLink
            to="/notifications"
            className="relative ml-auto rounded-lg p-1 text-slate-300 hover:text-white"
            aria-label={unreadCount > 0 ? `알림, 읽지 않은 알림 ${unreadCount}개` : '알림'}
          >
            <BellIcon width={22} height={22} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brand px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

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
