import { useAdminPaymentsQuery } from '../../features/admin/hooks'
import type { AdminPlan, PaymentStatus } from '../../features/admin/api'
import { formatAmount } from '../../features/items/format'

const PLAN_LABELS: Record<AdminPlan, string> = {
  free: '무료',
  basic: '베이직',
  pro: '프로',
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
  const { data: payments, isLoading } = useAdminPaymentsQuery()
  const totalRevenue = (payments ?? [])
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">결제 내역</h1>
      <p className="mt-1 text-sm text-slate-500">
        총 {payments?.length ?? 0}건 · 성공 결제 합계 {formatAmount(totalRevenue)}
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
            {!isLoading && payments?.length === 0 && (
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
    </div>
  )
}
