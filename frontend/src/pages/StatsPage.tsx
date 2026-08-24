import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import type { StatusStat } from '../features/items/api'
import { useItemStatsQuery } from '../features/items/hooks'

// dataviz 스킬의 검증된 기본 팔레트(references/palette.md)에서 그대로 가져온 값.
// 유형(카테고리)은 정체성 인코딩이라 고정 순서의 categorical 슬롯 1~6을 쓰고,
// 상태는 심각도를 나타내므로 별도로 예약된 status 팔레트를 쓴다.
const CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']
const SEQUENTIAL_BLUE = '#2a78d6'
const STATUS_COLORS: Record<StatusStat['status'], string> = {
  expired: '#d03b3b', // critical
  urgent: '#ec835a', // serious
  upcoming: '#fab219', // warning
  normal: '#0ca30c', // good
}

const AXIS_TICK = { fill: '#898781', fontSize: 12 }
const GRIDLINE = '#e1e0d9'

function formatWon(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`
}

function formatMonthLabel(month: string): string {
  const [, monthPart] = month.split('-')
  return `${Number(monthPart)}월`
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
          <Link to="/items/new" className="font-medium text-indigo-600 hover:text-indigo-500">
            항목을 추가해보세요.
          </Link>
        </p>
      </div>
    )
  }

  const monthlyData = stats.monthly_amounts.map((row) => ({
    month: formatMonthLabel(row.month),
    total_amount: row.total_amount,
  }))
  const categoryData = stats.by_category
  const statusData = stats.by_status

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">통계</h1>
        <p className="mt-2 text-sm text-slate-500">
          등록한 만료 항목을 유형·상태·결제 금액별로 확인하세요.
        </p>
      </div>

      <section>
        <h2 className="text-base font-semibold text-slate-900">월별 결제 예정 금액</h2>
        <div className="mt-3 h-64 rounded-lg border border-slate-200 bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={{ stroke: GRIDLINE }}
                tick={AXIS_TICK}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={AXIS_TICK}
                width={48}
                tickFormatter={(value: number) => `${(value / 10000).toLocaleString('ko-KR')}만`}
              />
              <Tooltip formatter={(value) => formatWon(Number(value))} />
              <Bar
                dataKey="total_amount"
                name="결제 예정 금액"
                fill={SEQUENTIAL_BLUE}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">유형별 항목 수</h2>
        <div className="mt-3 h-64 rounded-lg border border-slate-200 bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: GRIDLINE }}
                tick={AXIS_TICK}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={32} />
              <Tooltip formatter={(value) => `${Number(value)}개`} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {categoryData.map((row, index) => (
                  <Cell key={row.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">상태별 항목 수</h2>
        <div className="mt-3 h-64 rounded-lg border border-slate-200 bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRIDLINE} vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: GRIDLINE }}
                tick={AXIS_TICK}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} width={32} />
              <Tooltip formatter={(value) => `${Number(value)}개`} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {statusData.map((row) => (
                  <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
