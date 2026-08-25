import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { startKakaoLogin } from '../../features/auth/kakao'
import { useAuth } from '../../features/auth/useAuth'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectMessage = (location.state as { message?: string } | null)?.message
  const [serverError, setServerError] = useState<string | null>(null)
  const [kakaoError, setKakaoError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await login(values.email, values.password)
      navigate('/', { replace: true })
    } catch {
      setServerError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }
  }

  async function handleKakaoLogin() {
    setKakaoError(null)
    try {
      // 성공하면 카카오 동의 화면으로 페이지가 리다이렉트된다.
      await startKakaoLogin()
    } catch {
      setKakaoError('카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">다시 만나서 반가워요</h1>
          <p className="mt-1 text-sm text-slate-500">계정에 로그인하고 일정을 이어서 관리하세요.</p>
        </div>

        {redirectMessage && <p className="text-sm text-emerald-600">{redirectMessage}</p>}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="example@email.com"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                비밀번호
              </label>
              <Link className="text-xs font-medium text-brand" to="/forgot-password">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요"
              className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            로그인
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          또는
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleKakaoLogin}
            className="rounded-xl bg-[#FEE500] py-2.5 text-sm font-semibold text-[#191919] transition hover:brightness-95"
          >
            카카오로 계속하기
          </button>
          {kakaoError && <p className="text-sm text-red-600">{kakaoError}</p>}
        </div>

        <p className="text-center text-sm text-slate-500">
          아직 계정이 없으신가요?{' '}
          <Link className="font-medium text-brand" to="/signup">
            회원가입
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
