import { describe, expect, it } from 'vitest'
import { formatAmount, formatDday } from './format'

describe('formatAmount', () => {
  it('천 단위 구분 기호와 원을 붙인다', () => {
    expect(formatAmount(17000)).toBe('17,000원')
    expect(formatAmount(0)).toBe('0원')
  })

  it('금액이 없으면 -로 표시한다', () => {
    expect(formatAmount(null)).toBe('-')
  })
})

describe('formatDday', () => {
  it('남은 날은 D-n, 지난 날은 D+n, 당일은 D-day', () => {
    expect(formatDday(3)).toBe('D-3')
    expect(formatDday(-2)).toBe('D+2')
    expect(formatDday(0)).toBe('D-day')
  })
})
