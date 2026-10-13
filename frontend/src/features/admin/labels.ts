import type { SignupSource } from '../auth/api'
import type { AdminAction, AdminPlan, AdminUser, InquiryCategory, NoticeAudience } from './api'

// 관리자 화면 여러 곳(목록·상세·필터)에서 같은 문구를 쓰도록 한곳에 모았다.

export const PLAN_LABELS: Record<AdminPlan, string> = {
  free: '무료',
  basic: '베이직',
  pro: '프로',
}

export const PLAN_VALUES: AdminPlan[] = ['free', 'basic', 'pro']

export const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  email: '이메일',
  kakao: '카카오',
  google: '구글',
}

export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategory, string> = {
  general: '서비스 이용',
  billing: '결제/구독',
  bug: '오류 신고',
  feature: '기능 제안',
  other: '기타',
}

export const ACTION_LABELS: Record<AdminAction, string> = {
  user_deactivate: '계정 비활성화',
  user_reactivate: '계정 재활성화',
  plan_grant: '요금제 변경',
  inquiry_reply: '문의 답변',
  notice_send: '공지 발송',
}

export const NOTICE_AUDIENCE_LABELS: Record<NoticeAudience, string> = {
  all: '전체 회원',
  free: '무료 플랜 회원',
  basic: '베이직 플랜 회원',
  pro: '프로 플랜 회원',
}

/** 요금제 배지 아래에 붙는 한 줄 설명. 무료는 덧붙일 말이 없다. */
export function planNote(user: AdminUser): string | null {
  if (user.plan === 'free') return null
  if (user.is_plan_admin_granted) {
    return user.plan_period_end ? `관리자 부여 · ${user.plan_period_end}까지` : '관리자 부여 · 기간 제한 없음'
  }
  return user.plan_period_end ? `결제 중 · 다음 결제 ${user.plan_period_end}` : '결제 중'
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** URL 쿼리 값이 허용된 값 중 하나일 때만 돌려준다 — 주소창에 아무 값이나 넣어도 무시되게. */
export function pickAllowed<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((candidate) => candidate === value)
}

/** `?page=` 값을 1 이상의 정수로 읽는다. 없거나 이상한 값이면 1. */
export function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}
