import { format } from 'date-fns'
import { useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { extractErrorMessage } from '../../lib/api'
import type { AdminPlan, AdminUser } from './api'
import { useGrantUserPlanMutation, useSetUserActiveMutation } from './hooks'
import { PLAN_LABELS, planNote } from './labels'

// 회원 목록과 회원 상세 화면이 같이 쓰는 요금제 변경·계정 상태 변경 조작.

const PLAN_OPTIONS: { value: AdminPlan; description: string }[] = [
  { value: 'free', description: '항목 5개' },
  { value: 'basic', description: '항목 15개' },
  { value: 'pro', description: '항목 무제한' },
]

const PLAN_BADGE_STYLES: Record<AdminPlan, string> = {
  free: 'bg-slate-100 text-slate-600',
  basic: 'bg-brand-light text-brand',
  pro: 'bg-sidebar text-white',
}

function GrantPlanModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [plan, setPlan] = useState<AdminPlan>(user.plan)
  // 관리자가 부여했던 종료일만 이어받는다 — 결제 중인 구독의 날짜는 다음 결제일이라 뜻이 다르다.
  const [periodEnd, setPeriodEnd] = useState(
    user.is_plan_admin_granted ? (user.plan_period_end ?? '') : '',
  )
  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending } = useGrantUserPlanMutation()

  const today = format(new Date(), 'yyyy-MM-dd')
  const isPaidPlan = plan !== 'free'
  // 실제로 결제 중인 구독을 덮어쓰면 자동 결제가 멈춘다는 걸 알려준다.
  const isOverwritingPaidSubscription = user.plan !== 'free' && !user.is_plan_admin_granted

  function handleSave() {
    setError(null)
    mutate(
      { id: user.id, plan, periodEnd: isPaidPlan && periodEnd ? periodEnd : null },
      {
        onSuccess: onClose,
        onError: (mutationError) =>
          setError(extractErrorMessage(mutationError, '요금제를 바꾸지 못했습니다. 입력 값을 확인해주세요.')),
      },
    )
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold text-slate-900">요금제 변경</h2>
      <p className="mt-1 text-sm text-slate-500">{user.email}</p>

      <div className="mt-4 flex flex-col gap-2">
        {PLAN_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition ${
              plan === option.value ? 'border-brand bg-brand-light' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <input
                type="radio"
                name="plan"
                value={option.value}
                checked={plan === option.value}
                onChange={() => setPlan(option.value)}
                className="accent-brand"
              />
              <span className="font-medium text-slate-900">{PLAN_LABELS[option.value]}</span>
            </span>
            <span className="text-slate-500">{option.description}</span>
          </label>
        ))}
      </div>

      {isPaidPlan && (
        <div className="mt-4 flex flex-col gap-1">
          <label htmlFor="plan-period-end" className="text-sm font-medium text-slate-700">
            종료일(선택)
          </label>
          <input
            id="plan-period-end"
            type="date"
            min={today}
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
          />
          <p className="text-xs text-slate-500">
            {periodEnd
              ? `${periodEnd}까지 유지되고 다음 날 무료 플랜으로 돌아갑니다.`
              : '비워두면 다시 바꿀 때까지 계속 유지됩니다.'}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">결제 없이 바로 적용됩니다.</p>
      {isOverwritingPaidSubscription && (
        <p className="mt-1 text-xs text-amber-600">
          이 회원은 결제 중인 구독이 있습니다. 저장하면 자동 결제가 멈춥니다.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </Modal>
  )
}

export function UserPlanCell({ user }: { user: AdminUser }) {
  const [isEditing, setIsEditing] = useState(false)
  const note = planNote(user)

  return (
    <>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_BADGE_STYLES[user.plan]}`}>
          {PLAN_LABELS[user.plan]}
        </span>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-medium text-brand hover:text-brand-hover"
        >
          변경
        </button>
      </div>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      {isEditing && <GrantPlanModal user={user} onClose={() => setIsEditing(false)} />}
    </>
  )
}

export function UserStatusBadge({ user }: { user: AdminUser }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
      }`}
    >
      {user.is_active ? '활성' : '비활성'}
    </span>
  )
}

export function UserActionCell({ user }: { user: AdminUser }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const { mutate, isPending } = useSetUserActiveMutation()

  if (user.is_staff) {
    return <span className="text-xs text-slate-400">관리자</span>
  }

  if (!user.is_active) {
    return (
      <button
        type="button"
        onClick={() => mutate({ id: user.id, isActive: true })}
        disabled={isPending}
        className="text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50"
      >
        재활성화
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="text-xs font-medium text-red-600 hover:text-red-500"
      >
        비활성화
      </button>
      {isConfirming && (
        <ConfirmDialog
          title="이 회원을 비활성화할까요?"
          description={`${user.email} 계정이 더 이상 로그인할 수 없게 됩니다. 나중에 다시 활성화할 수 있어요.`}
          confirmLabel="비활성화"
          isConfirming={isPending}
          onConfirm={() => {
            mutate(
              { id: user.id, isActive: false },
              { onSuccess: () => setIsConfirming(false) },
            )
          }}
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </>
  )
}
