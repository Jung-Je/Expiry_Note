import { Link } from 'react-router-dom'
import { categoryLabel, STATUS_BADGE_STYLES, STATUS_LABELS } from '../features/items/constants'
import { formatDday } from '../features/items/format'
import { useItemsQuery, useItemStatsQuery } from '../features/items/hooks'

export function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading } = useItemStatsQuery()
  const { data: urgentItems, isLoading: isUrgentLoading } = useItemsQuery({ status: 'urgent' })

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
      <p className="mt-2 text-sm text-slate-500">등록된 만료 항목 요약과 임박한 일정을 확인하세요.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">등록한 항목</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {isStatsLoading ? '-' : stats?.total_count}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">임박 · 예정</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {isStatsLoading ? '-' : stats?.expiring_soon_count}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">임박한 항목</h2>
          <Link to="/items/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            + 항목 추가
          </Link>
        </div>

        {isUrgentLoading ? (
          <p className="mt-3 text-sm text-slate-500">불러오는 중...</p>
        ) : urgentItems && urgentItems.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {urgentItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/items/${item.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-300"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {categoryLabel(item.category)} · {item.expiry_date}
                    </p>
                  </div>
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
