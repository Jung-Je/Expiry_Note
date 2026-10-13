import { z } from 'zod'

// 백엔드 ExpiryItemSerializer의 검증과 같은 값이어야 한다. 날짜 입력칸은 연도를
// 0202나 20266처럼 잘못 쳐도 그대로 받아주기 때문에 범위를 직접 확인한다.
const MIN_DATE_YEAR = 2000
const MAX_DATE_YEAR = 2100
const MAX_AMOUNT = 2_147_483_647
const DATE_RANGE_MESSAGE = `${MIN_DATE_YEAR}년부터 ${MAX_DATE_YEAR}년 사이의 날짜를 입력하세요.`

export function isWithinYearRange(value: string): boolean {
  const year = Number(value.split('-')[0])
  return year >= MIN_DATE_YEAR && year <= MAX_DATE_YEAR
}

export const itemFormSchema = z.object({
  title: z.string().min(1, '서비스 또는 계약명을 입력하세요.').max(100),
  category: z.enum(['subscription', 'contract', 'warranty', 'membership', 'insurance', 'other']),
  billing_cycle: z.enum(['one_time', 'monthly', 'yearly']),
  expiry_date: z.string().min(1, '다음 결제일을 선택하세요.').refine(isWithinYearRange, DATE_RANGE_MESSAGE),
  contract_end_date: z
    .string()
    .refine((value) => value === '' || isWithinYearRange(value), DATE_RANGE_MESSAGE),
  // amount/notify_days_before는 input[type=number]가 항상 문자열로 넘겨주는
  // 값을 그대로 받고, 제출 시 숫자로 변환한다(zod.coerce를 쓰면 입력/출력
  // 타입이 갈려서 zodResolver 타입 추론이 깨지므로 문자열로 통일).
  amount: z
    .string()
    .refine((value) => value === '' || /^\d+$/.test(value), '0 이상의 정수(원)로 입력하세요.')
    .refine((value) => Number(value) <= MAX_AMOUNT, '금액이 너무 큽니다.'),
  cancel_url: z
    .string()
    .refine((value) => value === '' || /^https?:\/\//.test(value), '전체 URL(https://...)을 입력하세요.'),
  memo: z.string(),
  notify_days_before: z
    .string()
    .min(1, '숫자를 입력하세요.')
    .refine((value) => /^\d+$/.test(value), '0 이상의 정수를 입력하세요.')
    .refine((value) => Number(value) <= 365, '365 이하로 입력하세요.'),
})

export type ItemFormValues = z.infer<typeof itemFormSchema>
