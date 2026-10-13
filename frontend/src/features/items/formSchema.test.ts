import { describe, expect, it } from 'vitest'
import { type ItemFormValues, isWithinYearRange, itemFormSchema } from './formSchema'

const VALID: ItemFormValues = {
  title: '넷플릭스',
  category: 'subscription',
  billing_cycle: 'monthly',
  expiry_date: '2026-11-01',
  contract_end_date: '',
  amount: '17000',
  cancel_url: '',
  memo: '',
  notify_days_before: '7',
}

function errorFields(overrides: Partial<ItemFormValues>): string[] {
  const result = itemFormSchema.safeParse({ ...VALID, ...overrides })
  return result.success ? [] : result.error.issues.map((issue) => String(issue.path[0]))
}

describe('itemFormSchema', () => {
  it('정상 입력은 통과한다', () => {
    expect(errorFields({})).toEqual([])
  })

  it('선택 항목(금액·약정 종료일·해지 링크)은 비워둘 수 있다', () => {
    expect(errorFields({ amount: '', contract_end_date: '', cancel_url: '' })).toEqual([])
  })

  it.each(['-5', '12.5', '1e3', '99999999999'])('금액 %s는 거부한다', (amount) => {
    expect(errorFields({ amount })).toEqual(['amount'])
  })

  it.each(['', '0202-11-01', '1999-12-31', '2101-01-01', '20266-01-01'])(
    '다음 결제일 "%s"는 거부한다',
    (expiry_date) => {
      expect(errorFields({ expiry_date })).toContain('expiry_date')
    },
  )

  it('약정 종료일도 연도 범위를 벗어나면 거부한다', () => {
    expect(errorFields({ contract_end_date: '0202-01-31' })).toEqual(['contract_end_date'])
  })

  it('약정 종료일이 다음 결제일보다 빨라도 막지 않는다', () => {
    // 약정은 끝났고 결제만 이어지는 구독 — 폼은 경고만 보여준다.
    expect(errorFields({ contract_end_date: '2026-01-31' })).toEqual([])
  })

  it.each(['', '-1', '1.5', '366'])('알림 시점 "%s"는 거부한다', (notify_days_before) => {
    expect(errorFields({ notify_days_before })).toContain('notify_days_before')
  })

  it('해지 링크는 http(s)로 시작해야 한다', () => {
    expect(errorFields({ cancel_url: 'netflix.com/cancel' })).toEqual(['cancel_url'])
    expect(errorFields({ cancel_url: 'https://netflix.com/cancel' })).toEqual([])
  })
})

describe('isWithinYearRange', () => {
  it('2000~2100년만 참이다', () => {
    expect(isWithinYearRange('2000-01-01')).toBe(true)
    expect(isWithinYearRange('2100-12-31')).toBe(true)
    expect(isWithinYearRange('1999-12-31')).toBe(false)
    expect(isWithinYearRange('2101-01-01')).toBe(false)
  })

  it('빈 값은 거짓이다', () => {
    expect(isWithinYearRange('')).toBe(false)
  })
})
