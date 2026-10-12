import { Link } from 'react-router-dom'
import type { ExpiryItem } from './api'
import { CATEGORY_AVATAR_STYLES, categoryLabel, STATUS_BADGE_STYLES, STATUS_LABELS } from './constants'
import { formatAmount, formatDday } from './format'

/** 항목 한 줄(아바타 · 이름 · 유형/날짜 · 금액 · 상태). 누르면 상세로 간다.
 * 대시보드 "다가오는 일정"과 항목 목록 화면이 같은 모양을 쓰도록 공유한다. */
export function ItemListRow({ item }: { item: ExpiryItem }) {
  return (
    <Link to={`/items/${item.id}`} className="flex items-center gap-3 py-3 transition hover:opacity-80">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${CATEGORY_AVATAR_STYLES[item.category]}`}
      >
        {item.title.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
          <span className="truncate">{item.title}</span>
          {item.is_cancelled && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              해지 완료
            </span>
          )}
        </p>
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
  )
}
