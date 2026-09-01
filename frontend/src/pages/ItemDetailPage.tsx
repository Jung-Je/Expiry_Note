import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  billingCycleLabel,
  CATEGORY_AVATAR_STYLES,
  categoryLabel,
  NOTIFY_DAYS_PRESETS,
  STATUS_BADGE_STYLES,
} from '../features/items/constants'
import { formatAmount, formatDday } from '../features/items/format'
import { useDeleteItemMutation, useItemQuery, useSetItemCancelledMutation } from '../features/items/hooks'

function formatDots(isoDate: string): string {
  return isoDate.slice(0, 10).replaceAll('-', '.')
}

function notifyLabel(days: number): string {
  return NOTIFY_DAYS_PRESETS.find((preset) => preset.value === days)?.label ?? `${days}일 전`
}

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, isError } = useItemQuery(id)
  const deleteItem = useDeleteItemMutation()
  const setItemCancelled = useSetItemCancelledMutation()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleDelete() {
    if (!id) return
    setIsConfirmingDelete(false)
    await deleteItem.mutateAsync(id)
    navigate('/', { replace: true })
  }

  async function handleToggleCancelled() {
    if (!item) return
    setActionError(null)
    try {
      await setItemCancelled.mutateAsync({ id: item.id, is_cancelled: !item.is_cancelled })
    } catch {
      setActionError('처리에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }

  if (isError || !item) {
    return <p className="text-sm text-red-600">항목을 찾을 수 없습니다.</p>
  }

  const subtitle =
    item.billing_cycle === 'one_time'
      ? categoryLabel(item.category)
      : `${categoryLabel(item.category)} · ${billingCycleLabel(item.billing_cycle)}`

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">계약 상세</h1>
      <p className="mt-2 text-sm text-slate-500">등록한 계약 정보와 알림 상태를 확인하세요.</p>

      <div className="mt-6 rounded-2xl bg-sidebar p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${CATEGORY_AVATAR_STYLES[item.category]}`}
            >
              {item.title.charAt(0)}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-0.5 text-sm text-slate-300">
                {subtitle}
                {item.is_cancelled && (
                  <span className="ml-2 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-medium text-emerald-300">
                    해지 완료
                  </span>
                )}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_STYLES[item.status]}`}
          >
            {formatDday(item.days_until_expiry)}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
          <div>
            <p className="text-xs text-slate-400">다음 결제</p>
            <p className="mt-1 text-sm font-semibold">{formatDots(item.expiry_date)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">예정 금액</p>
            <p className="mt-1 text-sm font-semibold">{formatAmount(item.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">알림</p>
            <p className="mt-1 text-sm font-semibold">{notifyLabel(item.notify_days_before)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">계약 정보</h2>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">유형</dt>
              <dd className="text-slate-900">{categoryLabel(item.category)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">결제 주기</dt>
              <dd className="text-slate-900">{billingCycleLabel(item.billing_cycle)}</dd>
            </div>
            {item.contract_end_date && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">약정 종료일</dt>
                <dd className="text-slate-900">{formatDots(item.contract_end_date)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">등록일</dt>
              <dd className="text-slate-900">{formatDots(item.created_at)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">공식 해지 링크</dt>
              <dd>
                {item.cancel_url ? (
                  <a
                    href={item.cancel_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand hover:text-brand-hover"
                  >
                    페이지 열기 ↗
                  </a>
                ) : (
                  <span className="text-slate-400">등록 안 함</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">메모</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
            {item.memo || <span className="text-slate-400">등록된 메모가 없습니다.</span>}
          </p>

          {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={deleteItem.isPending}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              삭제
            </button>
            <div className="ml-auto flex gap-3">
              <Link
                to={`/items/${item.id}/edit`}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                수정
              </Link>
              <button
                type="button"
                onClick={handleToggleCancelled}
                disabled={setItemCancelled.isPending}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                  item.is_cancelled
                    ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-brand text-white hover:bg-brand-hover'
                }`}
              >
                {item.is_cancelled ? '해지 완료 취소' : '해지 완료'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isConfirmingDelete && (
        <ConfirmDialog
          title="이 항목을 삭제할까요?"
          description="삭제하면 되돌릴 수 없습니다."
          confirmLabel="삭제"
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
