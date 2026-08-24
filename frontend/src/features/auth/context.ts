import { createContext } from 'react'
import type { SignupPayload, User } from './api'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithKakao: (code: string, redirectUri: string) => Promise<void>
  signup: (payload: SignupPayload) => Promise<User>
  logout: () => Promise<void>
  // 프로필 수정(PATCH /auth/me/) 응답으로 받은 최신 유저 정보를 반영할 때 씀.
  setUser: (user: User) => void
  // 회원 탈퇴처럼 서버가 이미 세션을 정리한 뒤 로컬 상태만 지우면 되는 경우
  // 쓴다(logout()과 달리 백엔드를 다시 호출하지 않음).
  clearSession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
