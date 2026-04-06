import { useState, useMemo, useRef, useEffect } from 'react'
import {
  addDays, addMonths, addWeeks,
  endOfMonth, endOfWeek,
  format, isToday,
  parseISO, startOfMonth, startOfWeek, subDays, subMonths, subWeeks,
  getDay, eachDayOfInterval,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { allTeacherEvents, teacherStats, schedulingStudents } from '../../mock/workbenchMock'
import type { SchedulingStudent } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'

// ── types ─────────────────────────────────────────────────────────────────────
type ScheduleRecord = {
  id: string
  opType: '排课' | '调课'
  title: string
  date: string
  startTime: string
  endTime: string
  teacherName: string
  createdAt: string // HH:mm
}

// ── constants ─────────────────────────────────────────────────────────────────
type CalView = 'day' | 'week' | 'month'
const VIEW_LABELS: Record<CalView, string> = { day: '日', week: '周', month: '月' }
const HOUR_START = 0
const HOUR_END   = 24
const HOUR_COUNT = HOUR_END - HOUR_START   // 24
const HOUR_PX    = 60                      // px per hour
const TOTAL_PX   = HOUR_COUNT * HOUR_PX   // 780px
const DAY_NAMES  = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTop(mins: number) {
  return ((mins - HOUR_START * 60) / 60) * HOUR_PX
}

// ── StudentProfileModal ───────────────────────────────────────────────────────
function StudentProfileModal({ student, onClose }: { student: SchedulingStudent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25" />
      <div
        className="relative w-72 rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: student.color }}
          >
            {student.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{student.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{student.currentChapter}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]"
          >✕</button>
        </div>
        {/* 卡点 tag */}
        <div className="border-b border-[var(--color-border)] px-4 py-2.5">
          <span className="rounded-full px-2.5 py-1 text-xs font-semibold text-white" style={{ backgroundColor: '#e8845a' }}>
            当前卡点：{student.kpoint}
          </span>
        </div>
        {/* Info rows */}
        <div className="divide-y divide-[var(--color-border)] px-4">
          {[
            { label: '带教老师', value: student.teacherName },
            { label: '诊断老师', value: student.diagnosisTeacher ?? '–' },
            { label: '入学日期', value: student.joinDate },
            { label: '累计课次', value: `${student.sessionCount} 节` },
            { label: '累计学时', value: `${student.totalHours} 小时` },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-2">
              <span className="text-sm text-[var(--color-text-muted)]">{r.label}</span>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{r.value}</span>
            </div>
          ))}
        </div>
        <div className="px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--color-primary)] py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

// ── StudentListItem ───────────────────────────────────────────────────────────
function StudentListItem({
  student,
  selected,
  onSelect,
}: {
  student: SchedulingStudent
  selected: boolean
  onSelect: (s: SchedulingStudent) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div
      className={[
        'border-b border-[var(--color-border)] transition-colors',
        selected ? 'bg-[var(--color-primary-light)]' : 'bg-white hover:bg-[var(--color-bg-left)]',
      ].join(' ')}
    >
      {showProfile && <StudentProfileModal student={student} onClose={() => setShowProfile(false)} />}

      {/* Main row — click expands details AND switches teacher */}
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer select-none items-start gap-2.5 px-3 py-2.5"
        onClick={() => { setExpanded(v => !v); onSelect(student) }}
        onKeyDown={e => e.key === 'Enter' && (setExpanded(v => !v), onSelect(student))}
      >
        {/* Avatar — click opens profile modal */}
        <div
          className={[
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ring-2 transition-all cursor-pointer',
            selected ? 'ring-[var(--color-primary)]' : 'ring-transparent hover:ring-[var(--color-primary)]',
          ].join(' ')}
          style={{ backgroundColor: student.color }}
          onClick={e => { e.stopPropagation(); setShowProfile(true) }}
        >
          {student.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{student.name}</span>
            <span
              className="truncate rounded-full px-1.5 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: '#e8845a' }}
            >
              {student.kpoint}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{student.currentChapter}</div>
        </div>

        {/* Chevron indicator */}
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={[
            'mt-1.5 shrink-0 text-[var(--color-text-muted)] transition-transform duration-150',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2.5 space-y-1.5">
          {[
            { label: '带教老师', value: student.teacherName },
            { label: '诊断老师', value: student.diagnosisTeacher ?? '–' },
            { label: '入学日期', value: student.joinDate },
            { label: '累计课次', value: `${student.sessionCount} 节` },
            { label: '累计学时', value: `${student.totalHours} 小时` },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-muted)]">{r.label}</span>
              <span className="text-[11px] font-medium text-[var(--color-text-primary)]">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── WeekView ──────────────────────────────────────────────────────────────────
function WeekView({
  weekStart,
  events,
  teacherColor,
  pendingSlot,
  onCellClick,
  onEventClick,
}: {
  weekStart: Date
  events: ReturnType<typeof allTeacherEvents.filter>
  teacherColor: string
  pendingSlot: { date: string; startTime: string; endTime: string } | null
  onCellClick: (date: string, startTime: string) => void
  onEventClick: (ev: ReturnType<typeof allTeacherEvents.filter>[number]) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_PX
  }, [])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  // Group events by date
  const byDate = useMemo(() => {
    const map: Record<string, typeof events> = {}
    events.forEach(e => { map[e.date] = [...(map[e.date] ?? []), e] })
    return map
  }, [events])

  const hours = Array.from({ length: HOUR_COUNT }, (_, i) => HOUR_START + i)

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-auto">
      {/* Day headers */}
      <div className="sticky top-0 z-10 flex border-b border-[var(--color-border)] bg-white">
        <div className="w-12 shrink-0 border-r border-[var(--color-border)]" />
        {days.map(d => {
          const todayFlag = isToday(d)
          return (
            <div
              key={d.toISOString()}
              className="flex flex-1 flex-col items-center border-r border-[var(--color-border)] py-2 last:border-r-0"
            >
              <span className="text-[11px] text-[var(--color-text-muted)]">{DAY_NAMES[getDay(d)]}</span>
              <div
                className={[
                  'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                  todayFlag
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {format(d, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid body */}
      <div className="relative flex" style={{ height: TOTAL_PX }}>
        {/* Time axis */}
        <div className="sticky left-0 z-10 w-12 shrink-0 border-r border-[var(--color-border)] bg-white">
          {hours.map(h => (
            <div
              key={h}
              className="absolute w-full pr-1.5 text-right text-[11px] text-[var(--color-text-muted)]"
              style={{ top: (h - HOUR_START) * HOUR_PX - 7 }}
            >
              {h}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map(d => {
          const dateStr  = format(d, 'yyyy-MM-dd')
          const dayEvs   = byDate[dateStr] ?? []

          return (
            <div
              key={dateStr}
              className="relative flex-1 border-r border-[var(--color-border)] last:border-r-0"
              onClick={(ev) => {
                const rect  = ev.currentTarget.getBoundingClientRect()
                const relY  = ev.clientY - rect.top
                const rawH  = HOUR_START + relY / HOUR_PX
                const h     = Math.floor(rawH)
                const m     = relY % HOUR_PX < HOUR_PX / 2 ? 0 : 30
                const pad   = (n: number) => String(n).padStart(2, '0')
                const endH  = m === 30 ? h + 1 : h
                const endM  = m === 30 ? 0 : 30
                onCellClick(dateStr, `${pad(h)}:${pad(m)}`)
                void endH; void endM
              }}
            >
              {/* Hour grid lines */}
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-t border-[var(--color-border)]/50"
                  style={{ top: (h - HOUR_START) * HOUR_PX }}
                />
              ))}
              {/* Half-hour lines */}
              {hours.map(h => (
                <div
                  key={`h${h}`}
                  className="absolute w-full border-t border-dashed border-[var(--color-border)]/30"
                  style={{ top: (h - HOUR_START) * HOUR_PX + HOUR_PX / 2 }}
                />
              ))}

              {/* Events */}
              {dayEvs.map(ev => {
                const startMins = timeToMinutes(ev.startTime)
                const endMins   = timeToMinutes(ev.endTime)
                const top       = minutesToTop(startMins)
                const height    = Math.max(((endMins - startMins) / 60) * HOUR_PX, 20)
                return (
                  <div
                    key={ev.id}
                    className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1.5 py-1 text-white cursor-pointer hover:brightness-90 transition-[filter]"
                    style={{
                      top,
                      height,
                      backgroundColor: ev.type === 'class' ? teacherColor : '#9b6fcc',
                      opacity: 0.92,
                    }}
                    onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                  >
                    <div className="truncate text-[11px] font-semibold leading-tight">{ev.title}</div>
                    <div className="text-[11px] opacity-80">{ev.startTime}–{ev.endTime}</div>
                  </div>
                )
              })}

              {/* Pending new slot */}
              {pendingSlot?.date === dateStr && (() => {
                const startMins = timeToMinutes(pendingSlot.startTime)
                const endMins   = timeToMinutes(pendingSlot.endTime)
                const top       = minutesToTop(startMins)
                const height    = Math.max(((endMins - startMins) / 60) * HOUR_PX, 20)
                return (
                  <div
                    className="absolute left-0.5 right-0.5 rounded border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)] px-1.5 py-1"
                    style={{ top, height }}
                  >
                    <div className="truncate text-[11px] font-semibold text-[var(--color-primary)]">新排课</div>
                    <div className="text-[11px] text-[var(--color-primary)]">{pendingSlot.startTime}–{pendingSlot.endTime}</div>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DayView ───────────────────────────────────────────────────────────────────
function DayView({
  date,
  events,
  teacherColor,
  pendingSlot,
  onCellClick,
  onEventClick,
}: {
  date: Date
  events: ReturnType<typeof allTeacherEvents.filter>
  teacherColor: string
  pendingSlot: { date: string; startTime: string; endTime: string } | null
  onCellClick: (date: string, startTime: string) => void
  onEventClick: (ev: ReturnType<typeof allTeacherEvents.filter>[number]) => void
}) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayEvs  = events.filter(e => e.date === dateStr)
  const hours   = Array.from({ length: HOUR_COUNT }, (_, i) => HOUR_START + i)

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_PX
  }, [])

  return (
    <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-auto">
      {/* Day header */}
      <div className="sticky top-0 z-10 flex border-b border-[var(--color-border)] bg-white">
        <div className="w-12 shrink-0 border-r border-[var(--color-border)]" />
        <div className="flex flex-1 flex-col items-center border-r border-[var(--color-border)] py-2">
          <span className="text-[11px] text-[var(--color-text-muted)]">{DAY_NAMES[getDay(date)]}</span>
          <div className={[
            'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
            isToday(date) ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-primary)]',
          ].join(' ')}>
            {format(date, 'd')}
          </div>
        </div>
      </div>

      <div className="relative flex" style={{ height: TOTAL_PX }}>
        <div className="sticky left-0 z-10 w-12 shrink-0 border-r border-[var(--color-border)] bg-white">
          {hours.map(h => (
            <div key={h} className="absolute w-full pr-1.5 text-right text-[11px] text-[var(--color-text-muted)]"
              style={{ top: (h - HOUR_START) * HOUR_PX - 7 }}>{h}:00</div>
          ))}
        </div>
        <div className="relative flex-1 cursor-pointer" onClick={(ev) => {
          const rect = ev.currentTarget.getBoundingClientRect()
          const relY = ev.clientY - rect.top
          const h = Math.floor(HOUR_START + relY / HOUR_PX)
          const m = relY % HOUR_PX < HOUR_PX / 2 ? 0 : 30
          onCellClick(dateStr, `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
        }}>
          {hours.map(h => (
            <div key={h} className="absolute w-full border-t border-[var(--color-border)]/50"
              style={{ top: (h - HOUR_START) * HOUR_PX }} />
          ))}
          {hours.map(h => (
            <div key={`h${h}`} className="absolute w-full border-t border-dashed border-[var(--color-border)]/30"
              style={{ top: (h - HOUR_START) * HOUR_PX + HOUR_PX / 2 }} />
          ))}
          {dayEvs.map(ev => {
            const top    = minutesToTop(timeToMinutes(ev.startTime))
            const height = Math.max(((timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)) / 60) * HOUR_PX, 20)
            return (
              <div key={ev.id} className="absolute left-1 right-1 overflow-hidden rounded px-2 py-1 text-white cursor-pointer hover:brightness-90 transition-[filter]"
                style={{ top, height, backgroundColor: ev.type === 'class' ? teacherColor : '#9b6fcc', opacity: 0.92 }}
                onClick={e => { e.stopPropagation(); onEventClick(ev) }}>
                <div className="truncate text-sm font-semibold">{ev.title}</div>
                <div className="text-[11px] opacity-80">{ev.startTime}–{ev.endTime}</div>
              </div>
            )
          })}
          {pendingSlot?.date === dateStr && (() => {
            const top    = minutesToTop(timeToMinutes(pendingSlot.startTime))
            const height = Math.max(((timeToMinutes(pendingSlot.endTime) - timeToMinutes(pendingSlot.startTime)) / 60) * HOUR_PX, 20)
            return (
              <div className="absolute left-1 right-1 rounded border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-1"
                style={{ top, height }}>
                <div className="text-sm font-semibold text-[var(--color-primary)]">新排课</div>
                <div className="text-[11px] text-[var(--color-primary)]">{pendingSlot.startTime}–{pendingSlot.endTime}</div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── MonthView ─────────────────────────────────────────────────────────────────
function MonthView({
  date,
  events,
  teacherColor,
  onDayClick,
}: {
  date: Date
  events: ReturnType<typeof allTeacherEvents.filter>
  teacherColor: string
  onDayClick: (d: Date) => void
}) {
  const monthStart = startOfMonth(date)
  const monthEnd   = endOfMonth(date)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const byDate = useMemo(() => {
    const map: Record<string, number> = {}
    events.forEach(e => { map[e.date] = (map[e.date] ?? 0) + 1 })
    return map
  }, [events])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-2">
      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {['一','二','三','四','五','六','日'].map(d => (
          <div key={d} className="py-1 text-center text-[11px] font-medium text-[var(--color-text-muted)]">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map(d => {
          const ds      = format(d, 'yyyy-MM-dd')
          const count   = byDate[ds] ?? 0
          const inMonth = d.getMonth() === date.getMonth()
          const today   = isToday(d)
          return (
            <div
              key={ds}
              onClick={() => onDayClick(d)}
              className={[
                'flex min-h-[56px] cursor-pointer flex-col rounded-lg border p-1.5 transition-colors hover:border-[var(--color-primary)]',
                today ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] bg-white',
                !inMonth ? 'opacity-30' : '',
              ].join(' ')}
            >
              <span className={['text-xs font-semibold', today ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                {format(d, 'd')}
              </span>
              {count > 0 && (
                <div className="mt-auto flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: teacherColor }} />
                  <span className="text-[11px]" style={{ color: teacherColor }}>{count}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── EventActionModal ──────────────────────────────────────────────────────────
function EventActionModal({
  event,
  teacherColor,
  onDelete,
  onCancel,
}: {
  event: { id: string; title: string; date: string; startTime: string; endTime: string }
  teacherColor: string
  onDelete: () => void
  onCancel: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative w-72 rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">课程详情</div>
          <button type="button" onClick={onCancel}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]">✕</button>
        </div>
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-1 rounded-full shrink-0" style={{ backgroundColor: teacherColor }} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{event.title}</span>
          </div>
          <div className="text-sm text-[var(--color-text-muted)]">
            {format(parseISO(event.date), 'M月d日(EEE)', { locale: zhCN })}
            &nbsp;·&nbsp;{event.startTime}–{event.endTime}
          </div>
        </div>
        <div className="flex gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]">
            取消
          </button>
          <button
            type="button"
            onClick={() => { if (!confirmDel) { setConfirmDel(true) } else { onDelete() } }}
            className={[
              'flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors',
              confirmDel
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'border border-red-300 text-red-500 hover:bg-red-50',
            ].join(' ')}
          >
            {confirmDel ? '确认删除（调课）' : '删除日程（调课）'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AddSlotModal ──────────────────────────────────────────────────────────────
function AddSlotModal({
  date,
  startTime,
  selectedStudent,
  onConfirm,
  onCancel,
}: {
  date: string
  startTime: string
  selectedStudent: SchedulingStudent | null
  onConfirm: (title: string, start: string, end: string) => void
  onCancel: () => void
}) {
  const [title,     setTitle]     = useState(selectedStudent ? `申论课 · ${selectedStudent.name}` : '')
  const [start,     setStart]     = useState(startTime)
  const [end,       setEnd]       = useState(() => {
    const [h, m] = startTime.split(':').map(Number)
    const endM = m + 90
    const endH = h + Math.floor(endM / 60)
    const rem  = endM % 60
    return `${String(endH).padStart(2,'0')}:${String(rem).padStart(2,'0')}`
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative w-80 rounded-[var(--radius-card)] bg-white p-4 shadow-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          添加课程 · {format(parseISO(date), 'M月d日(EEE)', { locale: zhCN })}
        </div>
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-[11px] text-[var(--color-text-muted)]">课程名称</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]"
              placeholder="申论课 · 学生姓名"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] text-[var(--color-text-muted)]">开始时间</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[11px] text-[var(--color-text-muted)]">结束时间</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]">
            取消
          </button>
          <button type="button" onClick={() => title.trim() && onConfirm(title.trim(), start, end)}
            disabled={!title.trim()}
            className="flex-1 rounded-lg bg-[var(--color-primary)] py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            确认排课
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SchedulingView ────────────────────────────────────────────────────────────
export function SchedulingView() {
  const today = useMemo(() => new Date(), [])

  const [view,            setView]            = useState<CalView>('week')
  const [currentDate,     setCurrentDate]     = useState(today)
  const storeEvents          = useWorkbenchStore(s => s.calendarEvents)
  const addCalendarEvent     = useWorkbenchStore(s => s.addCalendarEvent)
  const deleteCalendarEvent  = useWorkbenchStore(s => s.deleteCalendarEvent)

  const [selectedTeacher, setSelectedTeacher] = useState(teacherStats[0].name)
  const [selectedStudent, setSelectedStudent] = useState<SchedulingStudent | null>(null)
  const [searchQuery,     setSearchQuery]     = useState('')
  const [pendingSlot,     setPendingSlot]     = useState<{ date: string; startTime: string; endTime: string } | null>(null)
  const [actionEvent,     setActionEvent]     = useState<ReturnType<typeof allTeacherEvents.filter>[number] | null>(null)
  const [deletedIds,      setDeletedIds]      = useState<Set<string>>(new Set())
  const [scheduleRecords, setScheduleRecords] = useState<ScheduleRecord[]>([])
  const [showRecords,     setShowRecords]     = useState(false)

  const teacher    = teacherStats.find(t => t.name === selectedTeacher)!
  const allEvents  = useMemo(() => {
    // merge mock events + store events (store events treated as selected teacher's events)
    const storeAsTeacherEvs = storeEvents.map(e => ({
      ...e,
      teacherName: selectedTeacher,
      teacherColor: teacher.color,
    }))
    return [...allTeacherEvents, ...storeAsTeacherEvs]
  }, [storeEvents, selectedTeacher, teacher.color])
  const teacherEvs = useMemo(
    () => allEvents.filter(e => e.teacherName === selectedTeacher && !deletedIds.has(e.id)),
    [allEvents, selectedTeacher, deletedIds],
  )

  // Compute week start for week/day navigation label
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  )
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  )

  const navLabel = useMemo(() => {
    if (view === 'day')   return format(currentDate, 'yyyy年M月d日(EEE)', { locale: zhCN })
    if (view === 'week')  return `${format(weekStart, 'M月d日', { locale: zhCN })} – ${format(weekEnd, 'M月d日', { locale: zhCN })}`
    return format(currentDate, 'yyyy年M月', { locale: zhCN })
  }, [view, currentDate, weekStart, weekEnd])

  function goBack() {
    if (view === 'day')   setCurrentDate(d => subDays(d, 1))
    if (view === 'week')  setCurrentDate(d => subWeeks(d, 1))
    if (view === 'month') setCurrentDate(d => subMonths(d, 1))
  }
  function goForward() {
    if (view === 'day')   setCurrentDate(d => addDays(d, 1))
    if (view === 'week')  setCurrentDate(d => addWeeks(d, 1))
    if (view === 'month') setCurrentDate(d => addMonths(d, 1))
  }

  const filteredStudents = useMemo(
    () => schedulingStudents.filter(s =>
      s.name.includes(searchQuery) || s.kpoint.includes(searchQuery) || s.teacherName.includes(searchQuery),
    ),
    [searchQuery],
  )

  function handleCellClick(date: string, startTime: string) {
    const [h, m] = startTime.split(':').map(Number)
    const endM = m + 90
    const endH = h + Math.floor(endM / 60)
    const rem  = endM % 60
    const endTime = `${String(endH).padStart(2,'0')}:${String(rem).padStart(2,'0')}`
    setPendingSlot({ date, startTime, endTime })
  }

  function handleConfirmSlot(title: string, start: string, end: string) {
    if (!pendingSlot) return
    const id = `local_${Date.now()}`
    addCalendarEvent({ id, date: pendingSlot.date, startTime: start, endTime: end, title, type: 'class' })
    setScheduleRecords(rs => [{
      id: `rec_${Date.now()}`,
      opType: '排课',
      title,
      date: pendingSlot.date,
      startTime: start,
      endTime: end,
      teacherName: selectedTeacher,
      createdAt: format(new Date(), 'HH:mm'),
    }, ...rs])
    setPendingSlot(null)
  }

  function handleDeleteEvent() {
    if (!actionEvent) return
    // remove from store if it's a store event
    if (storeEvents.some(e => e.id === actionEvent.id)) {
      deleteCalendarEvent(actionEvent.id)
    } else {
      // mock event: track locally
      setDeletedIds(s => new Set([...s, actionEvent.id]))
    }
    setScheduleRecords(rs => [{
      id: `rec_${Date.now()}`,
      opType: '调课',
      title: actionEvent.title,
      date: actionEvent.date,
      startTime: actionEvent.startTime,
      endTime: actionEvent.endTime,
      teacherName: selectedTeacher,
      createdAt: format(new Date(), 'HH:mm'),
    }, ...rs])
    setActionEvent(null)
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">

      {/* ── Left: Student list ── */}
      <div className="flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-white">
        {/* Header */}
        <div className="border-b border-[var(--color-border)] px-3 py-3">
          <div className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">学生列表</div>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索学生…"
              className="w-full rounded-lg border border-[var(--color-border)] py-1.5 pl-7 pr-3 text-sm outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-auto">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">无匹配学生</div>
          ) : (
            filteredStudents.map(s => (
              <StudentListItem
                key={s.id}
                student={s}
                selected={selectedStudent?.id === s.id}
                onSelect={(s) => { setSelectedStudent(s); setSelectedTeacher(s.teacherName) }}
              />
            ))
          )}
        </div>

        {/* Selected hint */}
        {selectedStudent && (
          <div className="border-t border-[var(--color-border)] bg-[var(--color-primary-light)] px-3 py-2">
            <div className="text-[11px] text-[var(--color-text-muted)]">点击日历空白处为</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--color-primary)]">{selectedStudent.name}</div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">添加课程</div>
          </div>
        )}

      </div>

      {/* ── Right: Calendar area ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Controls bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-white px-4 py-2.5">
          {/* Teacher selector */}
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: teacher.color }}
            >
              {teacher.avatar}
            </div>
            <select
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] bg-white py-1 pl-2 pr-6 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              {teacherStats.map(t => (
                <option key={t.name} value={t.name}>{t.name}（{t.role}）</option>
              ))}
            </select>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={goBack}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bg-left)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="min-w-[160px] text-center text-sm font-medium text-[var(--color-text-primary)]">{navLabel}</span>
            <button type="button" onClick={goForward}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bg-left)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Records dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRecords(v => !v)}
              className={[
                'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium transition-colors',
                showRecords
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
              ].join(' ')}
            >
              排课记录
              {scheduleRecords.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[11px] font-bold text-white">
                  {scheduleRecords.length}
                </span>
              )}
            </button>
            {showRecords && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">排课记录</span>
                  <button type="button" onClick={() => setShowRecords(false)}
                    className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">✕</button>
                </div>
                <div className="max-h-72 overflow-auto divide-y divide-[var(--color-border)]">
                  {scheduleRecords.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">暂无记录</div>
                  ) : (
                    scheduleRecords.map(r => (
                      <div key={r.id} className="px-3 py-2.5 hover:bg-[var(--color-bg-left)]">
                        <div className="flex items-center gap-1.5">
                          <span className={[
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                            r.opType === '排课'
                              ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                              : 'bg-[#eef3fb] text-[#5580b8]',
                          ].join(' ')}>{r.opType}</span>
                          <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{r.title}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                          {r.date} {r.startTime}–{r.endTime}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{r.teacherName} · {r.createdAt}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-[var(--color-bg-left)] p-0.5">
            {(['day', 'week', 'month'] as CalView[]).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={[
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  view === v
                    ? 'bg-white text-[var(--color-primary)] shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
          {view === 'week' && (
            <WeekView
              weekStart={weekStart}
              events={teacherEvs}
              teacherColor={teacher.color}
              pendingSlot={pendingSlot}
              onCellClick={handleCellClick}
              onEventClick={setActionEvent}
            />
          )}
          {view === 'day' && (
            <DayView
              date={currentDate}
              events={teacherEvs}
              teacherColor={teacher.color}
              pendingSlot={pendingSlot}
              onCellClick={handleCellClick}
              onEventClick={setActionEvent}
            />
          )}
          {view === 'month' && (
            <MonthView
              date={currentDate}
              events={teacherEvs}
              teacherColor={teacher.color}
              onDayClick={(d) => { setCurrentDate(d); setView('day') }}
            />
          )}
        </div>
      </div>

      {/* Add slot modal */}
      {pendingSlot && (
        <AddSlotModal
          date={pendingSlot.date}
          startTime={pendingSlot.startTime}
          selectedStudent={selectedStudent}
          onConfirm={handleConfirmSlot}
          onCancel={() => setPendingSlot(null)}
        />
      )}

      {/* Event action modal */}
      {actionEvent && (
        <EventActionModal
          event={actionEvent}
          teacherColor={teacher.color}
          onDelete={handleDeleteEvent}
          onCancel={() => setActionEvent(null)}
        />
      )}
    </div>
  )
}
