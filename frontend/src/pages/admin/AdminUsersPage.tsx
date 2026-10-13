import { Link, useSearchParams } from 'react-router-dom'
import { Pagination } from '../../components/ui/Pagination'
import { ADMIN_PAGE_SIZE } from '../../features/admin/api'
import { useAdminUsersQuery } from '../../features/admin/hooks'
import {
  formatDate,
  parsePage,
  pickAllowed,
  PLAN_LABELS,
  PLAN_VALUES,
  SIGNUP_SOURCE_LABELS,
} from '../../features/admin/labels'
import { UserActionCell, UserPlanCell, UserStatusBadge } from '../../features/admin/UserCells'
import type { SignupSource } from '../../features/auth/api'

const SIGNUP_SOURCE_VALUES: SignupSource[] = ['email', 'kakao', 'google']
const ACTIVE_VALUES = ['true', 'false'] as const

const selectClass =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-brand'

type FilterKey = 'search' | 'plan' | 'signup_source' | 'is_active'

export function AdminUsersPage() {
  // 검색어·필터·페이지는 URL 쿼리에 둔다 — 개요 화면 카드가 `?is_active=false`처럼
  // 필터가 걸린 상태로 들어올 수 있고, 회원 상세를 보고 뒤로 와도 유지된다.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const plan = pickAllowed(searchParams.get('plan'), PLAN_VALUES)
  const signupSource = pickAllowed(searchParams.get('signup_source'), SIGNUP_SOURCE_VALUES)
  const activeParam = pickAllowed(searchParams.get('is_active'), ACTIVE_VALUES)
  const page = parsePage(searchParams.get('page'))

  const { data, isLoading, isError } = useAdminUsersQuery({
    search,
    plan,
    signupSource,
    isActive: activeParam === undefined ? undefined : activeParam === 'true',
    page,
  })
  const users = data?.results
  const hasFilter = Boolean(search || plan || signupSource || activeParam)

  function setFilter(key: FilterKey, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    // 조건이 바뀌면 결과 수도 바뀌므로 첫 페이지부터 다시 본다.
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function setPage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    if (nextPage > 1) {
      next.set('page', String(nextPage))
    } else {
      next.delete('page')
    }
    setSearchParams(next)
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">회원 관리</h1>
      <p className="mt-1 text-sm text-slate-500">
        가입한 회원을 조회하고 요금제와 계정 상태를 관리합니다. {hasFilter ? '조건에 맞는 회원' : '총'}{' '}
        {data?.count ?? 0}명.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="이메일 또는 이름으로 검색"
          aria-label="이메일 또는 이름으로 검색"
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          value={plan ?? ''}
          onChange={(e) => setFilter('plan', e.target.value)}
          aria-label="요금제"
          className={selectClass}
        >
          <option value="">모든 요금제</option>
          {PLAN_VALUES.map((value) => (
            <option key={value} value={value}>
              {PLAN_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={signupSource ?? ''}
          onChange={(e) => setFilter('signup_source', e.target.value)}
          aria-label="가입 경로"
          className={selectClass}
        >
          <option value="">모든 가입 경로</option>
          {SIGNUP_SOURCE_VALUES.map((value) => (
            <option key={value} value={value}>
              {SIGNUP_SOURCE_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={activeParam ?? ''}
          onChange={(e) => setFilter('is_active', e.target.value)}
          aria-label="계정 상태"
          className={selectClass}
        >
          <option value="">모든 상태</option>
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: true })}
            className="text-sm font-medium text-brand hover:text-brand-hover"
          >
            필터 초기화
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm shadow-slate-200/70">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">가입 경로</th>
              <th className="px-4 py-3 font-medium">이메일 인증</th>
              <th className="px-4 py-3 font-medium">요금제</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-red-600">
                  회원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                </td>
              </tr>
            )}
            {!isLoading && !isError && users?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/admin/users/${u.id}`} className="font-medium text-slate-900 hover:text-brand">
                    {u.email}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{u.name}</td>
                <td className="px-4 py-3 text-slate-700">{SIGNUP_SOURCE_LABELS[u.signup_source]}</td>
                <td className="px-4 py-3 text-slate-700">{u.is_email_verified ? '완료' : '미완료'}</td>
                <td className="px-4 py-3">
                  <UserPlanCell user={u} />
                </td>
                <td className="px-4 py-3">
                  <UserStatusBadge user={u} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(u.date_joined)}</td>
                <td className="px-4 py-3">
                  <UserActionCell user={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={ADMIN_PAGE_SIZE} totalCount={data?.count ?? 0} onChange={setPage} />
    </div>
  )
}
