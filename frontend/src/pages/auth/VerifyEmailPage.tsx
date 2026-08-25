import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { verifyEmail } from '../../features/auth/api'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''
  // uid/token이 없으면 애초에 요청할 게 없으니 렌더링 시점에 바로 error로
  // 시작한다 — effect 안에서 동기적으로 setState하면 안 되므로.
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    uid && token ? 'pending' : 'error',
  )

  useEffect(() => {
    if (!uid || !token) {
      return
    }
    verifyEmail({ uid, token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [uid, token])

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      {status === 'pending' && <p className="text-sm text-slate-500">이메일 인증을 확인하는 중...</p>}

      {status === 'success' && (
        <>
          <p className="text-sm text-emerald-600">이메일 인증이 완료되었습니다.</p>
          <Link className="text-sm font-medium text-brand" to="/login">
            로그인하러 가기
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-sm text-red-600">유효하지 않거나 만료된 인증 링크입니다.</p>
          <Link className="text-sm font-medium text-brand" to="/login">
            로그인으로 돌아가기
          </Link>
        </>
      )}
    </div>
  )
}
