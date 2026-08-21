import { beforeEach, describe, expect, it } from 'vitest'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('처음에는 저장된 토큰이 없다', () => {
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('access/refresh 토큰을 함께 저장하고 읽는다', () => {
    setTokens({ access: 'access-1', refresh: 'refresh-1' })

    expect(getAccessToken()).toBe('access-1')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('refresh 없이 access만 갱신하면 기존 refresh는 유지된다', () => {
    setTokens({ access: 'access-1', refresh: 'refresh-1' })
    setTokens({ access: 'access-2' })

    expect(getAccessToken()).toBe('access-2')
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('clearTokens는 둘 다 지운다', () => {
    setTokens({ access: 'access-1', refresh: 'refresh-1' })

    clearTokens()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
