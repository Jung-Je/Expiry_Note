import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { confirmPasswordReset } from '../../features/auth/api'

const schema = z
  .object({
    new_password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    new_password_confirm: z.string(),
  })
  .refine((values) => values.new_password === values.new_password_confirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['new_password_confirm'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await confirmPasswordReset({ uid, token, new_password: values.new_password })
      navigate('/login', {
        replace: true,
        state: { message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.' },
      })
    } catch {
      setServerError('링크가 유효하지 않거나 만료되었습니다. 다시 요청해주세요.')
    }
  }

  if (!uid || !token) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-red-600">잘못된 링크입니다.</p>
          <Link className="text-sm font-medium text-brand" to="/forgot-password">
            다시 요청하기
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">새 비밀번호 설정</h1>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="new_password">
              새 비밀번호
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
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
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
              {...register('new_password_confirm')}
            />
            {errors.new_password_confirm && (
              <p className="text-sm text-red-600">{errors.new_password_confirm.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            비밀번호 재설정
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
