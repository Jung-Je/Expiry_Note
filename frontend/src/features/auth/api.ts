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
  refresh: string
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
