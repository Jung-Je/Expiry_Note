import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Modal } from '../components/ui/Modal'
import type { ExpiryItem, ExpiryItemPayload } from '../features/items/api'
import { CATEGORY_OPTIONS } from '../features/items/constants'
import { formatAmount } from '../features/items/format'
import { useCreateItemMutation, useItemQuery, useUpdateItemMutation } from '../features/items/hooks'

function ItemCreatedModal({ item, onClose }: { item: ExpiryItem; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">
          ✓
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">항목 등록이 완료됐어요</h2>
        <p className="mt-2 text-sm text-slate-500">
          {item.title} 만료 {item.notify_days_before}일 전에 알림을 보내드릴게요.
        </p>

        <div className="mt-4 w-full rounded-md bg-slate-50 px-4 py-3 text-left text-sm text-slate-700">
          {item.title} · {formatAmount(item.amount)} · {item.expiry_date}
        </div>

        <div className="mt-6 flex w-full gap-3">
          <Link
            to="/schedule"
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            일정 보기
          </Link>
          <Link
            to="/"
            className="flex-1 rounded-xl bg-brand px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            대시보드로
          </Link>
        </div>
      </div>
    </Modal>
  )
}

const schema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  category: z.enum(['subscription', 'contract', 'warranty', 'membership', 'insurance', 'other']),
  expiry_date: z.string().min(1, '만료일을 선택하세요.'),
  // amount/notify_days_before는 input[type=number]가 항상 문자열로 넘겨주는
  // 값을 그대로 받고, 제출 시 숫자로 변환한다(zod.coerce를 쓰면 입력/출력
  // 타입이 갈려서 zodResolver 타입 추론이 깨지므로 문자열로 통일).
  amount: z.string(),
  memo: z.string(),
  notify_days_before: z
    .string()
    .min(1, '숫자를 입력하세요.')
    .refine((value) => /^\d+$/.test(value), '0 이상의 정수를 입력하세요.')
    .refine((value) => Number(value) <= 365, '365 이하로 입력하세요.'),
})

type FormValues = z.infer<typeof schema>

const DEFAULT_VALUES: FormValues = {
  title: '',
  category: 'other',
  expiry_date: '',
  amount: '',
  memo: '',
  notify_days_before: '7',
}

export function ItemFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdItem, setCreatedItem] = useState<ExpiryItem | null>(null)

  const { data: item, isLoading: isItemLoading } = useItemQuery(isEdit ? id : undefined)
  const createItem = useCreateItemMutation()
  const updateItem = useUpdateItemMutation()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    values: item
      ? {
          title: item.title,
          category: item.category,
          expiry_date: item.expiry_date,
          amount: item.amount == null ? '' : String(item.amount),
          memo: item.memo,
          notify_days_before: String(item.notify_days_before),
        }
      : undefined,
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const payload: ExpiryItemPayload = {
      title: values.title,
      category: values.category,
      expiry_date: values.expiry_date,
      amount: values.amount === '' ? null : Number(values.amount),
      memo: values.memo,
      notify_days_before: Number(values.notify_days_before),
    }

    try {
      if (isEdit && id) {
        const saved = await updateItem.mutateAsync({ id, payload })
        navigate(`/items/${saved.id}`, { replace: true })
        return
      }
      const saved = await createItem.mutateAsync(payload)
      setCreatedItem(saved)
    } catch {
      setServerError('저장에 실패했습니다. 입력 값을 확인해주세요.')
    }
  }

  if (isEdit && isItemLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-slate-900">{isEdit ? '항목 수정' : '항목 추가'}</h1>
      <p className="mt-2 text-sm text-slate-500">계약, 구독, 보증 등 만료 항목을 등록하세요.</p>

      <form
        className="mt-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/70"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="title">
            제목
          </label>
          <input
            id="title"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            {...register('title')}
          />
          {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="category">
            유형
          </label>
          <select
            id="category"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            {...register('category')}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="expiry_date">
            만료일
          </label>
          <input
            id="expiry_date"
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            {...register('expiry_date')}
          />
          {errors.expiry_date && <p className="text-sm text-red-600">{errors.expiry_date.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="amount">
            결제 금액(원, 선택)
          </label>
          <input
            id="amount"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="결제가 없으면 비워두세요"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            {...register('amount')}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="notify_days_before">
            며칠 전에 알림받을까요
          </label>
          <input
            id="notify_days_before"
            type="number"
            min="0"
            max="365"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            {...register('notify_days_before')}
          />
          {errors.notify_days_before && (
            <p className="text-sm text-red-600">{errors.notify_days_before.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="memo">
            메모(선택)
          </label>
          <textarea
            id="memo"
            rows={3}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            {...register('memo')}
          />
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-brand py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {isEdit ? '저장' : '등록'}
        </button>
      </form>

      {createdItem && (
        <ItemCreatedModal
          item={createdItem}
          onClose={() => navigate(`/items/${createdItem.id}`, { replace: true })}
        />
      )}
    </div>
  )
}
