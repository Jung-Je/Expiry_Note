import { useState } from 'react'
import { useAdminUsersQuery } from '../../features/admin/hooks'
import type { SignupSource } from '../../features/auth/api'

const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  email: '이메일',
  kakao: '카카오',
  google: '구글',
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const { data: users, isLoading } = useAdminUsersQuery(search)

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">회원 관리</h1>
      <p className="mt-1 text-sm text-slate-500">가입한 회원 목록을 조회합니다. 총 {users?.length ?? 0}명.</p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이메일 또는 이름으로 검색"
        className="mt-4 w-full max-w-sm rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
      />

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">가입 경로</th>
              <th className="px-4 py-3 font-medium">이메일 인증</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">가입일</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            )}
            {!isLoading && users?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 text-slate-900">{u.email}</td>
                <td className="px-4 py-3 text-slate-700">{u.name}</td>
                <td className="px-4 py-3 text-slate-700">{SIGNUP_SOURCE_LABELS[u.signup_source]}</td>
                <td className="px-4 py-3 text-slate-700">{u.is_email_verified ? '완료' : '미완료'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {u.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(u.date_joined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
