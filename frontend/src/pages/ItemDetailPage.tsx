import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { categoryLabel, STATUS_BADGE_STYLES, STATUS_LABELS } from '../features/items/constants'
import { formatAmount, formatDday } from '../features/items/format'
import { useDeleteItemMutation, useItemQuery } from '../features/items/hooks'

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: item, isLoading, isError } = useItemQuery(id)
  const deleteItem = useDeleteItemMutation()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  async function handleDelete() {
    if (!id) return
    setIsConfirmingDelete(false)
    await deleteItem.mutateAsync(id)
    navigate('/', { replace: true })
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }

  if (isError || !item) {
    return <p className="text-sm text-red-600">항목을 찾을 수 없습니다.</p>
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{item.title}</h1>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[item.status]}`}
          >
            {STATUS_LABELS[item.status]} · {formatDday(item.days_until_expiry)}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to={`/items/${item.id}/edit`}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
          >
            수정
          </Link>
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={deleteItem.isPending}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 rounded-2xl bg-white p-5 text-sm shadow-sm shadow-slate-200/70">
        <dt className="text-slate-500">유형</dt>
        <dd className="text-slate-900">{categoryLabel(item.category)}</dd>

        <dt className="text-slate-500">만료일</dt>
        <dd className="text-slate-900">{item.expiry_date}</dd>

        <dt className="text-slate-500">결제 금액</dt>
        <dd className="text-slate-900">{formatAmount(item.amount)}</dd>

        <dt className="text-slate-500">알림 시점</dt>
        <dd className="text-slate-900">만료 {item.notify_days_before}일 전</dd>

        {item.memo && (
          <>
            <dt className="text-slate-500">메모</dt>
            <dd className="whitespace-pre-wrap text-slate-900">{item.memo}</dd>
          </>
        )}
      </dl>

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
