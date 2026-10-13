import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Pagination } from '../../components/ui/Pagination'
import { ADMIN_PAGE_SIZE } from '../../features/admin/api'
import type { AdminInquiry, InquiryCategory } from '../../features/admin/api'
import {
  useAdminInquiriesQuery,
  useReplyToInquiryMutation,
  useUnansweredInquiryCountQuery,
} from '../../features/admin/hooks'
import { formatDateTime, INQUIRY_CATEGORY_LABELS, parsePage, pickAllowed } from '../../features/admin/labels'
import { extractErrorMessage } from '../../lib/api'

const CATEGORY_VALUES: InquiryCategory[] = ['general', 'billing', 'bug', 'feature', 'other']
const ANSWERED_VALUES = ['true', 'false'] as const

// 항목 목록(ItemsPage)의 필터 칩과 같은 모양.
const chipBase = 'rounded-full px-3 py-1.5 text-sm font-medium transition'
const chipActive = `${chipBase} bg-brand text-white`
const chipInactive = `${chipBase} bg-white text-slate-600 shadow-sm shadow-slate-200/70 hover:text-slate-900`

function InquiryRow({ inquiry }: { inquiry: AdminInquiry }) {
  const [isOpen, setIsOpen] = useState(false)
  const [reply, setReply] = useState(inquiry.reply)
  const [error, setError] = useState<string | null>(null)
  const { mutate: sendReply, isPending } = useReplyToInquiryMutation()
  const isDirty = reply !== inquiry.reply

  function handleSave() {
    setError(null)
    sendReply(
      { id: inquiry.id, reply },
      {
        onError: (mutationError) =>
          setError(extractErrorMessage(mutationError, '답변을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')),
      },
    )
  }

  return (
    <li className="border-b border-slate-50 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
      >
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {INQUIRY_CATEGORY_LABELS[inquiry.category]}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{inquiry.title}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            inquiry.is_answered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {inquiry.is_answered ? '답변완료' : '미답변'}
        </span>
        <span className="shrink-0 text-xs text-slate-400">
          {inquiry.user_name} · {inquiry.user_email}
        </span>
        <span className="shrink-0 text-xs text-slate-400">{formatDateTime(inquiry.created_at)}</span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-50 bg-slate-50/60 px-4 py-4">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{inquiry.content}</p>
          <Link
            to={`/admin/users/${inquiry.user_id}`}
            className="mt-2 inline-block text-xs font-medium text-brand hover:text-brand-hover"
          >
            이 회원 정보 보기
          </Link>

          <div className="mt-4 flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500" htmlFor={`reply-${inquiry.id}`}>
              답변
            </label>
            <textarea
              id={`reply-${inquiry.id}`}
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="유저가 설정 > 문의 화면에서 볼 답변을 입력하세요."
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={!isDirty || isPending}
              onClick={handleSave}
              className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {isPending ? '저장 중...' : '답변 등록'}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

export function AdminInquiriesPage() {
  // 필터·페이지는 URL 쿼리에 둔다 — 개요 화면의 "미답변 문의" 카드가
  // `?answered=false`로 바로 들어온다.
  const [searchParams, setSearchParams] = useSearchParams()
  const answeredParam = pickAllowed(searchParams.get('answered'), ANSWERED_VALUES)
  const category = pickAllowed(searchParams.get('category'), CATEGORY_VALUES)
  const page = parsePage(searchParams.get('page'))

  const { data, isLoading, isError } = useAdminInquiriesQuery({
    answered: answeredParam === undefined ? undefined : answeredParam === 'true',
    category,
    page,
  })
  const { data: unansweredCount = 0 } = useUnansweredInquiryCountQuery()
  const inquiries = data?.results
  const hasFilter = Boolean(answeredParam || category)

  function setFilter(key: 'answered' | 'category', value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    if (nextPage > 1) {
      next.set('page', String(nextPage))
    } else {
      next.delete('page')
    }
    setSearchParams(next)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">문의 관리</h1>
      <p className="mt-1 text-sm text-slate-500">
        {hasFilter ? '조건에 맞는 문의' : '총'} {data?.count ?? 0}건 · 전체 미답변 {unansweredCount}건
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter('answered', '')}
          aria-pressed={!answeredParam}
          className={answeredParam ? chipInactive : chipActive}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => setFilter('answered', 'false')}
          aria-pressed={answeredParam === 'false'}
          className={answeredParam === 'false' ? chipActive : chipInactive}
        >
          미답변
        </button>
        <button
          type="button"
          onClick={() => setFilter('answered', 'true')}
          aria-pressed={answeredParam === 'true'}
          className={answeredParam === 'true' ? chipActive : chipInactive}
        >
          답변완료
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <select
          value={category ?? ''}
          onChange={(e) => setFilter('category', e.target.value)}
          aria-label="문의 유형"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none focus:border-brand"
        >
          <option value="">모든 유형</option>
          {CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {INQUIRY_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-slate-500">불러오는 중...</p>}
        {isError && (
          <p className="px-4 py-6 text-center text-sm text-red-600">
            문의를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </p>
        )}
        {!isLoading && !isError && inquiries?.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {hasFilter ? '조건에 맞는 문의가 없습니다.' : '들어온 문의가 없습니다.'}
          </p>
        )}
        {inquiries && inquiries.length > 0 && (
          <ul>
            {inquiries.map((inquiry) => (
              <InquiryRow key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} totalCount={data?.count ?? 0} onChange={setPage} />
    </div>
  )
}
