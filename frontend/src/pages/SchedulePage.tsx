import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Drawer } from '../components/ui/Drawer'
import { Modal } from '../components/ui/Modal'
import type { CalendarNote, ExpiryItem, ItemCategory } from '../features/items/api'
import {
  CATEGORY_OPTIONS,
  categoryLabel,
  STATUS_BADGE_STYLES,
  STATUS_LABELS,
} from '../features/items/constants'
import { formatAmount } from '../features/items/format'
import {
  useCalendarNotesQuery,
  useDeleteCalendarNoteMutation,
  useMonthlyCalendarQuery,
  useUpsertCalendarNoteMutation,
} from '../features/items/hooks'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function NoteEditorModal({
  date,
  note,
  onClose,
}: {
  date: string
  note: CalendarNote | undefined
  onClose: () => void
}) {
  // 저장된 메모가 있으면 먼저 '보기' 상태로 보여준다 — 빈 입력창과 똑같이
  // 생긴 화면에 저장된 내용이 그대로 떠 있으면, 처음 쓰는 사람 입장에선
  // 저장이 된 건지 안 된 건지 헷갈릴 수 있어서다. 새로 쓸 때만 바로
  // 입력창을 띄운다.
  const [isEditing, setIsEditing] = useState(!note)
  const [content, setContent] = useState(note?.content ?? '')
  const upsertNote = useUpsertCalendarNoteMutation()
  const deleteNote = useDeleteCalendarNoteMutation()

  async function handleSave() {
    if (content.trim() === '') {
      if (note) await deleteNote.mutateAsync(date)
      onClose()
      return
    }
    await upsertNote.mutateAsync({ date, content })
    onClose()
  }

  async function handleDelete() {
    await deleteNote.mutateAsync(date)
    onClose()
  }

  const isPending = upsertNote.isPending || deleteNote.isPending

  if (note && !isEditing) {
    return (
      <Modal onClose={onClose}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{date} 메모</h2>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
            저장됨
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3.5 text-sm text-slate-700">
          {note.content}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          마지막 수정: {new Date(note.updated_at).toLocaleString('ko-KR')}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            삭제
          </button>
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
            >
              수정
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold text-slate-900">{date} 메모</h2>
      <textarea
        autoFocus
        rows={4}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="이 날짜에 남길 메모를 입력하세요."
        className="mt-3 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none"
      />
      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => (note ? setIsEditing(false) : onClose())}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </Modal>
  )
}

