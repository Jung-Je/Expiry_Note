import { Link, useSearchParams } from 'react-router-dom'

export function BillingFailPage() {
  const [searchParams] = useSearchParams()
  const message = searchParams.get('message')

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 text-center">
      <p className="text-sm text-red-600">{message ?? '카드 등록이 취소되었습니다.'}</p>
      <Link className="text-sm font-medium text-indigo-600" to="/pricing">
        요금제로 돌아가기
      </Link>
    </div>
  )
}
