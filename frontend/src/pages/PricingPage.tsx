import { useState } from 'react'
import { useAuth } from '../features/auth/useAuth'
import type { Payment } from '../features/billing/api'
import {
  useCancelSubscriptionMutation,
  usePaymentsQuery,
  useSubscriptionQuery,
} from '../features/billing/hooks'
import { startCardRegistration } from '../features/billing/toss'

const FREE_FEATURES = ['만료 항목 최대 10개', '만료 임박 알림', '캘린더/통계 보기']
const PREMIUM_FEATURES = ['만료 항목 무제한', '만료 임박 알림', '캘린더/통계 보기', '우선 고객 지원']

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  if (status === 'succeeded') {
    return <span className="text-emerald-600">결제 완료</span>
  }
  return <span className="text-red-600">결제 실패</span>
}

function PaymentHistorySection() {
  const { data: payments, isLoading } = usePaymentsQuery()

  if (isLoading) {
    return null
  }
  if (!payments || payments.length === 0) {
    return null
  }

  return (
    <div className="mt-8 max-w-2xl">
      <h2 className="text-base font-semibold text-slate-900">결제 내역</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-4 py-2 font-medium">결제일</th>
              <th className="px-4 py-2 font-medium">금액</th>
              <th className="px-4 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-600">
                  {(payment.paid_at ?? payment.created_at).slice(0, 10)}
                </td>
                <td className="px-4 py-2 text-slate-600">{payment.amount.toLocaleString()}원</td>
                <td className="px-4 py-2">
                  <PaymentStatusBadge status={payment.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function PricingPage() {
  const { user } = useAuth()
  const { data: subscription, isLoading } = useSubscriptionQuery()
  const cancelSubscription = useCancelSubscriptionMutation()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPremium = subscription?.plan === 'premium'
  const isCanceling = subscription?.status === 'canceled'

  async function handleSubscribe() {
    if (!subscription) {
      return
    }
    setError(null)
    setIsRedirecting(true)
    try {
      await startCardRegistration({
        customerKey: subscription.customer_key,
        customerEmail: user?.email,
        customerName: user?.name,
      })
    } catch {
      setError('결제창을 여는 데 실패했습니다. 잠시 후 다시 시도해주세요.')
      setIsRedirecting(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm('구독을 해지하시겠어요? 이번 결제 주기가 끝날 때까지는 프리미엄이 유지됩니다.')) {
      return
    }
    setError(null)
    try {
      await cancelSubscription.mutateAsync()
    } catch {
      setError('해지에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">요금제</h1>
      <p className="mt-2 text-sm text-slate-500">무료로 시작하고, 필요할 때 프리미엄으로 업그레이드하세요.</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <>
          {isPremium && (
            <div className="mt-6 max-w-lg rounded-lg border border-brand-light bg-brand-light p-4 text-sm text-brand">
              {isCanceling ? (
                <>
                  해지 예약됨 — {subscription?.current_period_end}까지 프리미엄이 유지됩니다.
                </>
              ) : (
                <>다음 결제일: {subscription?.current_period_end}</>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white shadow-sm shadow-slate-200/70 p-5">
              <h2 className="text-base font-semibold text-slate-900">무료</h2>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                0원<span className="text-sm font-normal text-slate-500"> / 월</span>
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>
              {!isPremium && (
                <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-500">
                  현재 이용 중
                </p>
              )}
            </div>

            <div className="rounded-lg border border-brand bg-white p-5">
              <h2 className="text-base font-semibold text-slate-900">프리미엄</h2>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                2,900원<span className="text-sm font-normal text-slate-500"> / 월</span>
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>

              {isPremium ? (
                isCanceling ? (
                  <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-medium text-slate-500">
                    해지 예약됨
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelSubscription.isPending}
                    className="mt-4 w-full rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    구독 해지
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={isRedirecting}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
                >
                  {isRedirecting ? '이동 중...' : '카드 등록하고 시작하기'}
                </button>
              )}
            </div>
          </div>

          <PaymentHistorySection />
        </>
      )}
    </div>
  )
}
