import { useEffect, useState, type ReactNode } from 'react'
import * as authApi from './api'
import type { SignupPayload } from './api'
import { AuthContext } from './context'
import { clearTokens, getAccessToken, setTokens } from './tokenStorage'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false)
      return
    }
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    setTokens({ access: data.access, refresh: data.refresh })
    setUser(data.user)
  }

  async function signup(payload: SignupPayload) {
    // 이메일 인증 전까지는 자동 로그인시키지 않고, 로그인 페이지로 안내한다.
    return authApi.signup(payload)
  }

  function logout() {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
