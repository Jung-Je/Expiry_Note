import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { useAuth } from '../../features/auth/useAuth'

const schema = z
  .object({
    name: z.string().min(1, '이름을 입력하세요.').max(50),
    email: z.string().email('올바른 이메일을 입력하세요.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
    password_confirm: z.string(),
  })
  .refine((values) => values.password === values.password_confirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['password_confirm'],
  })

type FormValues = z.infer<typeof schema>

const inputStyle =
  'rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none'

export function SignupPage() {
  const { signup } = useAuth()
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
      await signup(values)
      navigate('/login', {
        replace: true,
        state: { message: '가입이 완료되었습니다. 이메일로 온 인증 링크를 확인한 뒤 로그인해주세요.' },
      })
    } catch {
      setServerError('가입에 실패했습니다. 이미 등록된 이메일인지 확인해주세요.')
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">처음 오셨나요?</h1>
          <p className="mt-1 text-sm text-slate-500">간단한 정보만 입력하면 바로 시작할 수 있어요.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
              type="email"
              autoComplete="email"
              placeholder="example@email.com"
              className={inputStyle}
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="영문·숫자 조합 8자 이상"
              className={inputStyle}
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password_confirm">
              비밀번호 확인
            </label>
            <input
              id="password_confirm"
              type="password"
              autoComplete="new-password"
              className={inputStyle}
              {...register('password_confirm')}
            />
            {errors.password_confirm && (
              <p className="text-sm text-red-600">{errors.password_confirm.message}</p>
            )}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            회원가입
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{' '}
          <Link className="font-medium text-brand" to="/login">
            로그인
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
