import axios, { AxiosError, type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken } from '../features/auth/tokenStorage'
import { extractErrorMessage, refreshAccessToken } from './api'

const FALLBACK = '저장에 실패했습니다.'

function httpError(status: number, data: unknown): AxiosError {
  const response = { status, data } as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('extractErrorMessage', () => {
  it('배열 응답의 첫 문구를 쓴다', () => {
    expect(extractErrorMessage(httpError(400, ['무료 플랜은 최대 5개까지 등록할 수 있습니다.']), FALLBACK)).toBe(
      '무료 플랜은 최대 5개까지 등록할 수 있습니다.',
    )
  })

  it('detail 문구를 쓴다', () => {
    expect(extractErrorMessage(httpError(400, { detail: '종료일은 오늘 이후여야 합니다.' }), FALLBACK)).toBe(
      '종료일은 오늘 이후여야 합니다.',
    )
  })

  it('필드별 오류는 첫 번째 필드의 첫 문구를 쓴다', () => {
    const error = httpError(400, {
      email: ['이미 가입된 이메일입니다.'],
      password: ['비밀번호가 너무 짧습니다.'],
    })

    expect(extractErrorMessage(error, FALLBACK)).toBe('이미 가입된 이메일입니다.')
  })

  it('필드 오류가 문자열 하나로 와도 읽는다', () => {
    expect(
      extractErrorMessage(httpError(400, { password_confirm: '비밀번호가 일치하지 않습니다.' }), FALLBACK),
    ).toBe('비밀번호가 일치하지 않습니다.')
  })

  it.each([
    ['5xx 응답', httpError(500, { detail: 'Server Error' })],
    ['세션 만료(401)', httpError(401, { detail: '토큰이 유효하지 않습니다.' })],
    ['HTML 같은 문자열 응답', httpError(400, '<html>Bad Request</html>')],
    ['문구가 없는 응답', httpError(400, { count: 3 })],
    ['응답이 없는 네트워크 오류', new AxiosError('Network Error')],
    ['axios 오류가 아닌 값', new Error('boom')],
  ])('%s은 fallback을 쓴다', (_name, error) => {
    expect(extractErrorMessage(error, FALLBACK)).toBe(FALLBACK)
  })
})

describe('refreshAccessToken', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function mockRefreshResponse(access: string) {
    return vi.spyOn(axios, 'post').mockResolvedValue({ data: { access } } as AxiosResponse)
  }

  it('탭끼리 줄을 세우도록 Web Locks 안에서 재발급을 요청한다', async () => {
    const order: string[] = []
    const request = vi.fn(async (_name: string, task: () => Promise<unknown>) => {
      order.push('lock')
      return task()
    })
    vi.stubGlobal('navigator', { locks: { request } })
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      order.push('post')
      return { data: { access: 'access-locked' } } as AxiosResponse
    })

    await expect(refreshAccessToken()).resolves.toBe('access-locked')

    expect(request).toHaveBeenCalledWith('expiry-note-token-refresh', expect.any(Function))
    expect(order).toEqual(['lock', 'post'])
    expect(getAccessToken()).toBe('access-locked')
  })

  it('같은 탭에서 동시에 불러도 재발급 요청은 한 번만 보낸다', async () => {
    const post = mockRefreshResponse('access-shared')

    const results = await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(results).toEqual(['access-shared', 'access-shared'])
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('Web Locks가 없는 브라우저에서는 바로 요청한다', async () => {
    vi.stubGlobal('navigator', {})
    const post = mockRefreshResponse('access-direct')

    await expect(refreshAccessToken()).resolves.toBe('access-direct')
    expect(post).toHaveBeenCalledTimes(1)
  })
})
