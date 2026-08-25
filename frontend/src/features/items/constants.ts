import type { ItemCategory, ItemStatus } from './api'

// 백엔드 ExpiryItem.Category 선택지와 순서/값을 맞춘다 (backend/apps/items/models/expiry_item.py).
export const CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: 'subscription', label: '구독' },
  { value: 'contract', label: '계약' },
  { value: 'warranty', label: '보증' },
  { value: 'membership', label: '멤버십' },
  { value: 'insurance', label: '보험' },
  { value: 'other', label: '기타' },
]

// status는 백엔드가 계산해서 내려주는 값이라(ExpiryItem.status) 선택지가 아니라
// 표시용 라벨/배지 스타일만 필요하다.
export const STATUS_LABELS: Record<ItemStatus, string> = {
  expired: '만료됨',
  urgent: '임박',
  upcoming: '예정',
  normal: '여유',
}

export const STATUS_BADGE_STYLES: Record<ItemStatus, string> = {
  expired: 'bg-slate-200 text-slate-600',
  urgent: 'bg-red-100 text-red-700',
  upcoming: 'bg-amber-100 text-amber-700',
  normal: 'bg-emerald-100 text-emerald-700',
}

export const STATUS_BORDER_STYLES: Record<ItemStatus, string> = {
  expired: 'border-slate-300',
  urgent: 'border-red-400',
  upcoming: 'border-amber-400',
  normal: 'border-emerald-400',
}

export function categoryLabel(category: ItemCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
}

// 항목 이니셜 아바타 배경/글자색 — 카테고리별로 고정 배정한다(같은 카테고리는
// 항상 같은 색이 되도록. 목록/대시보드가 서로 다른 색을 매길 위험을 없앤다).
export const CATEGORY_AVATAR_STYLES: Record<ItemCategory, string> = {
  subscription: 'bg-violet-100 text-violet-700',
  contract: 'bg-amber-100 text-amber-700',
  warranty: 'bg-emerald-100 text-emerald-700',
  membership: 'bg-blue-100 text-blue-700',
  insurance: 'bg-rose-100 text-rose-700',
  other: 'bg-slate-100 text-slate-600',
}
