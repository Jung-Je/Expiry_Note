import { Link } from 'react-router-dom'
import { AlertIcon, ClipboardIcon, WonIcon } from '../components/icons'
import {
  CATEGORY_AVATAR_STYLES,
  categoryLabel,
  STATUS_BADGE_STYLES,
  STATUS_LABELS,
} from '../features/items/constants'
import { formatAmount, formatDday } from '../features/items/format'
import { useItemsQuery, useItemStatsQuery } from '../features/items/hooks'

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
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
        <Icon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{value}</p>
      </div>
      {badge && (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {badge}
        </span>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading } = useItemStatsQuery()
  const { data: urgentItems, isLoading: isUrgentLoading } = useItemsQuery({ status: 'urgent' })

  const thisMonthAmount = stats?.monthly_amounts[0]?.total_amount ?? null
  const urgentCount = stats?.by_status.find((row) => row.status === 'urgent')?.count ?? 0

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

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
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
    </div>
  )
}
