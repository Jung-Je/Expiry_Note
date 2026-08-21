// MVP 단순화를 위해 access/refresh 토큰을 모두 localStorage에 저장한다.
// XSS에 노출되면 탈취될 수 있으므로, 정식 출시 전에는 httpOnly 쿠키 기반으로
// 전환하는 것을 검토한다.
const ACCESS_KEY = 'expiry-note.access-token'
const REFRESH_KEY = 'expiry-note.refresh-token'

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(tokens: { access: string; refresh?: string }): void {
  localStorage.setItem(ACCESS_KEY, tokens.access)
  if (tokens.refresh) {
    localStorage.setItem(REFRESH_KEY, tokens.refresh)
  }
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
