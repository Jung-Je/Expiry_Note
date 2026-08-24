import { api } from '../../lib/api'

export interface User {
  id: number
  email: string
  name: string
  is_email_verified: boolean
  date_joined: string
}

export interface AuthResponse {
  access: string
  user: User
}

export interface SignupPayload {
  email: string
  password: string
  password_confirm: string
  name: string
}

export async function signup(payload: SignupPayload): Promise<User> {
  const { data } = await api.post<User>('/auth/signup/', payload)
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login/', { email, password })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me/')
  return data
}

export async function kakaoLogin(payload: {
  code: string
  redirect_uri: string
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/kakao/login/', payload)
  return data
}

export async function logout(): Promise<void> {
  // refresh token은 httpOnly 쿠키로만 있어서 body 없이 호출한다 — 백엔드가
  // 쿠키에서 읽어 블랙리스트 처리하고, 응답으로 쿠키도 지워준다.
  await api.post('/auth/logout/')
}

export async function updateProfile(payload: { name: string }): Promise<User> {
  const { data } = await api.patch<User>('/auth/me/', payload)
  return data
}

export async function changePassword(payload: {
  current_password: string
  new_password: string
}): Promise<void> {
  await api.post('/auth/password/change/', payload)
}

export async function withdraw(): Promise<void> {
  await api.delete('/auth/me/')
}

export async function requestPasswordReset(email: string): Promise<void> {
  await api.post('/auth/password/reset/', { email })
}

export async function confirmPasswordReset(payload: {
  uid: string
  token: string
  new_password: string
}): Promise<void> {
  await api.post('/auth/password/reset/confirm/', payload)
}

export async function verifyEmail(payload: { uid: string; token: string }): Promise<User> {
  const { data } = await api.post<User>('/auth/email/verify/', payload)
  return data
}
