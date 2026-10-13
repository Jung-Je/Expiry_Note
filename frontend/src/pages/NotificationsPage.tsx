import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/ui/Modal'
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
  plan_change: '요금제',
  notice: '공지',
}

// 항목 목록(ItemsPage)의 필터 칩과 같은 모양.
const chipBase = 'rounded-full px-3 py-1.5 text-sm font-medium transition'
const chipActive = `${chipBase} bg-brand text-white`
const chipInactive = `${chipBase} bg-white text-slate-600 shadow-sm shadow-slate-200/70 hover:text-slate-900`

// 상세 창에서 관련 화면으로 가는 버튼의 문구. 공지는 이어서 볼 화면이 없다.
const LINK_LABELS: Record<Notification['type'], string | null> = {
  expiry: '항목 보기',
  payment: '항목 보기',
  inquiry_reply: '답변 보기',
  plan_change: '요금제 보기',
  notice: null,
}

function formatReceivedAt(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function notificationLinkTo(notification: Notification): string | null {
  if (notification.type === 'notice') {
    return null
  }
  if (notification.type === 'inquiry_reply') {
    // 어느 문의의 답변인지 찾아다니지 않도록 그 문의의 상세 화면으로 바로 보낸다.
    return notification.inquiry != null ? `/inquiries/${notification.inquiry}` : '/settings?tab=inquiry'
  }
  if (notification.type === 'plan_change') {
    return '/settings?tab=pricing'
  }
  return `/items/${notification.item}`
}

function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: Notification
  onClose: () => void
}) {
  const linkTo = notificationLinkTo(notification)
  const linkLabel = LINK_LABELS[notification.type]

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {TYPE_LABELS[notification.type]}
        </span>
        <span className="text-xs text-slate-400">{formatReceivedAt(notification.created_at)}</span>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-slate-900">{notification.title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{notification.message}</p>
      {notification.for_date && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
          {notification.type === 'payment' ? '결제 예정일' : '만료 예정일'} · {notification.for_date}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          닫기
        </button>
        {linkTo && linkLabel && (
          <Link
            to={linkTo}
            className="flex-1 rounded-xl bg-brand px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            {linkLabel}
          </Link>
        )}
      </div>
    </Modal>
  )
}

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  // 열어본 알림은 객체째로 들고 있는다 — 읽음 처리되면 "읽지 않음" 목록에서는
  // 바로 빠지는데, 그래도 상세 창은 닫히지 않아야 한다.
  const [opened, setOpened] = useState<Notification | null>(null)
  const {
    data: notifications,
    isLoading,
    isError,
  } = useNotificationsQuery({
    unread: filter === 'unread',
  })
  const markRead = useMarkNotificationReadMutation()
  const markAllRead = useMarkAllNotificationsReadMutation()

  // 알림을 열어보는 것 자체가 읽음 처리다 — 따로 "읽음" 버튼을 누르지 않아도 된다.
  function openNotification(notification: Notification) {
    setOpened(notification)
    if (!notification.is_read) {
      markRead.mutate(notification.id)
    }
  }

  const hasUnread = notifications?.some((notification) => !notification.is_read) ?? false

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">알림</h1>
          <p className="mt-2 text-sm text-slate-500">알림을 누르면 내용을 확인할 수 있고, 확인한 알림은 읽음으로 바뀝니다.</p>
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
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="flex w-full items-start gap-3 py-3 text-left transition hover:opacity-80"
                >
                  {/* 읽지 않은 알림은 왼쪽 점 + 진한 제목으로 구분한다. 읽은 알림도 같은
                      폭을 비워둬서 글이 들쭉날쭉하지 않게 한다. */}
                  <span
                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-transparent' : 'bg-brand'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {TYPE_LABELS[notification.type]}
                      </span>
                      {notification.for_date && (
                        <span className="text-xs text-slate-400">{notification.for_date}</span>
                      )}
                      {!notification.is_read && <span className="sr-only">읽지 않음</span>}
                    </span>
                    <span
                      className={`mt-1 block text-sm ${
                        notification.is_read ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'
                      }`}
                    >
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-slate-500">{notification.message}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">
            {filter === 'unread' ? '읽지 않은 알림이 없습니다.' : '알림이 없습니다.'}
          </p>
        )}
      </div>

      {opened && <NotificationDetailModal notification={opened} onClose={() => setOpened(null)} />}
    </div>
  )
}
