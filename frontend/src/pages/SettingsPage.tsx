import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import * as authApi from '../features/auth/api'
import { useAuth } from '../features/auth/useAuth'
import {
  useNotificationPreferenceQuery,
  useUpdateNotificationPreferenceMutation,
} from '../features/notifications/hooks'

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

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ProfileSection() {
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
    <SectionCard title="프로필">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            value={user?.email ?? ''}
            disabled
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="name">
            이름
          </label>
          <input
            id="name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            {...register('name')}
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
        </div>

        {status === 'success' && <p className="text-sm text-emerald-600">저장되었습니다.</p>}
        {status === 'error' && <p className="text-sm text-red-600">저장에 실패했습니다.</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          저장
        </button>
      </form>
    </SectionCard>
  )
}

function PasswordSection() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
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

  return (
    <SectionCard title="비밀번호 변경">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700" htmlFor="current_password">
            현재 비밀번호
          </label>
          <input
            id="current_password"
            type="password"
            autoComplete="current-password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
          className="self-start rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          변경
        </button>
      </form>
    </SectionCard>
  )
}

function NotificationSection() {
  const { data: preference, isLoading } = useNotificationPreferenceQuery()
  const updatePreference = useUpdateNotificationPreferenceMutation()

  return (
    <SectionCard title="알림 설정">
      {isLoading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={preference?.push_enabled ?? false}
              onChange={(event) => updatePreference.mutate({ push_enabled: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            푸시 알림 받기
          </label>
          <p className="mt-2 text-xs text-slate-400">
            설정만 저장되며, 실제 푸시 알림 발송은 아직 준비 중입니다.
          </p>
        </>
      )}
    </SectionCard>
  )
}

function DangerSection() {
  const { clearSession } = useAuth()
  const navigate = useNavigate()
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  async function handleWithdraw() {
    if (
      !window.confirm(
        '정말 탈퇴하시겠어요? 등록된 모든 항목과 알림이 함께 삭제되며 되돌릴 수 없습니다.',
      )
    ) {
      return
    }
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
    <SectionCard title="계정 탈퇴">
      <p className="text-sm text-slate-500">
        탈퇴하면 등록된 만료 항목과 알림이 모두 삭제되며 복구할 수 없습니다.
      </p>
      <button
        type="button"
        onClick={handleWithdraw}
        disabled={isWithdrawing}
        className="mt-4 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        회원 탈퇴
      </button>
    </SectionCard>
  )
}

export function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">설정</h1>
      <p className="mt-2 text-sm text-slate-500">프로필, 알림, 계정을 관리하세요.</p>

      <div className="mt-6 flex max-w-lg flex-col gap-6">
        <ProfileSection />
        <PasswordSection />
        <NotificationSection />
        <DangerSection />
      </div>
    </div>
  )
}
