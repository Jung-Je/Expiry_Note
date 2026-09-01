import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { PaidPlan } from '../../features/billing/api'
import { useSubscribeMutation } from '../../features/billing/hooks'

function isPaidPlan(value: string | null): value is PaidPlan {
  return value === 'basic' || value === 'pro'
}

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams()
  const authKey = searchParams.get('authKey')
  const plan = searchParams.get('plan')
  const navigate = useNavigate()
  const subscribe = useSubscribeMutation()
  const [status, setStatus] = useState<'pending' | 'error'>(
    authKey && isPaidPlan(plan) ? 'pending' : 'error',
  )
  // authKey는 한 번만 쓸 수 있어서, effect가 두 번 실행되더라도 구독 요청은
  // 딱 한 번만 나가야 한다(KakaoCallbackPage와 동일한 이유).
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!authKey || !isPaidPlan(plan) || hasStarted.current) {
      return
    }
    hasStarted.current = true
    subscribe
      .mutateAsync({ authKey, plan })
      .then(() => navigate('/settings?tab=pricing', { replace: true }))
      .catch(() => setStatus('error'))
  }, [authKey, plan, subscribe, navigate])

  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
        <p className="text-sm text-red-600">구독 등록에 실패했습니다.</p>
        <Link className="text-sm font-medium text-brand" to="/settings?tab=pricing">
          요금제로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <p className="text-sm text-slate-500">구독을 등록하는 중...</p>
    </div>
  )
}
