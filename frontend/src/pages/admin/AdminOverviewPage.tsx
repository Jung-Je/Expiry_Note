import { Link } from 'react-router-dom'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAdminOverviewQuery } from '../../features/admin/hooks'
import type { AdminPlan } from '../../features/admin/api'
import { PLAN_LABELS } from '../../features/admin/labels'
import { formatAmount } from '../../features/items/format'

// StatsPage와 같은 팔레트(dataviz 스킬 references/palette.md 기준)를 쓴다.
const BRAND = '#635bff'
const AXIS_TICK = { fill: '#94a3b8', fontSize: 12 }

const PLAN_COLORS: Record<AdminPlan, string> = {
  free: '#cbd5e1',
  basic: '#2a78d6',
  pro: '#635bff',
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

/** 처리할 일이 있는지 보여주는 작은 카드. to가 있으면 해당 목록으로 간다. */
function AttentionCard({
  label,
  value,
  hint,
  to,
  isHighlighted = false,
}: {
  label: string
  value: string
  hint: string
  to?: string
  isHighlighted?: boolean
}) {
  const content = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${isHighlighted ? 'text-amber-600' : 'text-slate-900'}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </>
  )
  const className = 'block rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70'
  if (!to) {
    return <div className={className}>{content}</div>
  }
  return (
    <Link to={to} className={`${className} transition hover:shadow-md`}>
      {content}
    </Link>
  )
}

function formatMonthLabel(month: string): string {
  const [, monthPart] = month.split('-')
  return `${Number(monthPart)}월`
}

export function AdminOverviewPage() {
  const { data: overview, isLoading } = useAdminOverviewQuery()

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }
  if (!overview) {
    return null
  }

  const signupData = overview.users.monthly_signups.map((row) => ({
    month: formatMonthLabel(row.month),
    count: row.count,
  }))

  const planRows = (['free', 'basic', 'pro'] as const).map((plan) => ({
    plan,
    count: overview.subscriptions.by_plan[plan],
  }))
  const totalPlanUsers = Math.max(
    planRows.reduce((sum, row) => sum + row.count, 0),
    1,
  )

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">관리자 개요</h1>
      <p className="mt-1 text-sm text-slate-500">전체 회원·구독·매출 현황을 한눈에 확인하세요.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="전체 회원" value={`${overview.users.total}명`} />
        <StatCard label="이번 달 신규 가입" value={`${overview.users.new_this_month}명`} />
        <StatCard label="등록된 항목" value={`${overview.items.total}건`} />
        <StatCard label="이번 달 매출" value={formatAmount(overview.revenue.this_month)} />
      </div>

      <h2 className="mt-8 text-base font-semibold text-slate-900">확인이 필요한 것</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AttentionCard
          label="미답변 문의"
          value={`${overview.inquiries.unanswered}건`}
          hint="눌러서 미답변 문의만 보기"
          to="/admin/inquiries?answered=false"
          isHighlighted={overview.inquiries.unanswered > 0}
        />
        <AttentionCard
          label="곧 끝나는 부여 플랜"
          value={`${overview.subscriptions.grants_expiring_soon}명`}
          hint="7일 안에 무료로 돌아갑니다"
          isHighlighted={overview.subscriptions.grants_expiring_soon > 0}
        />
        <AttentionCard
          label="관리자 부여 플랜"
          value={`${overview.subscriptions.admin_granted}명`}
          hint="결제 없이 이용 중인 회원"
        />
        <AttentionCard
          label="비활성 계정"
          value={`${overview.users.inactive}명`}
          hint="눌러서 비활성 계정만 보기"
          to="/admin/users?is_active=false"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">최근 6개월 가입 추이</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tick={AXIS_TICK}
                />
                <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={32} allowDecimals={false} />
                <Tooltip formatter={(value) => `${value}명`} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="신규 가입" radius={[6, 6, 0, 0]} maxBarSize={36} fill={BRAND} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">플랜 분포</h2>
          <ul className="mt-4 flex flex-col gap-4">
            {planRows.map((row) => (
              <li key={row.plan}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{PLAN_LABELS[row.plan]}</span>
                  <span className="font-medium text-slate-900">{row.count}명</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(row.count / totalPlanUsers) * 100}%`,
                      backgroundColor: PLAN_COLORS[row.plan],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">누적 매출</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatAmount(overview.revenue.total)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
