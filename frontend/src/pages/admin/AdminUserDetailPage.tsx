import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminUserSummaryQuery } from '../../features/admin/hooks'
import {
  ACTION_LABELS,
  formatDate,
  formatDateTime,
  INQUIRY_CATEGORY_LABELS,
  SIGNUP_SOURCE_LABELS,
} from '../../features/admin/labels'
import { UserActionCell, UserPlanCell, UserStatusBadge } from '../../features/admin/UserCells'
import { formatAmount } from '../../features/items/format'

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{children}</dd>
    </div>
  )
}

const emptyClass = 'py-2 text-sm text-slate-500'

export function AdminUserDetailPage() {
  const { id } = useParams()
  const userId = Number(id)
  const { data: summary, isLoading, isError } = useAdminUserSummaryQuery(userId)

  const backLink = (
    <Link to="/admin/users" className="text-sm font-medium text-brand hover:text-brand-hover">
      ← 회원 목록
    </Link>
  )

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }
  if (isError || !summary) {
    return (
      <div>
        {backLink}
        <p className="mt-4 text-sm text-red-600">회원 정보를 불러오지 못했습니다. 없는 회원일 수 있습니다.</p>
      </div>
    )
  }

  const { user, payments, inquiries, logs } = summary

  return (
    <div>
      {backLink}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-slate-900">{user.name}</h1>
        <UserStatusBadge user={user} />
        {user.is_staff && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">관리자</span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">{user.email}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="계정">
          <dl className="divide-y divide-slate-100">
            <InfoRow label="가입 경로">{SIGNUP_SOURCE_LABELS[user.signup_source]}</InfoRow>
            <InfoRow label="이메일 인증">{user.is_email_verified ? '완료' : '미완료'}</InfoRow>
            <InfoRow label="가입일">{formatDate(user.date_joined)}</InfoRow>
            <InfoRow label="등록 항목">{summary.item_count}건</InfoRow>
            <InfoRow label="요금제">
              <div className="flex flex-col items-end">
                <UserPlanCell user={user} />
              </div>
            </InfoRow>
            <InfoRow label="계정 상태 변경">
              <UserActionCell user={user} />
            </InfoRow>
          </dl>
        </Section>

        <Section title="관리자 작업 기록" hint="최근 20건">
          {logs.length === 0 ? (
            <p className={emptyClass}>이 회원에게 한 관리자 작업이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li key={log.id} className="py-2 text-sm">
                  <p className="text-slate-900">
                    <span className="font-medium">{ACTION_LABELS[log.action]}</span>
                    {log.summary && <span className="text-slate-600"> · {log.summary}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDateTime(log.created_at)} · {log.actor_email ?? '삭제된 계정'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="문의 이력" hint="최근 10건">
          {inquiries.length === 0 ? (
            <p className={emptyClass}>보낸 문의가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {inquiries.map((inquiry) => (
                <li key={inquiry.id} className="py-2 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {INQUIRY_CATEGORY_LABELS[inquiry.category]}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{inquiry.title}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        inquiry.is_answered ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {inquiry.is_answered ? '답변완료' : '미답변'}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-600">{inquiry.content}</p>
                  {inquiry.reply && (
                    <p className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                      {inquiry.reply}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">{formatDateTime(inquiry.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="결제 이력" hint="최근 10건">
          {payments.length === 0 ? (
            <p className={emptyClass}>결제 내역이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{formatAmount(payment.amount)}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {formatDateTime(payment.paid_at ?? payment.created_at)} · {payment.order_id}
                    </p>
                    {payment.status === 'failed' && payment.failure_reason && (
                      <p className="mt-0.5 text-xs text-slate-500">{payment.failure_reason}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      payment.status === 'succeeded' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {payment.status === 'succeeded' ? '성공' : '실패'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}
