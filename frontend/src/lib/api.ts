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

// refresh token은 httpOnly 쿠키로만 오가므로 body 없이 요청만 보내면 된다 —
// 브라우저가 쿠키를 자동으로 실어 보낸다. 동시에 여러 곳에서 401을 만나도
// 재발급 요청은 한 번만 나가도록 진행 중인 Promise를 공유한다.
export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= axios
    .post(`${baseURL}/auth/token/refresh/`, {}, { withCredentials: true })
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

// 필드에 안 묶인 채로(perform_create 등에서) raise된 DRF ValidationError는
// 응답 바디가 `["메시지"]` 형태의 평범한 배열로 온다 — 그 메시지를 그대로
// 사용자에게 보여줄 수 있을 때만 꺼내고, 그 외(필드별 에러 등)엔 fallback을 쓴다.
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (Array.isArray(data) && typeof data[0] === 'string') {
      return data[0]
    }
  }
  return fallback
}
