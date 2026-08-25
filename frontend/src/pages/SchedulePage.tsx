import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Drawer } from '../components/ui/Drawer'
import type { ExpiryItem, ItemCategory } from '../features/items/api'
import {
  CATEGORY_OPTIONS,
  categoryLabel,
  STATUS_BADGE_STYLES,
  STATUS_BORDER_STYLES,
  STATUS_LABELS,
} from '../features/items/constants'
import { formatAmount } from '../features/items/format'
import { useMonthlyCalendarQuery } from '../features/items/hooks'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function ScheduleDetailDrawer({ item, onClose }: { item: ExpiryItem; onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <Drawer onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">일정 상세</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition hover:text-slate-600"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-base font-medium text-slate-900">{item.title}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">일정</dt>
          <dd className="text-slate-900">{item.expiry_date}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">금액</dt>
          <dd className="text-slate-900">{formatAmount(item.amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">유형</dt>
          <dd className="text-slate-900">{categoryLabel(item.category)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">알림</dt>
          <dd className="text-slate-900">{item.notify_days_before}일 전</dd>
        </div>
      </dl>

      {item.memo && (
        <div className="mt-4">
          <p className="text-sm text-slate-500">메모</p>
          <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{item.memo}</p>
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        <button
          type="button"
          onClick={() => navigate(`/items/${item.id}/edit`)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => navigate(`/items/${item.id}`)}
          className="flex-1 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          상세 보기
        </button>
      </div>
    </Drawer>
  )
}

export function SchedulePage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all')
  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const { data: calendar, isLoading } = useMonthlyCalendarQuery(year, month)

  const allMonthItems = useMemo(
    () =>
      (calendar?.days ?? [])
        .flatMap((day) => day.items)
        .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)),
    [calendar],
  )

  const categoryFilters = useMemo(() => {
    const counts = new Map<ItemCategory, number>()
    for (const item of allMonthItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }
    return [
      { value: 'all' as const, label: '전체', count: allMonthItems.length },
      ...CATEGORY_OPTIONS.filter((option) => counts.has(option.value)).map((option) => ({
        value: option.value,
        label: option.label,
        count: counts.get(option.value) ?? 0,
      })),
    ]
  }, [allMonthItems])

  const monthItems = useMemo(
    () =>
      categoryFilter === 'all'
        ? allMonthItems
        : allMonthItems.filter((item) => item.category === categoryFilter),
    [allMonthItems, categoryFilter],
  )

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ExpiryItem[]>()
    for (const item of monthItems) {
      const existing = map.get(item.expiry_date) ?? []
      existing.push(item)
      map.set(item.expiry_date, existing)
    }
    return map
  }, [monthItems])

  const gridDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">일정</h1>
      <p className="mt-2 text-sm text-slate-500">결제·만료 일정을 한눈에 확인하세요.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categoryFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setCategoryFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              categoryFilter === filter.value
                ? 'bg-brand text-white'
                : 'bg-white text-slate-600 shadow-sm shadow-slate-200/70 hover:bg-slate-50'
            }`}
          >
            {filter.label} {filter.count}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCursor((prev) => subMonths(prev, 1))}
              className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="이전 달"
            >
              ‹
            </button>
            <span className="w-24 text-center text-sm font-semibold text-slate-900">
              {year}년 {month}월
            </span>
            <button
              type="button"
              onClick={() => setCursor((prev) => addMonths(prev, 1))}
              className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
          ) : (
            <div className="mt-5 grid grid-cols-7 gap-y-1 text-sm">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="pb-2 text-center text-xs font-medium text-slate-400">
                  {label}
                </div>
              ))}
              {gridDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayItems = itemsByDate.get(key) ?? []
                const inCurrentMonth = isSameMonth(day, cursor)

                return (
                  <div key={key} className="min-h-20 px-1 pt-1">
                    <p
                      className={
                        isToday(day)
                          ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-medium text-white'
                          : `text-xs ${inCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`
                      }
                    >
                      {day.getDate()}
                    </p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {dayItems.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            title={item.title}
                            className={`block w-full truncate rounded-md px-1 py-0.5 text-left text-[11px] ${STATUS_BADGE_STYLES[item.status]}`}
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-sm font-semibold text-slate-900">이번 달 일정</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {monthItems.length === 0 && (
              <p className="text-sm text-slate-500">
                {categoryFilter === 'all' ? '이번 달 일정이 없습니다.' : '선택한 유형의 일정이 없습니다.'}
              </p>
            )}
            {monthItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={`w-full rounded-lg border-l-4 bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100 ${STATUS_BORDER_STYLES[item.status]}`}
                >
                  <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.expiry_date}</p>
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/items/new"
            className="mt-4 block rounded-lg bg-brand px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            + 항목 추가
          </Link>
        </div>
      </div>

      {selectedItem && (
        <ScheduleDetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}
