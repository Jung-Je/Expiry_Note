import { useParams } from 'react-router-dom'

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">항목 상세</h1>
      <p className="mt-2 text-sm text-slate-500">항목 #{id}의 상세 정보가 이 화면에 표시될 예정입니다.</p>
    </div>
  )
}