function ScheduleDetailDrawer({ item, onClose }: { item: ExpiryItem; onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <Drawer onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">일정 상세</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition hover:text-slate-600"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-base font-medium text-slate-900">{item.title}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">일정</dt>
          <dd className="text-slate-900">{item.expiry_date}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">금액</dt>
          <dd className="text-slate-900">{formatAmount(item.amount)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">유형</dt>
          <dd className="text-slate-900">{categoryLabel(item.category)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">알림</dt>
          <dd className="text-slate-900">{item.notify_days_before}일 전</dd>
        </div>
      </dl>

      {item.memo && (
        <div className="mt-4">
          <p className="text-sm text-slate-500">메모</p>
          <p className="mt-1 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{item.memo}</p>
        </div>
      )}

      <div className="mt-auto flex gap-3 pt-6">
        <button
          type="button"
          onClick={() => navigate(`/items/${item.id}/edit`)}
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          수정
        </button>
        <button
          type="button"
          onClick={() => navigate(`/items/${item.id}`)}
          className="flex-1 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          상세 보기
        </button>
      </div>
    </Drawer>
  )
}

export function SchedulePage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all')
  const [editingNoteDate, setEditingNoteDate] = useState<string | null>(null)
  const year = cursor.getFullYear()
  const month = cursor.getMonth() + 1

  const { data: calendar, isLoading } = useMonthlyCalendarQuery(year, month)
  const { data: notes } = useCalendarNotesQuery(year, month)

  const notesByDate = useMemo(() => {
    const map = new Map<string, CalendarNote>()
    for (const note of notes ?? []) {
      map.set(note.date, note)
    }
    return map
  }, [notes])

  const allMonthItems = useMemo(
    () =>
      (calendar?.days ?? [])
        .flatMap((day) => day.items)
        .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date)),
    [calendar],
  )

  const categoryFilters = useMemo(() => {
    const counts = new Map<ItemCategory, number>()
    for (const item of allMonthItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }
    return [
      { value: 'all' as const, label: '전체', count: allMonthItems.length },
      ...CATEGORY_OPTIONS.filter((option) => counts.has(option.value)).map((option) => ({
        value: option.value,
        label: option.label,
        count: counts.get(option.value) ?? 0,
      })),
    ]
  }, [allMonthItems])

  const monthItems = useMemo(
    () =>
      categoryFilter === 'all'
        ? allMonthItems
        : allMonthItems.filter((item) => item.category === categoryFilter),
    [allMonthItems, categoryFilter],
  )

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ExpiryItem[]>()
    for (const item of monthItems) {
      const existing = map.get(item.expiry_date) ?? []
      existing.push(item)
      map.set(item.expiry_date, existing)
    }
    return map
  }, [monthItems])

  const gridDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">일정</h1>
      <p className="mt-2 text-sm text-slate-500">결제·만료 일정을 한눈에 확인하세요.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categoryFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setCategoryFilter(filter.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              categoryFilter === filter.value
                ? 'bg-brand text-white'
                : 'bg-white text-slate-600 shadow-sm shadow-slate-200/70 hover:bg-slate-50'
            }`}
          >
            {filter.label} {filter.count}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCursor((prev) => subMonths(prev, 1))}
              className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="이전 달"
            >
              ‹
            </button>
            <span className="w-24 text-center text-sm font-semibold text-slate-900">
              {year}년 {month}월
            </span>
            <button
              type="button"
              onClick={() => setCursor((prev) => addMonths(prev, 1))}
              className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-slate-500">불러오는 중...</p>
          ) : (
            <div className="mt-5 grid grid-cols-7 gap-y-1 text-sm">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="pb-2 text-center text-xs font-medium text-slate-400">
                  {label}
                </div>
              ))}
              {gridDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const dayItems = itemsByDate.get(key) ?? []
                const inCurrentMonth = isSameMonth(day, cursor)
                const hasNote = notesByDate.has(key)

                return (
                  <div key={key} className="min-h-20 px-1 pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingNoteDate(key)}
                        title={hasNote ? notesByDate.get(key)?.content : '메모 추가'}
                        className={
                          isToday(day)
                            ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-medium text-white'
                            : `flex h-6 w-6 items-center justify-center rounded-full text-xs transition hover:bg-slate-100 ${inCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`
                        }
                      >
                        {day.getDate()}
                      </button>
                      {hasNote && <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />}
                    </div>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {dayItems.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            title={item.title}
                            className={`block w-full truncate rounded-md px-1 py-0.5 text-left text-[11px] ${STATUS_BADGE_STYLES[item.status]}`}
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-sm font-semibold text-slate-900">이번 달 일정</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {monthItems.length === 0 && (
              <p className="text-sm text-slate-500">
                {categoryFilter === 'all' ? '이번 달 일정이 없습니다.' : '선택한 유형의 일정이 없습니다.'}
              </p>
            )}
            {monthItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_STYLES[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{item.expiry_date}</p>
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/items/new"
            className="mt-4 block rounded-lg bg-brand px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            + 항목 추가
          </Link>
        </div>
      </div>

      {selectedItem && (
        <ScheduleDetailDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {editingNoteDate && (
        <NoteEditorModal
          date={editingNoteDate}
          note={notesByDate.get(editingNoteDate)}
          onClose={() => setEditingNoteDate(null)}
        />
      )}
    </div>
  )
}
