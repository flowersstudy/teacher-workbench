import { addDays, addMonths, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkbenchStore } from '../../store/workbenchStore'
import type { CalEvent } from '../../types'

// ── LeaveRecord ───────────────────────────────────────────────────────────────
interface LeaveRecord {
  id: string
  startDate: string          // yyyy-MM-dd
  endDate: string            // yyyy-MM-dd
  reason: string
  needReschedule: boolean
  rescheduleEventIds: string[]
}

function isOnLeave(dateStr: string, leaves: LeaveRecord[]): boolean {
  return leaves.some((lv) => dateStr >= lv.startDate && dateStr <= lv.endDate)
}

// ── reminder helpers ──────────────────────────────────────────────────────────
async function scheduleReminder(ev: CalEvent, minutesBefore: number): Promise<number | null> {
  if (Notification.permission === 'default') await Notification.requestPermission()
  if (Notification.permission !== 'granted') return null

  const [h, m] = ev.startTime.split(':').map(Number)
  const fire = new Date(ev.date)
  fire.setHours(h, m - minutesBefore, 0, 0)
  const delay = fire.getTime() - Date.now()

  const tid = window.setTimeout(() => {
    new Notification('📅 日程提醒', {
      body: `「${ev.title}」将在 ${minutesBefore} 分钟后开始（${ev.startTime}）`,
    })
  }, Math.max(delay, 0))
  return tid
}

type ViewMode = 'month' | 'week' | 'day'

const HOUR_START = 0
const HOUR_END   = 24
const HOUR_H     = 64
const DAY_NAMES  = ['日', '一', '二', '三', '四', '五', '六']
const hours      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

const typeStyle: Record<CalEvent['type'], { bg: string; text: string; bar: string }> = {
  class:   { bg: '#fff0e8', text: '#b06040', bar: '#e8845a' },
  meeting: { bg: '#e6f1fb', text: '#185fa5', bar: '#4a90d9' },
}

function parseMin(t: string) {
  const [h, m = '0'] = t.split(':')
  return +h * 60 + +m
}

// ── EventFormModal ────────────────────────────────────────────────────────────
const REMINDER_OPTIONS = [
  { label: '不提醒', value: 0 },
  { label: '5 分钟前', value: 5 },
  { label: '15 分钟前', value: 15 },
  { label: '30 分钟前', value: 30 },
  { label: '1 小时前', value: 60 },
  { label: '2 小时前', value: 120 },
]

