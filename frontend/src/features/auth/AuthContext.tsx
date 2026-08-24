import { useEffect, useState, type ReactNode } from 'react'
import { refreshAccessToken } from '../../lib/api'
import * as authApi from './api'
import type { SignupPayload } from './api'
import { AuthContext } from './context'
import { clearAccessToken, setAccessToken } from './tokenStorage'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // access token은 메모리에만 있어서 새로고침하면 사라진다. httpOnly
    // refresh 쿠키가 남아있으면 그걸로 조용히 access token을 재발급받고,
    // 없거나 만료됐으면(401) 로그인 안 된 상태로 취급한다.
    refreshAccessToken()
      .then(() => authApi.fetchMe())
      .then(setUser)
      .catch(() => {
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    setAccessToken(data.access)
    setUser(data.user)
  }

  async function loginWithKakao(code: string, redirectUri: string) {
    const data = await authApi.kakaoLogin({ code, redirect_uri: redirectUri })
    setAccessToken(data.access)
    setUser(data.user)
  }

  async function signup(payload: SignupPayload) {
    // 이메일 인증 전까지는 자동 로그인시키지 않고, 로그인 페이지로 안내한다.
    return authApi.signup(payload)
  }

  function clearSession() {
    clearAccessToken()
    setUser(null)
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      // 백엔드 호출이 실패하더라도(네트워크 오류 등) 프론트 쪽 상태는 반드시
      // 로그아웃 처리한다 — refresh 쿠키 자체는 서버 응답으로만 지워지므로,
      // 남아있더라도 access token이 없으면 더 이상 API 호출은 안 된다.
      clearSession()
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithKakao, signup, logout, setUser, clearSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}
