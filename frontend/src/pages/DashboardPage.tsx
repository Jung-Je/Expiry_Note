import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { Link } from 'react-router-dom'
import { AlertIcon, ClipboardIcon, WonIcon } from '../components/icons'
import {
  CATEGORY_AVATAR_STYLES,
  categoryLabel,
  STATUS_BADGE_STYLES,
  STATUS_LABELS,
} from '../features/items/constants'
import { formatAmount, formatDday } from '../features/items/format'
import { useItemsQuery, useItemStatsQuery, useMonthlyCalendarQuery } from '../features/items/hooks'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function StatCard({
  icon: Icon,
  iconStyle,
  label,
  value,
  badge,
}: {
  icon: typeof WonIcon
  iconStyle: string
  label: string
  value: string
  badge?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-[18px] shadow-sm shadow-slate-200/70">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon />
        </div>
        <p className="truncate text-sm text-slate-500">{label}</p>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="truncate text-xl font-bold text-slate-900">{value}</p>
        {badge && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}

function MiniCalendar() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const { data: calendar } = useMonthlyCalendarQuery(year, month)

  const datesWithItems = new Set((calendar?.days ?? []).filter((day) => day.items.length > 0).map((day) => day.date))

  const gridStart = startOfWeek(startOfMonth(today))
  const gridEnd = endOfWeek(endOfMonth(today))
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
      <h2 className="text-base font-semibold text-slate-900">
        {year}년 {month}월
      </h2>
      <div className="mt-4 grid grid-cols-7 gap-y-1.5 text-center text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-slate-400">
            {label}
          </div>
        ))}
        {gridDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const inCurrentMonth = isSameMonth(day, today)
          const hasItems = datesWithItems.has(key)

          return (
            <div key={key} className="flex flex-col items-center gap-0.5 py-0.5">
              <span
                className={
                  isToday(day)
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand font-medium text-white'
                    : inCurrentMonth
                      ? 'flex h-6 w-6 items-center justify-center text-slate-700'
                      : 'flex h-6 w-6 items-center justify-center text-slate-300'
              }
              >
                {day.getDate()}
              </span>
              <span className={`h-1 w-1 rounded-full ${hasItems ? 'bg-brand' : ''}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading } = useItemStatsQuery()
  const { data: urgentItems, isLoading: isUrgentLoading } = useItemsQuery({ status: 'urgent' })

  const thisMonthAmount = stats?.monthly_amounts[0]?.total_amount ?? null
  const urgentCount = stats?.by_status.find((row) => row.status === 'urgent')?.count ?? 0
  const mostUrgentItem = urgentItems?.[0]

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
          <p className="mt-2 text-sm text-slate-500">
            다가오는 결제와 만료 일정을 확인하세요.
          </p>
        </div>
        <Link
          to="/items/new"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          + 새 항목 추가
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={WonIcon}
          iconStyle="bg-violet-100 text-violet-700"
          label="이번 달 예정 금액"
          value={isStatsLoading ? '-' : formatAmount(thisMonthAmount)}
        />
        <StatCard
          icon={AlertIcon}
          iconStyle="bg-red-100 text-red-600"
          label="7일 이내 만료"
          value={isStatsLoading ? '-' : `${urgentCount}건`}
        />
        <StatCard
          icon={ClipboardIcon}
          iconStyle="bg-emerald-100 text-emerald-700"
          label="등록한 항목"
          value={isStatsLoading ? '-' : `${stats?.total_count ?? 0}건`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">다가오는 일정</h2>
            <Link to="/schedule" className="text-sm font-medium text-brand hover:text-brand-hover">
              전체 보기 →
            </Link>
          </div>

          {isUrgentLoading ? (
            <p className="mt-3 text-sm text-slate-500">불러오는 중...</p>
          ) : urgentItems && urgentItems.length > 0 ? (
            <ul className="mt-4 flex flex-col divide-y divide-slate-100">
              {urgentItems.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/items/${item.id}`}
                    className="flex items-center gap-3 py-3 transition hover:opacity-80"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${CATEGORY_AVATAR_STYLES[item.category]}`}
                    >
                      {item.title.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {categoryLabel(item.category)} · {item.expiry_date}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-slate-600">{formatAmount(item.amount)}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]} · {formatDday(item.days_until_expiry)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-500">7일 이내에 만료되는 항목이 없습니다.</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <MiniCalendar />

          {mostUrgentItem && (
            <div className="rounded-2xl bg-amber-50 p-5">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                <AlertIcon className="h-4 w-4" />
                이번 달 확인할 항목
              </div>
              <p className="mt-2 text-sm text-amber-700">
                {mostUrgentItem.title} 만료가 {mostUrgentItem.days_until_expiry}일 남았어요.
              </p>
              <Link
                to={`/items/${mostUrgentItem.id}`}
                className="mt-3 inline-block text-sm font-medium text-amber-800 underline"
              >
                지금 확인하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
