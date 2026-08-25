import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getKakaoRedirectUri } from '../../features/auth/kakao'
import { useAuth } from '../../features/auth/useAuth'

export function KakaoCallbackPage() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const kakaoError = searchParams.get('error')
  const { loginWithKakao } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'pending' | 'error'>(code && !kakaoError ? 'pending' : 'error')
  // 인가 코드는 한 번만 쓸 수 있어서, React가 effect를 두 번 실행하더라도
  // (StrictMode 등) 교환 요청은 딱 한 번만 나가야 한다.
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!code || kakaoError || hasStarted.current) {
      return
    }
    hasStarted.current = true
    loginWithKakao(code, getKakaoRedirectUri())
      .then(() => navigate('/', { replace: true }))
      .catch(() => setStatus('error'))
  }, [code, kakaoError, loginWithKakao, navigate])

  if (status === 'error') {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
        <p className="text-sm text-red-600">카카오 로그인에 실패했습니다.</p>
        <Link className="text-sm font-medium text-brand" to="/login">
          로그인으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <p className="text-sm text-slate-500">카카오 로그인 처리 중...</p>
    </div>
  )
}
