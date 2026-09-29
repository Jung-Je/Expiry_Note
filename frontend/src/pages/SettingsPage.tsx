import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Toggle } from '../components/ui/Toggle'
import * as authApi from '../features/auth/api'
import { useAuth } from '../features/auth/useAuth'
import type { PaidPlan, Payment, Plan } from '../features/billing/api'
import {
  useCancelSubscriptionMutation,
  useChangePlanMutation,
  usePaymentsQuery,
  useSubscriptionQuery,
} from '../features/billing/hooks'
// TODO: 사업자 등록 완료 후 아래 import 되돌리기
// import { startCardRegistration } from '../features/billing/toss'
import {
  useNotificationPreferenceQuery,
  useUpdateNotificationPreferenceMutation,
} from '../features/notifications/hooks'
import type { InquiryCategory } from '../features/support/api'
import { useCreateInquiryMutation } from '../features/support/hooks'

const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요.').max(50),
})
type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    current_password: z.string().min(1, '현재 비밀번호를 입력하세요.'),
    new_password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    new_password_confirm: z.string(),
  })
  .refine((values) => values.new_password === values.new_password_confirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['new_password_confirm'],
  })
type PasswordFormValues = z.infer<typeof passwordSchema>

const INQUIRY_CATEGORY_OPTIONS: { value: InquiryCategory; label: string }[] = [
  { value: 'general', label: '서비스 이용' },
  { value: 'billing', label: '결제/구독' },
  { value: 'bug', label: '오류 신고' },
  { value: 'feature', label: '기능 제안' },
  { value: 'other', label: '기타' },
]

const inquirySchema = z.object({
  category: z.enum(['general', 'billing', 'bug', 'feature', 'other']),
  title: z.string().min(1, '제목을 입력하세요.').max(100),
  content: z.string().min(1, '문의 내용을 입력하세요.'),
})
type InquiryFormValues = z.infer<typeof inquirySchema>

const inputStyle =
  'rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none'

