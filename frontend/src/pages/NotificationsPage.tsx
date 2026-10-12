import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Notification } from '../features/notifications/api'
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../features/notifications/hooks'

const TYPE_LABELS: Record<Notification['type'], string> = {
  expiry: '만료 예정',
  payment: '결제 예정',
  inquiry_reply: '문의 답변',
}

// 항목 목록(ItemsPage)의 필터 칩과 같은 모양.
const chipBase = 'rounded-full px-3 py-1.5 text-sm font-medium transition'
const chipActive = `${chipBase} bg-brand text-white`
const chipInactive = `${chipBase} bg-white text-slate-600 shadow-sm shadow-slate-200/70 hover:text-slate-900`

function notificationLinkTo(notification: Notification): string {
  if (notification.type === 'inquiry_reply') {
    return '/settings?tab=inquiry'
  }
  return `/items/${notification.item}`
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const {
    data: notifications,
    isLoading,
    isError,
  } = useNotificationsQuery({
    unread: filter === 'unread',
  })
  const markRead = useMarkNotificationReadMutation()
  const markAllRead = useMarkAllNotificationsReadMutation()

  const hasUnread = notifications?.some((notification) => !notification.is_read) ?? false

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">알림</h1>
          <p className="mt-2 text-sm text-slate-500">만료·결제 예정 알림을 확인하세요.</p>
        </div>
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          disabled={!hasUnread || markAllRead.isPending}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          모두 읽음으로 표시
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={filter === 'all' ? chipActive : chipInactive}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          aria-pressed={filter === 'unread'}
          className={filter === 'unread' ? chipActive : chipInactive}
        >
          읽지 않음
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
        {isLoading ? (
          <p className="text-sm text-slate-500">불러오는 중...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        ) : notifications && notifications.length > 0 ? (
          <ul className="flex flex-col divide-y divide-slate-100">
            {notifications.map((notification) => (
              <li key={notification.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                {/* 읽지 않은 알림은 왼쪽 점 + 진한 제목으로 구분한다. 읽은 알림도 같은
                    폭을 비워둬서 글이 들쭉날쭉하지 않게 한다. */}
                <span
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-transparent' : 'bg-brand'}`}
                  aria-hidden="true"
                />
                <Link
                  to={notificationLinkTo(notification)}
                  className="min-w-0 flex-1 transition hover:opacity-80"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {TYPE_LABELS[notification.type]}
                    </span>
                    {notification.for_date && (
                      <span className="text-xs text-slate-400">{notification.for_date}</span>
                    )}
                    {!notification.is_read && <span className="sr-only">읽지 않음</span>}
                  </div>
                  <p
                    className={`mt-1 text-sm ${
                      notification.is_read ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'
                    }`}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">{notification.message}</p>
                </Link>
                {!notification.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(notification.id)}
                    disabled={markRead.isPending}
                    className="shrink-0 text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50"
                  >
                    읽음으로 표시
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            {filter === 'unread' ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.'}
          </p>
        )}
      </div>
    </div>
  )
}
