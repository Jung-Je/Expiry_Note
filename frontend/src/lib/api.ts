import axios, { type AxiosRequestConfig } from 'axios'
import { clearAccessToken, getAccessToken, setAccessToken } from '../features/auth/tokenStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

// withCredentials가 있어야 refresh token이 담긴 httpOnly 쿠키가 요청에
// 실제로 실린다(백엔드도 CORS_ALLOW_CREDENTIALS=True로 맞춰져 있음).
export const api = axios.create({ baseURL, withCredentials: true })

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<string> | null = null

const REFRESH_LOCK_NAME = 'expiry-note-token-refresh'

// 재발급은 탭끼리도 한 번에 하나씩만 보낸다. 서버는 재발급할 때마다 refresh
// token을 새것으로 바꾸고 이전 것을 무효로 만드는데(ROTATE + BLACKLIST), 쿠키는
// 탭끼리 공유된다. 브라우저를 다시 열어 탭 여러 개가 한꺼번에 뜨면 같은 쿠키로
// 동시에 재발급을 요청하게 되고, 늦게 도착한 탭은 방금 무효가 된 토큰을 보낸
// 셈이라 401로 로그아웃돼 버린다. 줄을 세우면 다음 탭은 앞 탭이 받아 둔 새
// 쿠키로 요청하므로 모두 성공한다. Web Locks를 못 쓰는 브라우저는 예전처럼 바로 보낸다.
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) {
    return task()
  }
  return navigator.locks.request(REFRESH_LOCK_NAME, task)
}

// refresh token은 httpOnly 쿠키로만 오가므로 body 없이 요청만 보내면 된다 —
// 브라우저가 쿠키를 자동으로 실어 보낸다. 같은 탭 안에서 동시에 여러 곳이
// 401을 만나도 재발급 요청은 한 번만 나가도록 진행 중인 Promise를 공유한다.
export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= withRefreshLock(() =>
    axios.post(`${baseURL}/auth/token/refresh/`, {}, { withCredentials: true }),
  )
    .then((res) => {
      const access = res.data.access as string
      setAccessToken(access)
      return access
    })
    .catch((error) => {
      clearAccessToken()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

// access token이 만료되면(401) refresh 쿠키로 한 번만 재발급을 시도하고,
// 그 요청을 재시도한다. refresh도 실패하면(쿠키가 없거나 만료) 에러를 그대로
// 던진다 — 호출 쪽(AuthContext)에서 로그인 페이지로 보낸다.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined

    if (error.response?.status !== 401 || !original || original._retry) {
      throw error
    }
    original._retry = true

    const access = await refreshAccessToken()
    original.headers = { ...original.headers, Authorization: `Bearer ${access}` }
    return api(original)
  },
)

function firstMessage(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null
  }
  return null
}

// 서버(DRF)가 4xx 응답에 담아 보낸 안내 문구를 꺼낸다. 문구는 한국어로 오므로
// (LANGUAGE_CODE=ko-kr) 그대로 보여줄 수 있다. 응답 형태는 세 가지다:
//   - `["메시지"]`: 필드에 안 묶인 채로 raise된 ValidationError
//   - `{"detail": "메시지"}`: 뷰가 직접 내려준 오류, 권한/요청 제한 등
//   - `{"필드명": ["메시지"], ...}`: 필드별 검증 오류 — 첫 번째 것만 쓴다
// 그 외(네트워크 오류, 5xx, 세션 만료 등)엔 fallback을 쓴다.
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback
  const status = error.response?.status
  // 401은 세션 만료라 응답 문구가 지금 하던 작업과 무관하다.
  if (!status || status < 400 || status >= 500 || status === 401) return fallback

  const data: unknown = error.response?.data
  if (Array.isArray(data)) {
    return firstMessage(data) ?? fallback
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const detail = firstMessage(record.detail)
    if (detail) return detail
    for (const value of Object.values(record)) {
      const message = firstMessage(value)
      if (message) return message
    }
  }
  return fallback
}
