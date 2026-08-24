import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { requestPasswordReset } from '../../features/auth/api'

const schema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요.'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [isSent, setIsSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await requestPasswordReset(values.email)
      setIsSent(true)
    } catch {
      setServerError('요청에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">비밀번호를 잊으셨나요?</h1>
        <p className="mt-1 text-sm text-slate-500">가입한 이메일로 재설정 링크를 보내드릴게요.</p>
      </div>

      {isSent ? (
        <p className="text-sm text-slate-600">
          입력하신 이메일로 재설정 링크를 보냈습니다. 메일함을 확인해주세요.
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              {...register('email')}
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            재설정 링크 보내기
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500">
        <Link className="font-medium text-indigo-600" to="/login">
          로그인으로 돌아가기
        </Link>
      </p>
    </div>
  )
}
