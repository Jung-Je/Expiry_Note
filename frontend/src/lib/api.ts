import axios, { type AxiosRequestConfig } from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../features/auth/tokenStorage'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const api = axios.create({ baseURL })

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

// access token이 만료되면(401) refresh token으로 한 번만 재발급을 시도하고,
// 그 요청을 재시도한다. refresh도 실패하면 로그인 페이지로 보낸다.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableConfig | undefined

    if (error.response?.status !== 401 || !original || original._retry) {
      throw error
    }
    original._retry = true

    const refresh = getRefreshToken()
    if (!refresh) {
      clearTokens()
      throw error
    }

    try {
      refreshPromise ??= axios
        .post(`${baseURL}/auth/token/refresh/`, { refresh })
        .then((res) => {
          setTokens({ access: res.data.access, refresh })
          return res.data.access as string
        })
        .finally(() => {
          refreshPromise = null
        })

      const access = await refreshPromise
      original.headers = { ...original.headers, Authorization: `Bearer ${access}` }
      return api(original)
    } catch (refreshError) {
      clearTokens()
      throw refreshError
    }
  },
)
