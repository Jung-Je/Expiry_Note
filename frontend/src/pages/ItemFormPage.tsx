import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Modal } from '../components/ui/Modal'
import type { ExpiryItem, ExpiryItemPayload } from '../features/items/api'
import { BILLING_CYCLE_OPTIONS, CATEGORY_OPTIONS, NOTIFY_DAYS_PRESETS } from '../features/items/constants'
import { formatAmount } from '../features/items/format'
import { useCreateItemMutation, useItemQuery, useUpdateItemMutation } from '../features/items/hooks'

const inputStyle =
  'rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none'
const labelStyle = 'text-sm font-medium text-slate-700'

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
  title: z.string().min(1, '서비스 또는 계약명을 입력하세요.').max(100),
  category: z.enum(['subscription', 'contract', 'warranty', 'membership', 'insurance', 'other']),
  billing_cycle: z.enum(['one_time', 'monthly', 'yearly']),
  expiry_date: z.string().min(1, '다음 결제일을 선택하세요.'),
  contract_end_date: z.string(),
  // amount/notify_days_before는 input[type=number]가 항상 문자열로 넘겨주는
  // 값을 그대로 받고, 제출 시 숫자로 변환한다(zod.coerce를 쓰면 입력/출력
  // 타입이 갈려서 zodResolver 타입 추론이 깨지므로 문자열로 통일).
  amount: z.string(),
  cancel_url: z
    .string()
    .refine((value) => value === '' || /^https?:\/\//.test(value), '전체 URL(https://...)을 입력하세요.'),
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
  billing_cycle: 'one_time',
  expiry_date: '',
  contract_end_date: '',
  amount: '',
  cancel_url: '',
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
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
    values: item
      ? {
          title: item.title,
          category: item.category,
          billing_cycle: item.billing_cycle,
          expiry_date: item.expiry_date,
          contract_end_date: item.contract_end_date ?? '',
          amount: item.amount == null ? '' : String(item.amount),
          cancel_url: item.cancel_url,
          memo: item.memo,
          notify_days_before: String(item.notify_days_before),
        }
      : undefined,
  })

  const notifyDaysBefore = useWatch({ control, name: 'notify_days_before' })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const payload: ExpiryItemPayload = {
      title: values.title,
      category: values.category,
      billing_cycle: values.billing_cycle,
      expiry_date: values.expiry_date,
      contract_end_date: values.contract_end_date === '' ? null : values.contract_end_date,
      amount: values.amount === '' ? null : Number(values.amount),
      cancel_url: values.cancel_url,
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
    <div>
      <h1 className="text-xl font-semibold text-slate-900">{isEdit ? '항목 수정' : '새 항목 추가'}</h1>
      <p className="mt-2 text-sm text-slate-500">구독이나 계약 정보를 등록하고 알림을 받아보세요.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <form
          className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/70"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <h2 className="text-base font-semibold text-slate-900">기본 정보</h2>

          <div className="flex flex-col gap-1">
            <label className={labelStyle} htmlFor="title">
              서비스 또는 계약명
            </label>
            <input
              id="title"
              placeholder="예: 넷플릭스, 정수기 렌탈"
              className={inputStyle}
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={labelStyle} htmlFor="category">
                유형
              </label>
              <select id="category" className={inputStyle} {...register('category')}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelStyle} htmlFor="billing_cycle">
                결제 주기
              </label>
              <select id="billing_cycle" className={inputStyle} {...register('billing_cycle')}>
                {BILLING_CYCLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={labelStyle} htmlFor="amount">
                금액
              </label>
              <input
                id="amount"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="결제가 없으면 비워두세요"
                className={inputStyle}
                {...register('amount')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelStyle} htmlFor="expiry_date">
                다음 결제일
              </label>
              <input id="expiry_date" type="date" className={inputStyle} {...register('expiry_date')} />
              {errors.expiry_date && <p className="text-sm text-red-600">{errors.expiry_date.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={labelStyle} htmlFor="contract_end_date">
                약정 종료일(선택)
              </label>
              <input
                id="contract_end_date"
                type="date"
                className={inputStyle}
                {...register('contract_end_date')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelStyle} htmlFor="cancel_url">
                공식 해지 링크(선택)
              </label>
              <input
                id="cancel_url"
                type="url"
                placeholder="https://..."
                className={inputStyle}
                {...register('cancel_url')}
              />
              {errors.cancel_url && <p className="text-sm text-red-600">{errors.cancel_url.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelStyle}>알림 시점</label>
            <Controller
              control={control}
              name="notify_days_before"
              render={() => (
                <div className="flex gap-2">
                  {NOTIFY_DAYS_PRESETS.map((preset) => {
                    const isSelected = notifyDaysBefore === String(preset.value)
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setValue('notify_days_before', String(preset.value))}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                          isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {errors.notify_days_before && (
              <p className="text-sm text-red-600">{errors.notify_days_before.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelStyle} htmlFor="memo">
              메모(선택)
            </label>
            <textarea
              id="memo"
              rows={3}
              placeholder="해지 링크나 반납 조건을 입력하세요"
              className={inputStyle}
              {...register('memo')}
            />
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {isEdit ? '저장' : '저장하고 알림 받기'}
            </button>
          </div>
        </form>

        <div className="h-fit rounded-2xl bg-brand-light p-6">
          <h2 className="text-base font-semibold text-slate-900">빠르게 등록하는 방법</h2>
          <ol className="mt-3 flex flex-col gap-1.5 text-sm text-slate-600">
            <li>1. 서비스 이름을 입력하세요.</li>
            <li>2. 결제일 또는 만료일을 선택하세요.</li>
            <li>3. 원하는 알림 시점을 설정하세요.</li>
          </ol>
        </div>
      </div>

      {createdItem && (
        <ItemCreatedModal
          item={createdItem}
          onClose={() => navigate(`/items/${createdItem.id}`, { replace: true })}
        />
      )}
    </div>
  )
}
