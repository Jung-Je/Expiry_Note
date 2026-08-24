export function formatAmount(amount: number | null): string {
  if (amount == null) return '-'
  return `${amount.toLocaleString('ko-KR')}원`
}

export function formatDday(daysUntilExpiry: number): string {
  if (daysUntilExpiry === 0) return 'D-day'
  return daysUntilExpiry > 0 ? `D-${daysUntilExpiry}` : `D+${Math.abs(daysUntilExpiry)}`
}
