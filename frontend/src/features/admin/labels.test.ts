import { describe, expect, it } from 'vitest'
import type { AdminUser } from './api'
import { parsePage, pickAllowed, planNote } from './labels'

function makeUser(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: 1,
    email: 'user@example.com',
    name: '회원',
    is_active: true,
    is_staff: false,
    is_email_verified: true,
    signup_source: 'email',
    date_joined: '2026-10-01T00:00:00+09:00',
    plan: 'free',
    plan_period_end: null,
    is_plan_admin_granted: false,
    ...overrides,
  }
}

describe('planNote', () => {
  it('무료 플랜은 덧붙일 설명이 없다', () => {
    expect(planNote(makeUser({ plan: 'free' }))).toBeNull()
  })

  it('관리자가 부여한 플랜은 종료일 유무를 구분해 알려준다', () => {
    expect(planNote(makeUser({ plan: 'pro', is_plan_admin_granted: true, plan_period_end: '2026-12-31' }))).toBe(
      '관리자 부여 · 2026-12-31까지',
    )
    expect(planNote(makeUser({ plan: 'pro', is_plan_admin_granted: true }))).toBe('관리자 부여 · 기간 제한 없음')
  })

  it('결제 중인 구독의 날짜는 종료일이 아니라 다음 결제일로 보여준다', () => {
    expect(planNote(makeUser({ plan: 'basic', plan_period_end: '2026-11-13' }))).toBe(
      '결제 중 · 다음 결제 2026-11-13',
    )
    expect(planNote(makeUser({ plan: 'basic' }))).toBe('결제 중')
  })
})

describe('pickAllowed', () => {
  const allowed = ['true', 'false'] as const

  it('허용된 값이면 그대로 돌려준다', () => {
    expect(pickAllowed('false', allowed)).toBe('false')
  })

  it('없는 값이나 허용되지 않은 값은 무시한다', () => {
    expect(pickAllowed(null, allowed)).toBeUndefined()
    expect(pickAllowed('', allowed)).toBeUndefined()
    expect(pickAllowed('maybe', allowed)).toBeUndefined()
  })
})

describe('parsePage', () => {
  it('1 이상의 정수는 그대로 읽는다', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('12')).toBe(12)
  })

  it.each([null, '', '0', '-3', '1.5', 'abc'])('이상한 값 %s는 첫 페이지로 본다', (value) => {
    expect(parsePage(value)).toBe(1)
  })
})
