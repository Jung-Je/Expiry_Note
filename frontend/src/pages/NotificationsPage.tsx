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
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data: notifications, isLoading } = useNotificationsQuery({
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
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          모두 읽음으로 표시
        </button>
      </div>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1 transition ${
            filter === 'all' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`rounded-full px-3 py-1 transition ${
            filter === 'unread'
              ? 'bg-brand text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          읽지 않음
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
      ) : notifications && notifications.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-lg border px-4 py-3 ${
                notification.is_read ? 'border-slate-200 bg-white' : 'border-brand-light bg-brand-light'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <Link to={`/items/${notification.item}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {TYPE_LABELS[notification.type]}
                    </span>
                    {!notification.is_read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{notification.for_date}</p>
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
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          {filter === 'unread' ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.'}
        </p>
      )}
    </div>
  )
}
