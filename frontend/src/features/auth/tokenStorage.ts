// access token은 메모리에만 보관한다 — 페이지를 새로고침하면 사라지는데,
// AuthProvider가 마운트 시 httpOnly refresh 쿠키로 조용히 재발급받아 채운다
// (lib/api.ts의 refreshAccessToken 참고). refresh token은 JS가 아예 접근할
// 수 없는 httpOnly 쿠키로만 오가므로 여기서 다루지 않는다 — localStorage에
// 두 토큰을 함께 저장하던 이전 방식은 XSS로 탈취되면 refresh token(수명이
// 훨씬 긺)까지 같이 새는 문제가 있었다.
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
