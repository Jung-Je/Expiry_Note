import { format } from 'date-fns'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ItemStatus } from '../features/items/api'
import { CATEGORY_OPTIONS, STATUS_LABELS } from '../features/items/constants'
import { formatAmount } from '../features/items/format'
import { useItemsQuery } from '../features/items/hooks'
import { ItemListRow } from '../features/items/ItemListRow'

// 급한 순서대로 — 목록에서 가장 자주 찾는 건 곧 만료되는 항목이다.
const STATUS_FILTERS: ItemStatus[] = ['urgent', 'upcoming', 'normal', 'expired']

const chipBase = 'rounded-full px-3 py-1.5 text-sm font-medium transition'
const chipActive = `${chipBase} bg-brand text-white`
const chipInactive = `${chipBase} bg-white text-slate-600 shadow-sm shadow-slate-200/70 hover:text-slate-900`

function monthLabel(month: string, currentMonth: string): string {
  if (month === currentMonth) return '이번 달'
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

export function ItemsPage() {
  // 필터는 URL 쿼리에 둔다 — 대시보드 카드가 `/items?status=urgent`처럼
  // 필터가 걸린 상태로 바로 들어올 수 있고, 상세를 보고 뒤로 와도 유지된다.
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  const rawStatus = searchParams.get('status')
  const status = STATUS_FILTERS.find((value) => value === rawStatus)
  const rawCategory = searchParams.get('category')
  const category = CATEGORY_OPTIONS.find((option) => option.value === rawCategory)?.value
  const rawMonth = searchParams.get('month')
  const month = rawMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : undefined
  const currentMonth = format(new Date(), 'yyyy-MM')

  const { data: items, isLoading, isError } = useItemsQuery({ status, category, month })

  const hasFilter = Boolean(status || category || month || search.trim())
  // 검색은 이미 받아온 목록에서 걸러낸다 — 글자를 칠 때마다 요청이 나가지 않게.
  const keyword = search.trim().toLowerCase()
  const visibleItems = (items ?? []).filter((item) => item.title.toLowerCase().includes(keyword))
  const totalAmount = visibleItems.reduce((sum, item) => sum + (item.amount ?? 0), 0)

  function setParam(key: 'status' | 'category' | 'month', value: string | undefined) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  function resetFilters() {
    setSearch('')
    setSearchParams({}, { replace: true })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">항목 목록</h1>
          <p className="mt-2 text-sm text-slate-500">등록한 구독과 계약을 한눈에 확인하세요.</p>
        </div>
        <Link
          to="/items/new"
          className="shrink-0 whitespace-nowrap rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          + 새 항목 추가
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="이름으로 검색"
          aria-label="이름으로 검색"
          className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          value={category ?? ''}
          onChange={(event) => setParam('category', event.target.value || undefined)}
          aria-label="유형"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand"
        >
          <option value="">모든 유형</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setParam('status', undefined)}
          aria-pressed={!status}
          className={status ? chipInactive : chipActive}
        >
          모든 상태
        </button>
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setParam('status', value)}
            aria-pressed={status === value}
            className={status === value ? chipActive : chipInactive}
          >
            {STATUS_LABELS[value]}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button
          type="button"
          onClick={() => setParam('month', month ? undefined : currentMonth)}
          aria-pressed={Boolean(month)}
          className={month ? chipActive : chipInactive}
        >
          {monthLabel(month ?? currentMonth, currentMonth)}
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
        {isLoading ? (
          <p className="text-sm text-slate-500">불러오는 중...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">항목을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
        ) : visibleItems.length > 0 ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <p className="font-semibold text-slate-900">{visibleItems.length}건</p>
              <p className="text-slate-500">
                금액 합계 <span className="font-semibold text-slate-900">{formatAmount(totalAmount)}</span>
              </p>
            </div>
            <ul className="mt-2 flex flex-col divide-y divide-slate-100">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <ItemListRow item={item} />
                </li>
              ))}
            </ul>
          </>
        ) : hasFilter ? (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500">조건에 맞는 항목이 없습니다.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 text-sm font-medium text-brand hover:text-brand-hover"
            >
              필터 초기화
            </button>
          </div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-500">아직 등록한 항목이 없습니다.</p>
            <Link
              to="/items/new"
              className="mt-2 inline-block text-sm font-medium text-brand hover:text-brand-hover"
            >
              첫 항목 추가하기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
