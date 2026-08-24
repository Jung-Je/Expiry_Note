import { beforeEach, describe, expect, it } from 'vitest'
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  it('처음에는 저장된 access token이 없다', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('access token을 저장하고 읽는다', () => {
    setAccessToken('access-1')

    expect(getAccessToken()).toBe('access-1')
  })

  it('clearAccessToken은 저장된 값을 지운다', () => {
    setAccessToken('access-1')

    clearAccessToken()

    expect(getAccessToken()).toBeNull()
  })
})