function EventFormModal({
  mode,
  initial,
  defaultDate,
  existingReminder,
  onClose,
  onSetReminder,
}: {
  mode: 'create' | 'edit'
  initial?: CalEvent
  defaultDate?: string
  existingReminder?: number
  onClose: () => void
  onSetReminder: (evId: string, minutes: number, timerId: number | null) => void
}) {
  const addCalendarEvent    = useWorkbenchStore((s) => s.addCalendarEvent)
  const updateCalendarEvent = useWorkbenchStore((s) => s.updateCalendarEvent)
  const deleteCalendarEvent = useWorkbenchStore((s) => s.deleteCalendarEvent)

  const [title,     setTitle]     = useState(initial?.title ?? '')
  const [date,      setDate]      = useState(initial?.date ?? defaultDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00')
  const [endTime,   setEndTime]   = useState(initial?.endTime ?? '10:00')
  const [type,      setType]      = useState<CalEvent['type']>(initial?.type ?? 'class')
  const [confirmDel, setConfirmDel] = useState(false)
  const [reminderMin, setReminderMin] = useState(existingReminder ?? 0)

  async function submit() {
    if (!title.trim() || !date || !startTime || !endTime) return
    const ev: CalEvent = {
      id: initial?.id ?? `ev_${Date.now()}`,
      title: title.trim(), date, startTime, endTime, type,
    }
    if (mode === 'edit') updateCalendarEvent(ev)
    else addCalendarEvent(ev)

    if (reminderMin > 0) {
      const tid = await scheduleReminder(ev, reminderMin)
      if (tid === null) alert('请在浏览器地址栏允许通知权限，才能收到提醒。')
      onSetReminder(ev.id, reminderMin, tid)
    } else {
      onSetReminder(ev.id, 0, null)
    }
    onClose()
  }

  function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    deleteCalendarEvent(initial!.id)
    onSetReminder(initial!.id, 0, null)
    onClose()
  }

  const inputCls = 'w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-80 rounded-[var(--radius-card)] bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {mode === 'edit' ? '编辑日程' : '新增日程'}
          </div>
          <button type="button" onClick={onClose}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]">✕</button>
        </div>

        <div className="space-y-3 p-4">
          {initial?.link && (
            <a
              href={initial.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-[#e8f4ff] px-3 py-2 text-xs font-semibold text-[#1677FF] hover:bg-[#d0eaff] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              进入课堂
            </a>
          )}
          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">标题</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入日程标题…" className={inputCls} />
          </div>
          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">类型</div>
            <div className="flex gap-2">
              {(['class', 'meeting'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={['flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors',
                    type === t
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                  ].join(' ')}>
                  {t === 'class' ? '课程' : '会议'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">日期</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="mb-1 text-xs text-[var(--color-text-secondary)]">开始时间</div>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-xs text-[var(--color-text-secondary)]">结束时间</div>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              提醒
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {REMINDER_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => setReminderMin(opt.value)}
                  className={['rounded-lg border py-1 text-[11px] transition-colors',
                    reminderMin === opt.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                  ].join(' ')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-3">
          {mode === 'edit' && (
            <button type="button" onClick={handleDelete}
              className={['rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                confirmDel
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'border border-red-200 text-red-500 hover:bg-red-50',
              ].join(' ')}>
              {confirmDel ? '确认删除' : '删除'}
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]">
            取消
          </button>
          <button type="button" onClick={() => void submit()} disabled={!title.trim()}
            className={['rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors',
              title.trim()
                ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
                : 'cursor-not-allowed bg-gray-100 text-gray-400',
            ].join(' ')}>
            {mode === 'edit' ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── LeaveFormModal ────────────────────────────────────────────────────────────
function LeaveFormModal({
  events,
  onSubmit,
  onClose,
}: {
  events: CalEvent[]
  onSubmit: (leave: LeaveRecord) => void
  onClose: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [startDate, setStartDate] = useState(today)
  const [endDate,   setEndDate]   = useState(today)
  const [reason,    setReason]    = useState('')
  const [needReschedule, setNeedReschedule] = useState(false)
  const [rescheduleIds,  setRescheduleIds]  = useState<string[]>([])

  const affectedEvents = events.filter(
    (e) => e.type === 'class' && e.date >= startDate && e.date <= endDate,
  )

  function toggleId(id: string) {
    setRescheduleIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  // reset reschedule selection when date range changes
  useEffect(() => { setRescheduleIds([]) }, [startDate, endDate])

  function handleSubmit() {
    onSubmit({
      id: `lv_${Date.now()}`,
      startDate,
      endDate: endDate >= startDate ? endDate : startDate,
      reason: reason.trim(),
      needReschedule,
      rescheduleEventIds: needReschedule ? rescheduleIds : [],
    })
    onClose()
  }

  const canSubmit = reason.trim().length > 0 && endDate >= startDate

  const inputCls = 'w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[360px] rounded-[var(--radius-card)] bg-white shadow-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8845a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">申请请假</span>
          </div>
          <button type="button" onClick={onClose}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]">✕</button>
        </div>

        <div className="space-y-4 p-4">
          {/* Date range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="mb-1 text-xs text-[var(--color-text-secondary)]">请假开始</div>
              <input type="date" value={startDate} min={today}
                onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
                className={inputCls} />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-xs text-[var(--color-text-secondary)]">请假结束</div>
              <input type="date" value={endDate} min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls} />
            </div>
          </div>

          {/* Reason */}
          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">请假原因</div>
            <textarea
              rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="请填写请假原因…"
              className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          {/* 需要调课 toggle */}
          <button type="button" onClick={() => setNeedReschedule((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2.5 transition-colors hover:border-[var(--color-primary)]">
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-secondary)]">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
              <span className="text-xs font-medium text-[var(--color-text-primary)]">需要调课</span>
            </div>
            <div className={['h-5 w-9 rounded-full transition-colors relative', needReschedule ? 'bg-[var(--color-primary)]' : 'bg-gray-200'].join(' ')}>
              <span className={['absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', needReschedule ? 'translate-x-4' : 'translate-x-0.5'].join(' ')} />
            </div>
          </button>

          {/* 受影响的课程 */}
          {needReschedule && (
            <div>
              <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                请假期间的课程
                <span className="ml-1 font-normal text-[var(--color-text-muted)]">（勾选需要调课的课程）</span>
              </div>
              {affectedEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border)] py-3 text-center text-[11px] text-[var(--color-text-muted)]">
                  该时段内暂无课程日程
                </div>
              ) : (
                <div className="space-y-1.5">
                  {affectedEvents.map((ev) => {
                    const checked = rescheduleIds.includes(ev.id)
                    return (
                      <button key={ev.id} type="button" onClick={() => toggleId(ev.id)}
                        className={['flex items-center gap-2.5 w-full rounded-lg border px-3 py-2 text-left transition-colors',
                          checked
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
                        ].join(' ')}>
                        <div className={['flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-gray-300',
                        ].join(' ')}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-[var(--color-text-primary)]">{ev.title}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)]">{ev.date} · {ev.startTime}–{ev.endTime}</div>
                        </div>
                        {checked && (
                          <span className="shrink-0 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-500">待调课</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
          <button type="button" onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]">
            取消
          </button>
          <button type="button" disabled={!canSubmit} onClick={handleSubmit}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity">
            确认提交
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── ViewToggle ────────────────────────────────────────────────────────────────
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex overflow-hidden rounded-full border border-[var(--color-border)]">
      {(['month', 'week', 'day'] as const).map((k, i, arr) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className={['px-3 py-1 text-xs font-semibold',
            value === k ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]',
            i < arr.length - 1 ? 'border-r border-[var(--color-border)]' : '',
          ].join(' ')}>
          {k === 'month' ? '月' : k === 'week' ? '周' : '日'}
        </button>
      ))}
    </div>
  )
}

// ── EventBlock（时间轴用）────────────────────────────────────────────────────
function EventBlock({ ev, hasReminder, onEdit }: { ev: CalEvent; hasReminder: boolean; onEdit: (ev: CalEvent) => void }) {
  const s      = typeStyle[ev.type]
  const top    = ((parseMin(ev.startTime) - HOUR_START * 60) / 60) * HOUR_H
  const height = Math.max(((parseMin(ev.endTime) - parseMin(ev.startTime)) / 60) * HOUR_H, 24)
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onEdit(ev) }}
      style={{ top, height, left: 3, right: 3, position: 'absolute', background: s.bg, borderLeftColor: s.bar }}
      className="z-10 cursor-pointer overflow-hidden rounded border-l-[3px] px-1.5 py-0.5 hover:brightness-95 transition-[filter]"
    >
      <div className="flex items-center gap-1">
        <span className="truncate text-[11px] font-semibold leading-tight" style={{ color: s.text }}>{ev.title}</span>
        {hasReminder && <span className="shrink-0 text-[10px]">🔔</span>}
        {ev.link && <span className="shrink-0 text-[10px]">🔗</span>}
      </div>
      {height > 32 && (
        <div className="text-[10px] leading-tight opacity-70" style={{ color: s.text }}>{ev.startTime}–{ev.endTime}</div>
      )}
      {height > 48 && ev.link && (
        <a
          href={ev.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 block truncate text-[10px] font-medium underline"
          style={{ color: s.text }}
        >
          进入课堂
        </a>
      )}
    </div>
  )
}

// ── TimeGrid ──────────────────────────────────────────────────────────────────
function TimeGrid({ days, hideHeader, events, reminders, leaves, onEdit, onSlotClick }: {
  days: Date[]
  hideHeader?: boolean
  events: CalEvent[]
  reminders: Map<string, number>
  leaves: LeaveRecord[]
  onEdit: (ev: CalEvent) => void
  onSlotClick?: (date: string, hour: number) => void
}) {
  const today    = new Date()
  const totalH   = (HOUR_END - HOUR_START) * HOUR_H
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 8 * HOUR_H
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
      {!hideHeader && (
        <div className="flex shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg-left)]">
          <div className="w-12 shrink-0" />
          {days.map((day) => {
            const isToday  = isSameDay(day, today)
            const dayKey   = format(day, 'yyyy-MM-dd')
            const onLeave  = isOnLeave(dayKey, leaves)
            return (
              <div key={dayKey} className="flex flex-1 flex-col items-center py-2">
                <span className={['text-[11px] font-medium', onLeave ? 'text-gray-400' : isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'].join(' ')}>
                  {DAY_NAMES[day.getDay()]}
                </span>
                <div className="flex items-center gap-1">
                  <span className={['mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    onLeave ? 'bg-gray-100 text-gray-400' : isToday ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-primary)]'].join(' ')}>
                    {format(day, 'd')}
                  </span>
                  {onLeave && (
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-400">请假</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex" style={{ height: totalH }}>
          <div className="relative w-12 shrink-0 border-r border-[var(--color-border)]">
            {hours.map((h) => (
              <div key={h} style={{ top: (h - HOUR_START) * HOUR_H - 7 }}
                className="absolute right-1.5 text-[10px] text-[var(--color-text-muted)]">{h}:00</div>
            ))}
          </div>
          {days.map((day) => {
            const dayKey  = format(day, 'yyyy-MM-dd')
            const evs     = events.filter((e) => e.date === dayKey)
            const onLeave = isOnLeave(dayKey, leaves)
            return (
              <div key={dayKey} className="relative flex-1 border-l border-[var(--color-border)]" style={{ minWidth: 0 }}>
                {hours.map((h) => (
                  <div key={h} style={{ top: (h - HOUR_START) * HOUR_H, height: HOUR_H }}
                    className={['absolute inset-x-0 border-t border-[var(--color-border)]', onLeave ? 'cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-[var(--color-primary-light)]/30'].join(' ')}
                    onClick={() => !onLeave && onSlotClick?.(dayKey, h)}
                  />
                ))}
                {evs.map((ev) => <EventBlock key={ev.id} ev={ev} hasReminder={reminders.has(ev.id)} onEdit={onEdit} />)}
                {/* Leave overlay */}
                {onLeave && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-gray-100/60">
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-500 shadow-sm">请假中</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── EventPill（月视图）───────────────────────────────────────────────────────
function EventPill({ ev, hasReminder, onEdit }: { ev: CalEvent; hasReminder: boolean; onEdit: (ev: CalEvent) => void }) {
  const s = typeStyle[ev.type]
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onEdit(ev) }}
      className="flex min-w-0 cursor-pointer items-center gap-1 truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold hover:brightness-95 transition-[filter]"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="shrink-0 opacity-70">{ev.startTime}</span>
      <span className="truncate">{ev.title}</span>
      {hasReminder && <span className="shrink-0">🔔</span>}
    </div>
  )
}

// ── MonthView ─────────────────────────────────────────────────────────────────
function MonthView({ cursorMonth, events, reminders, leaves, onExpandDay, onEdit, onSlotClick, onCancelLeave }: {
  cursorMonth: Date
  events: CalEvent[]
  reminders: Map<string, number>
  leaves: LeaveRecord[]
  onExpandDay: (d: Date) => void
  onEdit: (ev: CalEvent) => void
  onSlotClick: (date: string) => void
  onCancelLeave: (leaveId: string) => void
}) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const today = new Date()
  const start = startOfWeek(startOfMonth(cursorMonth), { weekStartsOn: 0 })
  const grid  = Array.from({ length: 42 }, (_, i) => addDays(start, i))

  function toggle(day: Date) { setSelectedDay((p) => (p && isSameDay(p, day) ? null : day)) }

  return (
    <div className="flex h-full gap-2 overflow-hidden">
      <div className={['flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] transition-all', selectedDay ? 'flex-[3]' : 'flex-1'].join(' ')}>
        <div className="grid shrink-0 grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-bg-left)] text-[10px] font-semibold text-[var(--color-text-secondary)]">
          {DAY_NAMES.map((w) => <div key={w} className="px-2 py-2">{w}</div>)}
        </div>
        <div className="grid flex-1 grid-cols-7 overflow-hidden">
          {grid.map((day) => {
            const inMonth = isSameMonth(day, cursorMonth)
            const isToday = isSameDay(day, today)
            const isSel   = selectedDay !== null && isSameDay(day, selectedDay)
            const dayKey  = format(day, 'yyyy-MM-dd')
            const evs     = events.filter((e) => e.date === dayKey)
            const shown   = evs.slice(0, 2)
            const hidden  = evs.length - shown.length
            const onLeave = isOnLeave(dayKey, leaves)
            const leaveRecord = leaves.find((lv) => dayKey >= lv.startDate && dayKey <= lv.endDate)
            return (
              <div key={dayKey}
                className={['min-h-0 border-r border-b border-[var(--color-border)] p-1 relative',
                  onLeave ? 'bg-gray-50' : '',
                  isToday && !onLeave ? 'outline outline-1 outline-[var(--color-primary)] outline-offset-[-1px]' : '',
                  isSel ? 'bg-[var(--color-primary-light)]' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => toggle(day)}
                    className={['flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                      onLeave ? 'text-gray-400'
                        : isToday ? 'bg-[var(--color-primary)] text-white'
                        : isSel ? 'text-[var(--color-primary)]'
                        : inMonth ? 'text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)]'
                        : 'text-[var(--color-text-muted)]',
                    ].join(' ')}>
                    {format(day, 'd')}
                  </button>
                  {/* 请假 badge — only show on startDate of each leave */}
                  {leaveRecord && leaveRecord.startDate === dayKey && (
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); onCancelLeave(leaveRecord.id) }}
                      title="点击取消请假"
                      className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                      请假
                    </button>
                  )}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {!onLeave && shown.map((ev) => <EventPill key={ev.id} ev={ev} hasReminder={reminders.has(ev.id)} onEdit={onEdit} />)}
                  {!onLeave && hidden > 0 && (
                    <button type="button" onClick={() => toggle(day)}
                      className="text-[10px] font-semibold text-[var(--color-primary)] hover:underline">
                      +{hidden} 更多
                    </button>
                  )}
                  {!onLeave && evs.length === 0 && (
                    <div className="h-4 cursor-pointer rounded hover:bg-[var(--color-primary-light)]"
                      onClick={() => onSlotClick(dayKey)} />
                  )}
                  {onLeave && evs.length > 0 && (
                    <div className="space-y-0.5 opacity-40 pointer-events-none">
                      {shown.map((ev) => <EventPill key={ev.id} ev={ev} hasReminder={false} onEdit={() => {}} />)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2">
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                {format(selectedDay, 'M月d日', { locale: zhCN })}
                <span className="ml-1 font-normal text-[var(--color-text-secondary)]">{DAY_NAMES[selectedDay.getDay()]}</span>
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                {events.filter((e) => e.date === format(selectedDay, 'yyyy-MM-dd')).length} 个日程
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onExpandDay(selectedDay)}
                className="text-[10px] font-semibold text-[var(--color-primary)] hover:underline">完整视图</button>
              <button type="button" onClick={() => setSelectedDay(null)}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">✕</button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <TimeGrid days={[selectedDay]} hideHeader events={events} reminders={reminders} leaves={leaves} onEdit={onEdit} onSlotClick={() => onSlotClick(`${format(selectedDay, 'yyyy-MM-dd')}`)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── CalendarView ──────────────────────────────────────────────────────────────
export function CalendarView() {
  const events = useWorkbenchStore((s) => s.calendarEvents)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [cursor, setCursor]     = useState(() => new Date())
  const [formState, setFormState] = useState<
    | null
    | { mode: 'create'; defaultDate: string }
    | { mode: 'edit'; event: CalEvent }
  >(null)
  const [reminders, setReminders] = useState<Map<string, number>>(new Map())
  const timerMap = useRef<Map<string, number>>(new Map())
  const [showReminderList, setShowReminderList] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // ── 请假 state ──
  const [leaves, setLeaves]           = useState<LeaveRecord[]>([])
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  useEffect(() => {
    if (!showReminderList) return
    const fn = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowReminderList(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showReminderList])

  function handleSetReminder(evId: string, minutes: number, timerId: number | null) {
    const prev = timerMap.current.get(evId)
    if (prev !== undefined) window.clearTimeout(prev)
    if (minutes > 0 && timerId !== null) {
      timerMap.current.set(evId, timerId)
      setReminders((m) => { const n = new Map(m); n.set(evId, minutes); return n })
    } else {
      timerMap.current.delete(evId)
      setReminders((m) => { const n = new Map(m); n.delete(evId); return n })
    }
  }

  function cancelReminder(evId: string) {
    const prev = timerMap.current.get(evId)
    if (prev !== undefined) window.clearTimeout(prev)
    timerMap.current.delete(evId)
    setReminders((m) => { const n = new Map(m); n.delete(evId); return n })
  }

  function handleAddLeave(leave: LeaveRecord) {
    setLeaves((p) => [...p, leave])
  }

  function handleCancelLeave(leaveId: string) {
    setLeaves((p) => p.filter((lv) => lv.id !== leaveId))
  }

  const reminderList = [...reminders.entries()].map(([evId, mins]) => ({
    event: events.find((e) => e.id === evId),
    mins,
    evId,
  })).filter((r) => r.event !== undefined) as { event: CalEvent; mins: number; evId: string }[]

  const MINS_LABEL: Record<number, string> = { 5: '5分钟前', 15: '15分钟前', 30: '30分钟前', 60: '1小时前', 120: '2小时前' }

  const cursorMonth = startOfMonth(cursor)
  const weekStart   = startOfWeek(cursor, { weekStartsOn: 0 })
  const weekDays    = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function goPrev() {
    if (viewMode === 'month') setCursor((d) => subMonths(d, 1))
    else if (viewMode === 'week') setCursor((d) => addDays(d, -7))
    else setCursor((d) => addDays(d, -1))
  }
  function goNext() {
    if (viewMode === 'month') setCursor((d) => addMonths(d, 1))
    else if (viewMode === 'week') setCursor((d) => addDays(d, 7))
    else setCursor((d) => addDays(d, 1))
  }
  function getTitle() {
    if (viewMode === 'month') return format(cursorMonth, 'yyyy年M月', { locale: zhCN })
    if (viewMode === 'week') return `${format(weekStart, 'M月d日')} – ${format(addDays(weekStart, 6), 'M月d日')}`
    return format(cursor, 'yyyy年M月d日 EEEE', { locale: zhCN })
  }

  function openEdit(ev: CalEvent) { setFormState({ mode: 'edit', event: ev }) }
  function openCreate(date: string) {
    if (isOnLeave(date, leaves)) return   // 请假中，禁止新增
    setFormState({ mode: 'create', defaultDate: date })
  }

  // active leave badge count
  const today = format(new Date(), 'yyyy-MM-dd')
  const activeLeaves = leaves.filter((lv) => lv.endDate >= today)

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <button type="button" onClick={goPrev}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]">‹</button>
          <div className="min-w-[160px] text-center text-sm font-semibold text-[var(--color-text-primary)]">{getTitle()}</div>
          <button type="button" onClick={goNext}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]">›</button>
          <button type="button" onClick={() => setCursor(new Date())}
            className="ml-1 rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]">今天</button>
        </div>
        <div className="flex items-center gap-2">
          {/* Reminder list bell */}
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setShowReminderList((v) => !v)}
              className={[
                'relative flex h-7 w-7 items-center justify-center rounded-lg border transition-colors',
                showReminderList
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
              ].join(' ')}
              title="提醒列表"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {reminderList.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[9px] font-bold text-white">
                  {reminderList.length}
                </span>
              )}
            </button>

            {showReminderList && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    提醒列表
                    {reminderList.length > 0 && (
                      <span className="ml-1.5 rounded-full bg-[var(--color-primary-light)] px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">
                        {reminderList.length}
                      </span>
                    )}
                  </span>
                  {reminderList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { reminderList.forEach((r) => cancelReminder(r.evId)) }}
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                    >
                      全部取消
                    </button>
                  )}
                </div>

                {reminderList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">暂无已设置的提醒</div>
                ) : (
                  <div className="max-h-72 overflow-auto divide-y divide-[var(--color-border)]">
                    {reminderList
                      .sort((a, b) => (a.event.date + a.event.startTime).localeCompare(b.event.date + b.event.startTime))
                      .map(({ event: ev, mins, evId }) => {
                        const typeS = typeStyle[ev.type]
                        return (
                          <div key={evId} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-left)]">
                            <div className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: typeS.bar }} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{ev.title}</div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                                <span>{ev.date}</span>
                                <span>·</span>
                                <span>{ev.startTime}</span>
                                <span>·</span>
                                <span className="text-[var(--color-primary)]">🔔 {MINS_LABEL[mins] ?? `${mins}分钟前`}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => cancelReminder(evId)}
                              className="shrink-0 rounded p-1 text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 transition-colors"
                              title="取消提醒"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 申请请假 */}
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
            className={[
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              activeLeaves.length > 0
                ? 'border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
            ].join(' ')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            申请请假
            {activeLeaves.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-400 text-[9px] text-white">
                {activeLeaves.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => openCreate(format(cursor, 'yyyy-MM-dd'))}
            className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            + 新增日程
          </button>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-hidden">
        {viewMode === 'month' && (
          <MonthView cursorMonth={cursorMonth} events={events} reminders={reminders} leaves={leaves}
            onExpandDay={(day) => { setCursor(day); setViewMode('day') }}
            onEdit={openEdit}
            onSlotClick={openCreate}
            onCancelLeave={handleCancelLeave}
          />
        )}
        {viewMode === 'week' && (
          <TimeGrid days={weekDays} events={events} reminders={reminders} leaves={leaves} onEdit={openEdit}
            onSlotClick={(date) => openCreate(date)} />
        )}
        {viewMode === 'day' && (
          <TimeGrid days={[cursor]} events={events} reminders={reminders} leaves={leaves} onEdit={openEdit}
            onSlotClick={(date) => openCreate(date)} />
        )}
      </div>

      {formState?.mode === 'edit' && (
        <EventFormModal mode="edit" initial={formState.event}
          existingReminder={reminders.get(formState.event.id)}
          onClose={() => setFormState(null)}
          onSetReminder={handleSetReminder} />
      )}
      {formState?.mode === 'create' && (
        <EventFormModal mode="create" defaultDate={formState.defaultDate}
          onClose={() => setFormState(null)}
          onSetReminder={handleSetReminder} />
      )}
      {showLeaveModal && (
        <LeaveFormModal
          events={events}
          onSubmit={handleAddLeave}
          onClose={() => setShowLeaveModal(false)}
        />
      )}
    </div>
  )
}
