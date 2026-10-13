import { useState } from 'react'
import { Pagination } from '../../components/ui/Pagination'
import { ADMIN_PAGE_SIZE } from '../../features/admin/api'
import type { PaymentStatus } from '../../features/admin/api'
import { useAdminOverviewQuery, useAdminPaymentsQuery } from '../../features/admin/hooks'
import { formatDateTime, PLAN_LABELS } from '../../features/admin/labels'
import { formatAmount } from '../../features/items/format'

function StatusBadge({ status }: { status: PaymentStatus }) {
  const isSucceeded = status === 'succeeded'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isSucceeded ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {isSucceeded ? '성공' : '실패'}
    </span>
  )
}

export function AdminPaymentsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAdminPaymentsQuery(page)
  // 목록은 한 페이지씩만 받으므로 합계는 여기서 더하지 않고 개요 집계를 쓴다.
  const { data: overview } = useAdminOverviewQuery()
  const payments = data?.results

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">결제 내역</h1>
      <p className="mt-1 text-sm text-slate-500">
        총 {data?.count ?? 0}건 · 성공 결제 합계 {formatAmount(overview?.revenue.total ?? 0)}
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">플랜</th>
              <th className="px-4 py-3 font-medium">금액</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">주문번호</th>
              <th className="px-4 py-3 font-medium">결제일시</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  결제 내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                </td>
              </tr>
            )}
            {!isLoading && !isError && payments?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  결제 내역이 없습니다.
                </td>
              </tr>
            )}
            {payments?.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-slate-900">{payment.user_email}</td>
                <td className="px-4 py-3 text-slate-700">{PLAN_LABELS[payment.plan]}</td>
                <td className="px-4 py-3 text-slate-700">{formatAmount(payment.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={payment.status} />
                  {payment.status === 'failed' && payment.failure_reason && (
                    <p className="mt-1 text-xs text-slate-400">{payment.failure_reason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{payment.order_id}</td>
                <td className="px-4 py-3 text-slate-500">
                  {payment.paid_at ? formatDateTime(payment.paid_at) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} totalCount={data?.count ?? 0} onChange={setPage} />
    </div>
  )
}
