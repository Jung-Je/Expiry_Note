import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pagination } from '../../components/ui/Pagination'
import { ADMIN_PAGE_SIZE } from '../../features/admin/api'
import type { AdminAction } from '../../features/admin/api'
import { useAdminLogsQuery } from '../../features/admin/hooks'
import { ACTION_LABELS, formatDateTime } from '../../features/admin/labels'

const ACTION_VALUES: AdminAction[] = [
  'plan_grant',
  'user_deactivate',
  'user_reactivate',
  'inquiry_reply',
  'notice_send',
]

export function AdminLogsPage() {
  const [action, setAction] = useState<AdminAction | ''>('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useAdminLogsQuery({ action: action || undefined, page })
  const logs = data?.results

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">작업 기록</h1>
      <p className="mt-1 text-sm text-slate-500">
        관리자가 한 작업을 누가 언제 했는지 확인합니다. 기록은 고치거나 지울 수 없습니다. 총 {data?.count ?? 0}건.
      </p>

      <select
        value={action}
        onChange={(e) => {
          setAction(e.target.value as AdminAction | '')
          setPage(1)
        }}
        aria-label="작업 종류"
        className="mt-4 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand"
      >
        <option value="">모든 작업</option>
        {ACTION_VALUES.map((value) => (
          <option key={value} value={value}>
            {ACTION_LABELS[value]}
          </option>
        ))}
      </select>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-medium">일시</th>
              <th className="px-4 py-3 font-medium">관리자</th>
              <th className="px-4 py-3 font-medium">작업</th>
              <th className="px-4 py-3 font-medium">대상 회원</th>
              <th className="px-4 py-3 font-medium">내용</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  작업 기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                </td>
              </tr>
            )}
            {!isLoading && !isError && logs?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  기록된 작업이 없습니다.
                </td>
              </tr>
            )}
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-slate-50 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(log.created_at)}</td>
                <td className="px-4 py-3 text-slate-700">{log.actor_email ?? '삭제된 계정'}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                  {ACTION_LABELS[log.action]}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {log.target_user_id && log.target_user_email ? (
                    <Link to={`/admin/users/${log.target_user_id}`} className="hover:text-brand">
                      {log.target_user_email}
                    </Link>
                  ) : log.action === 'notice_send' ? (
                    '-'
                  ) : (
                    '삭제된 계정'
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{log.summary || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} totalCount={data?.count ?? 0} onChange={setPage} />
    </div>
  )
}
