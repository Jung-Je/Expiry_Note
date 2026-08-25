import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { formatAmount } from '../features/items/format'
import { useItemStatsQuery } from '../features/items/hooks'

// dataviz 스킬의 검증된 기본 팔레트(references/palette.md)에서 그대로 가져온 값.
// 유형(카테고리)은 정체성 인코딩이라 고정 순서의 categorical 슬롯을 쓴다.
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']
const BRAND = '#635bff'
const BRAND_LIGHT = '#e4e2ff'

const AXIS_TICK = { fill: '#94a3b8', fontSize: 12 }

function formatMonthLabel(month: string): string {
  const [, monthPart] = month.split('-')
  return `${Number(monthPart)}월`
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

export function StatsPage() {
  const { data: stats, isLoading } = useItemStatsQuery()

  if (isLoading) {
    return <p className="text-sm text-slate-500">불러오는 중...</p>
  }

  if (!stats || stats.total_count === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">통계</h1>
        <p className="mt-2 text-sm text-slate-500">
          등록된 항목이 없어 통계를 표시할 수 없습니다.{' '}
          <Link to="/items/new" className="font-medium text-brand hover:text-brand-hover">
            항목을 추가해보세요.
          </Link>
        </p>
      </div>
    )
  }

  const monthlyData = stats.monthly_amounts.map((row, index) => ({
    month: formatMonthLabel(row.month),
    total_amount: row.total_amount,
    isCurrent: index === 0,
  }))

  const categoryBreakdown = [...stats.by_category]
    .filter((row) => row.total_amount > 0)
    .sort((a, b) => b.total_amount - a.total_amount)
  const maxCategoryAmount = Math.max(...categoryBreakdown.map((row) => row.total_amount), 1)

  const thisMonthAmount = stats.monthly_amounts[0]?.total_amount ?? 0
  const nextMonthAmount = stats.monthly_amounts[1]?.total_amount ?? 0
  const expiredCount = stats.by_status.find((row) => row.status === 'expired')?.count ?? 0

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">통계</h1>
      <p className="mt-2 text-sm text-slate-500">고정비와 카테고리별 지출을 확인하세요.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="이번 달 고정비" value={formatAmount(thisMonthAmount)} />
        <StatCard label="다음 달 예정 금액" value={formatAmount(nextMonthAmount)} />
        <StatCard label="만료된 항목" value={`${expiredCount}건`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">월별 고정비</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#f1f5f9' }}
                  tick={AXIS_TICK}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={AXIS_TICK}
                  width={48}
                  tickFormatter={(value: number) => `${(value / 10000).toLocaleString('ko-KR')}만`}
                />
                <Tooltip formatter={(value) => formatAmount(Number(value))} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total_amount" name="고정비" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {monthlyData.map((row) => (
                    <Cell key={row.month} fill={row.isCurrent ? BRAND : BRAND_LIGHT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">카테고리별 지출</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">결제 금액이 등록된 항목이 없습니다.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {categoryBreakdown.map((row, index) => (
                <li key={row.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{row.label}</span>
                    <span className="font-medium text-slate-900">{formatAmount(row.total_amount)}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(row.total_amount / maxCategoryAmount) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
