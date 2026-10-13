interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  onChange: (page: number) => void
}

const buttonClass =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white'

/** 이전/다음 버튼과 "2 / 5" 표시. 한 페이지로 끝나면 아무것도 그리지 않는다. */
export function Pagination({ page: requestedPage, pageSize, totalCount, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null
  // 보고 있던 페이지가 사라진 경우(건수가 줄어듦) 서버는 마지막 페이지를 내려준다 — 표시도 맞춘다.
  const page = Math.min(Math.max(requestedPage, 1), totalPages)

  return (
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="페이지 이동">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} className={buttonClass}>
        이전
      </button>
      <span className="text-sm text-slate-500">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className={buttonClass}
      >
        다음
      </button>
    </nav>
  )
}
