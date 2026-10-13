import { Link, useParams } from 'react-router-dom'
import type { InquiryCategory } from '../features/support/api'
import { useMyInquiryQuery } from '../features/support/hooks'

const CATEGORY_LABELS: Record<InquiryCategory, string> = {
  general: '서비스 이용',
  billing: '결제/구독',
  bug: '오류 신고',
  feature: '기능 제안',
  other: '기타',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 내 문의 한 건과 그 답변. 문의 답변 알림의 "답변 보기"가 여기로 온다 —
 * 설정의 문의 내역에서 어느 문의인지 찾아다니지 않아도 된다. */
export function InquiryDetailPage() {
  const { id } = useParams()
  const { data: inquiry, isLoading, isError } = useMyInquiryQuery(Number(id))

  const backLink = (
    <Link to="/settings?tab=inquiry" className="text-sm font-medium text-brand hover:text-brand-hover">
      ← 문의 내역
    </Link>
  )

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }
  if (isError || !inquiry) {
    return (
      <div>
        {backLink}
        <p className="mt-4 text-sm text-red-600">문의를 불러오지 못했습니다. 없는 문의일 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {backLink}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {CATEGORY_LABELS[inquiry.category]}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            inquiry.is_answered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {inquiry.is_answered ? '답변완료' : '답변대기'}
        </span>
        <span className="text-xs text-slate-400">{formatDateTime(inquiry.created_at)}</span>
      </div>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">{inquiry.title}</h1>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
        <h2 className="text-sm font-semibold text-slate-900">문의 내용</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{inquiry.content}</p>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
        <h2 className="text-sm font-semibold text-brand">답변</h2>
        {inquiry.is_answered ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{inquiry.reply}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            아직 답변이 등록되지 않았습니다. 답변이 등록되면 알림으로 알려드립니다.
          </p>
        )}
      </section>
    </div>
  )
}
