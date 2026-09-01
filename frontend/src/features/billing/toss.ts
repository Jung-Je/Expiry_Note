// 토스페이먼츠 카드 등록(빌링키 발급을 위한 인증)은 SDK가 결제창을 띄우고
// successUrl/failUrl로 되돌려주는 방식이라 프론트에서 시작해야 한다. 다만
// 그 결과로 받는 authKey를 실제 빌링키로 교환하는 건 시크릿 키가 필요한
// 작업이라 반드시 백엔드에서 한다(features/billing/api.ts의 subscribe 참고).
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestBillingAuth: (options: {
          method: 'CARD'
          successUrl: string
          failUrl: string
          customerEmail?: string
          customerName?: string
        }) => Promise<void>
      }
    }
  }
}

const TOSS_SDK_SRC = 'https://js.tosspayments.com/v2/standard'

let sdkPromise: Promise<void> | null = null

function loadTossSdk(): Promise<void> {
  sdkPromise ??= new Promise((resolve, reject) => {
    if (window.TossPayments) {
      resolve(undefined)
      return
    }
    const script = document.createElement('script')
    script.src = TOSS_SDK_SRC
    script.onload = () => resolve(undefined)
    script.onerror = () => reject(new Error('토스페이먼츠 SDK를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

import type { PaidPlan } from './api'

// 카드 등록 결제창이 어떤 플랜을 구독하려던 시도였는지는 토스가 몰라도 되는
// 우리 쪽 정보라, successUrl 쿼리에 실어 보낸다 — 토스는 그 위에 자기
// authKey/customerKey를 &로 이어붙여서 그대로 되돌려준다.
export function getBillingSuccessUrl(plan: PaidPlan): string {
  return `${window.location.origin}/billing/success?plan=${plan}`
}

export function getBillingFailUrl(): string {
  return `${window.location.origin}/billing/fail`
}

export async function startCardRegistration(options: {
  customerKey: string
  plan: PaidPlan
  customerEmail?: string
  customerName?: string
}): Promise<void> {
  await loadTossSdk()
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
  if (!clientKey) {
    throw new Error('VITE_TOSS_CLIENT_KEY가 설정되어 있지 않습니다.')
  }
  if (!window.TossPayments) {
    throw new Error('토스페이먼츠 SDK를 불러오지 못했습니다.')
  }

  const payment = window.TossPayments(clientKey).payment({ customerKey: options.customerKey })
  // 성공하면 successUrl로, 실패/취소하면 failUrl로 페이지 전체가
  // 리다이렉트되므로 이 함수는 정상적으로는 반환되지 않는다.
  await payment.requestBillingAuth({
    method: 'CARD',
    successUrl: getBillingSuccessUrl(options.plan),
    failUrl: getBillingFailUrl(),
    customerEmail: options.customerEmail,
    customerName: options.customerName,
  })
}
