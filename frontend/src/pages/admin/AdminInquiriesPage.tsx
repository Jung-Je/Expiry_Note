import { useState } from 'react'
import { useAdminInquiriesQuery, useReplyToInquiryMutation } from '../../features/admin/hooks'
import type { AdminInquiry, InquiryCategory } from '../../features/admin/api'

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

function InquiryRow({ inquiry }: { inquiry: AdminInquiry }) {
  const [isOpen, setIsOpen] = useState(false)
  const [reply, setReply] = useState(inquiry.reply)
  const { mutate: sendReply, isPending } = useReplyToInquiryMutation()
  const isDirty = reply !== inquiry.reply

  return (
    <li className="border-b border-slate-50 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
      >
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {CATEGORY_LABELS[inquiry.category]}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-slate-900">{inquiry.title}</span>
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
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="button"
              disabled={!isDirty || isPending}
              onClick={() => sendReply({ id: inquiry.id, reply })}
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
  const { data: inquiries, isLoading } = useAdminInquiriesQuery()
  const unansweredCount = inquiries?.filter((i) => !i.is_answered).length ?? 0

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">문의 관리</h1>
      <p className="mt-1 text-sm text-slate-500">
        총 {inquiries?.length ?? 0}건 · 미답변 {unansweredCount}건
      </p>

      <div className="mt-4 rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-slate-500">불러오는 중...</p>}
        {!isLoading && inquiries?.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">들어온 문의가 없습니다.</p>
        )}
        {inquiries && inquiries.length > 0 && (
          <ul>
            {inquiries.map((inquiry) => (
              <InquiryRow key={inquiry.id} inquiry={inquiry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