function ProfileTab() {
  const { user, setUser } = useAuth()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: user ? { name: user.name } : undefined,
  })

  async function onSubmit(values: ProfileFormValues) {
    setStatus('idle')
    try {
      const updated = await authApi.updateProfile(values)
      setUser(updated)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">프로필 설정</h2>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
          {user?.name?.charAt(0)}
        </div>
        <p className="text-sm text-slate-500">가입 방식: {user?.signup_source === 'kakao' ? '카카오' : '이메일'}</p>
      </div>

      <form className="mt-6 flex max-w-sm flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="name">
            이름
          </label>
          <input id="name" className={inputStyle} {...register('name')} />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            value={user?.email ?? ''}
            disabled
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
          />
        </div>

        {status === 'success' && <p className="text-sm text-emerald-600">저장되었습니다.</p>}
        {status === 'error' && <p className="text-sm text-red-600">저장에 실패했습니다.</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          변경사항 저장
        </button>
      </form>
    </div>
  )
}

function SecurityTab() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) })

  async function onSubmit(values: PasswordFormValues) {
    setStatus('idle')
    try {
      await authApi.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      })
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  async function handleWithdraw() {
    setIsConfirming(false)
    setIsWithdrawing(true)
    try {
      await authApi.withdraw()
      clearSession()
      navigate('/login', { replace: true })
    } catch {
      setIsWithdrawing(false)
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">비밀번호 변경</h2>
      <form
        className="mt-5 flex max-w-sm flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="current_password">
            현재 비밀번호
          </label>
          <input
            id="current_password"
            type="password"
            autoComplete="current-password"
            className={inputStyle}
            {...register('current_password')}
          />
          {errors.current_password && (
            <p className="text-sm text-red-600">{errors.current_password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="new_password">
            새 비밀번호
          </label>
          <input
            id="new_password"
            type="password"
            autoComplete="new-password"
            className={inputStyle}
            {...register('new_password')}
          />
          {errors.new_password && <p className="text-sm text-red-600">{errors.new_password.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="new_password_confirm">
            새 비밀번호 확인
          </label>
          <input
            id="new_password_confirm"
            type="password"
            autoComplete="new-password"
            className={inputStyle}
            {...register('new_password_confirm')}
          />
          {errors.new_password_confirm && (
            <p className="text-sm text-red-600">{errors.new_password_confirm.message}</p>
          )}
        </div>

        {status === 'success' && (
          <p className="text-sm text-emerald-600">
            비밀번호가 변경되었습니다. 다른 기기는 모두 로그아웃 처리됩니다.
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">변경에 실패했습니다. 현재 비밀번호를 확인해주세요.</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          변경
        </button>
      </form>

      <div className="mt-10 border-t border-slate-100 pt-6">
        <h2 className="text-base font-semibold text-red-600">계정 탈퇴</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          탈퇴하면 등록된 만료 항목과 알림이 모두 삭제되며 복구할 수 없습니다.
        </p>
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          disabled={isWithdrawing}
          className="mt-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          회원 탈퇴
        </button>
      </div>

      {isConfirming && (
        <ConfirmDialog
          title="정말 탈퇴하시겠어요?"
          description="등록된 모든 항목과 알림이 함께 삭제되며 되돌릴 수 없습니다."
          confirmLabel="탈퇴"
          onCancel={() => setIsConfirming(false)}
          onConfirm={handleWithdraw}
        />
      )}
    </div>
  )
}

function NotificationsTab() {
  const { data: preference, isLoading } = useNotificationPreferenceQuery()
  const updatePreference = useUpdateNotificationPreferenceMutation()

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">알림 설정</h2>
      {isLoading ? (
        <p className="mt-5 text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <div className="mt-5 flex max-w-sm items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">푸시 알림</p>
            <p className="mt-0.5 text-xs text-slate-400">
              설정만 저장되며, 실제 발송은 아직 준비 중입니다.
            </p>
          </div>
          <Toggle
            checked={preference?.push_enabled ?? false}
            onChange={(checked) => updatePreference.mutate({ push_enabled: checked })}
            label="푸시 알림"
          />
        </div>
      )}
    </div>
  )
}

function InquiryTab() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const createInquiry = useCreateInquiryMutation()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { category: 'general', title: '', content: '' },
  })

  async function onSubmit(values: InquiryFormValues) {
    setStatus('idle')
    try {
      await createInquiry.mutateAsync(values)
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">도움말 및 문의</h2>
      <p className="mt-2 text-sm text-slate-500">서비스 이용 중 궁금한 점을 남겨주세요.</p>
      <form
        className="mt-5 flex max-w-sm flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="inquiry_category">
            문의 유형
          </label>
          <select id="inquiry_category" className={inputStyle} {...register('category')}>
            {INQUIRY_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="inquiry_title">
            제목
          </label>
          <input
            id="inquiry_title"
            placeholder="문의 제목을 입력하세요"
            className={inputStyle}
            {...register('title')}
          />
          {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="inquiry_content">
            내용
          </label>
          <textarea
            id="inquiry_content"
            rows={4}
            placeholder="문의 내용을 자세히 입력해 주세요."
            className={inputStyle}
            {...register('content')}
          />
          {errors.content && <p className="text-sm text-red-600">{errors.content.message}</p>}
        </div>

        {status === 'success' && (
          <p className="text-sm text-emerald-600">문의가 접수됐습니다. 빠르게 답변드릴게요.</p>
        )}
        {status === 'error' && <p className="text-sm text-red-600">문의 접수에 실패했습니다.</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          문의 보내기
        </button>
      </form>
    </div>
  )
}

function PaymentStatusBadge({ status }: { status: Payment['status'] }) {
  if (status === 'succeeded') {
    return <span className="text-emerald-600">결제 완료</span>
  }
  return <span className="text-red-600">결제 실패</span>
}

function PaymentHistorySection() {
  const { data: payments, isLoading } = usePaymentsQuery()

  if (isLoading || !payments || payments.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-slate-900">결제 내역</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-2 font-medium">결제일</th>
              <th className="px-4 py-2 font-medium">금액</th>
              <th className="px-4 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-slate-50 last:border-0">
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

// 가격/항목 제한은 백엔드 apps/billing/services/subscription.py의
// PLAN_MONTHLY_AMOUNT/PLAN_ITEM_LIMIT과 값을 맞춘 화면용 카피 — 별도
// "플랜 카탈로그" API가 없어서 각자 하드코딩하는 지금 구조에서는 여기가
// 유일한 프론트 쪽 소스다. 값을 바꾸면 반드시 백엔드도 같이 바꿀 것.
const PLAN_CARDS: {
  key: Plan
  name: string
  priceLabel: string
  features: string[]
}[] = [
  { key: 'free', name: '무료', priceLabel: '0원', features: ['항목 최대 5개', '만료 임박 알림', '캘린더/통계 보기'] },
  {
    key: 'basic',
    name: '베이직',
    priceLabel: '월 4,900원',
    features: ['항목 최대 15개', '만료 임박 알림', '캘린더/통계 보기', '월간 결제 · 언제든 해지'],
  },
  {
    key: 'pro',
    name: '프로',
    priceLabel: '월 9,900원',
    features: ['항목 무제한', '만료 임박 알림', '캘린더/통계 보기', '월간 결제 · 언제든 해지'],
  },
]

function PricingTab() {
  // TODO: 사업자 등록 완료 후 아래 user 되돌리기 (handleSubscribe에서 사용)
  // const { user } = useAuth()
  const { data: subscription, isLoading } = useSubscriptionQuery()
  const changePlan = useChangePlanMutation()
  const cancelSubscription = useCancelSubscriptionMutation()
  // TODO: 사업자 등록 완료 후 아래 isRedirecting 되돌리기
  // const [isRedirecting, setIsRedirecting] = useState(false)
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = subscription?.plan ?? 'free'
  const isPaid = currentPlan !== 'free'
  const isCanceling = subscription?.status === 'canceled'

  // TODO: 사업자 등록 완료 후 아래 handleSubscribe 되돌리기
  // async function handleSubscribe(plan: PaidPlan) {
  //   if (!subscription) return
  //   setError(null)
  //   setIsRedirecting(true)
  //   try {
  //     await startCardRegistration({
  //       customerKey: subscription.customer_key,
  //       plan,
  //       customerEmail: user?.email,
  //       customerName: user?.name,
  //     })
  //   } catch {
  //     setError('결제창을 여는 데 실패했습니다. 잠시 후 다시 시도해주세요.')
  //     setIsRedirecting(false)
  //   }
  // }

  async function handleChangePlan(plan: PaidPlan) {
    setError(null)
    try {
      await changePlan.mutateAsync(plan)
    } catch {
      setError('플랜 변경에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  async function handleCancel() {
    setIsConfirmingCancel(false)
    setError(null)
    try {
      await cancelSubscription.mutateAsync()
    } catch {
      setError('해지에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">요금제</h2>
      <p className="mt-1 text-sm text-slate-500">사용 규모에 맞는 플랜을 선택하세요.</p>

      {isPaid && (
        <div className="mt-4 rounded-xl bg-brand-light px-4 py-3 text-sm text-brand">
          {isCanceling
            ? `해지 예약됨 — ${subscription?.current_period_end}까지 현재 플랜이 유지됩니다.`
            : `다음 결제일: ${subscription?.current_period_end}`}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {PLAN_CARDS.map((card) => {
          const isCurrent = card.key === currentPlan
          const isDark = card.key !== 'free'

          return (
            <div
              key={card.key}
              className={
                isDark
                  ? `rounded-2xl border-2 bg-sidebar p-5 ${isCurrent ? 'border-brand' : 'border-transparent'}`
                  : 'rounded-2xl border border-slate-200 bg-white p-5'
              }
            >
              <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {card.name}
              </h3>
              <p className={`mt-1 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {card.priceLabel}
              </p>
              <ul className={`mt-4 flex flex-col gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {card.features.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  isCanceling ? (
                    <p
                      className={`rounded-xl px-3 py-2 text-center text-sm font-medium ${
                        isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      해지 예약됨
                    </p>
                  ) : card.key === 'free' ? (
                    <p className="rounded-xl bg-brand-light px-3 py-2 text-center text-sm font-medium text-brand">
                      현재 플랜
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingCancel(true)}
                      disabled={cancelSubscription.isPending}
                      className="w-full rounded-xl border border-red-400/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                    >
                      구독 해지
                    </button>
                  )
                ) : card.key === 'free' ? null : !isPaid ? (
                  // TODO: 사업자 등록 완료 후 아래 결제 시작 버튼으로 되돌리기
                  // <button
                  //   type="button"
                  //   onClick={() => handleSubscribe(card.key)}
                  //   disabled={isRedirecting}
                  //   className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
                  // >
                  //   {isRedirecting ? '이동 중...' : '시작하기'}
                  // </button>
                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
                  >
                    준비 중
                  </button>
                ) : (
                  !isCanceling && (
                    <button
                      type="button"
                      onClick={() => handleChangePlan(card.key)}
                      disabled={changePlan.isPending}
                      className="w-full rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      이 플랜으로 변경
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>

      <PaymentHistorySection />

      {isConfirmingCancel && (
        <ConfirmDialog
          title="구독을 해지할까요?"
          description="이번 결제 주기가 끝날 때까지는 현재 플랜이 유지됩니다."
          confirmLabel="해지"
          onCancel={() => setIsConfirmingCancel(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  )
}

type TabKey = 'profile' | 'security' | 'notifications' | 'inquiry' | 'pricing'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'profile', label: '프로필' },
  { key: 'notifications', label: '알림' },
  { key: 'inquiry', label: '문의' },
  { key: 'pricing', label: '요금제' },
  { key: 'security', label: '보안' },
]

function isTabKey(value: string | null): value is TabKey {
  return TABS.some((tab) => tab.key === value)
}

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<TabKey>(isTabKey(tabParam) ? tabParam : 'profile')

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">설정</h1>
      <p className="mt-2 text-sm text-slate-500">프로필, 알림 등 계정 설정을 관리하세요.</p>

      <div className="mt-6 flex gap-6">
        <nav className="flex w-48 shrink-0 flex-col gap-1 rounded-2xl bg-white p-2 shadow-sm shadow-slate-200/70">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-brand-light text-brand'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 rounded-2xl bg-white p-6 shadow-sm shadow-slate-200/70">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'inquiry' && <InquiryTab />}
          {activeTab === 'pricing' && <PricingTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  )
}
