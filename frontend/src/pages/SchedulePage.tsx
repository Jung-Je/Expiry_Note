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
import { Link } from 'react-router-dom'
import type { ExpiryItem } from '../features/items/api'
import { STATUS_BADGE_STYLES } from '../features/items/constants'
import { useMonthlyCalendarQuery } from '../features/items/hooks'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function SchedulePage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const { data: calendar, isLoading } = useMonthlyCalendarQuery(year, month)

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ExpiryItem[]>()
    for (const day of calendar?.days ?? []) {
      map.set(day.date, day.items)
    }
    return map
  }, [calendar])

  const gridDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">일정</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCursor((prev) => subMonths(prev, 1))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            이전
          </button>
          <span className="w-20 text-center text-sm font-medium text-slate-900">
            {year}년 {month}월
          </span>
          <button
            type="button"
            onClick={() => setCursor((prev) => addMonths(prev, 1))}
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            다음
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-sm">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-slate-50 px-2 py-1 text-center text-xs font-medium text-slate-500"
            >
              {label}
            </div>
          ))}
          {gridDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayItems = itemsByDate.get(key) ?? []
            const inCurrentMonth = isSameMonth(day, cursor)

            return (
              <div key={key} className={`min-h-24 bg-white p-1.5 ${inCurrentMonth ? '' : 'bg-slate-50'}`}>
                <p
                  className={
                    isToday(day)
                      ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white'
                      : `text-xs ${inCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`
                  }
                >
                  {day.getDate()}
                </p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {dayItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/items/${item.id}`}
                        title={item.title}
                        className={`block truncate rounded px-1 py-0.5 text-[11px] ${STATUS_BADGE_STYLES[item.status]}`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
