import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { myDiagnosisStudents, myTeachingStudents } from '../../mock/workbenchMock'
import type { ReviewItem } from '../../mock/workbenchMock'
import { GradingWorkspace } from './GradingWorkspace'
import { fetchSubmissions } from '../../api/submissions'
import type { Submission } from '../../api/submissions'

// ── config ────────────────────────────────────────────────────────────────────
const priorityCfg = {
  urgent: { label: '紧急', dot: 'bg-red-500',    badge: 'bg-red-50 text-red-600 border-red-200' },
  normal: { label: '普通', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200' },
  low:    { label: '宽松', dot: 'bg-green-400',  badge: 'bg-green-50 text-green-600 border-green-200' },
}
const typeCfg: Record<ReviewItem['reviewType'], string> = {
  '入学诊断':  'bg-[#e6f1fb] text-[#185fa5]',
  '卡点练习题': 'bg-[#e8f5e2] text-[#2d6a2d]',
  '卡点考试':  'bg-[#fff0e8] text-[#b06040]',
  '整卷批改':  'bg-[#f3e8ff] text-[#6b21a8]',
  '二阶试卷':  'bg-[#fef3c7] text-[#92400e]',
}
const PRIORITY_ORDER: ReviewItem['priority'][] = ['urgent', 'normal', 'low']
const TYPE_TABS = ['全部', '入学诊断', '卡点练习题', '卡点考试', '整卷批改', '二阶试卷'] as const

// ── reminder store (session-only) ────────────────────────────────────────────
function scheduleNotification(title: string, body: string, delayMs: number) {
  const run = () => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: undefined })
    }
  }
  if (delayMs <= 0) { run(); return }
  window.setTimeout(run, delayMs)
}

async function requestAndSchedule(item: ReviewItem, minutesBefore: number) {
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission !== 'granted') return false
  // Parse deadline "今日 HH:mm" or "明日 HH:mm"
  const match = item.deadline.match(/(\d{2}):(\d{2})/)
  if (!match) return false
  const now = new Date()
  const due = new Date(now)
  due.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0)
  if (item.deadline.startsWith('明日')) due.setDate(due.getDate() + 1)
  const fireAt = new Date(due.getTime() - minutesBefore * 60 * 1000)
  const delayMs = fireAt.getTime() - now.getTime()
  scheduleNotification(
    `📝 待批改提醒`,
    `${item.name} 的${item.reviewType}（${item.checkpoint}）将于 ${item.deadline} 截止`,
    delayMs,
  )
  return true
}

// ── ReminderPopover ───────────────────────────────────────────────────────────
function ReminderPopover({
  item,
  onClose,
}: {
  item: ReviewItem
  onClose: () => void
}) {
  const [done, setDone] = useState(false)
  const [selected, setSelected] = useState(30)
  const options = [10, 30, 60, 120]

  async function confirm() {
    const ok = await requestAndSchedule(item, selected)
    if (ok) {
      setDone(true)
      window.setTimeout(onClose, 1200)
    } else {
      alert('浏览器通知权限被拒绝，请在地址栏手动允许通知权限后重试。')
    }
  }

  return (
    <div
      className="absolute right-0 top-full z-20 mt-1 w-52 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {done ? (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          提醒已设置
        </div>
      ) : (
        <>
          <div className="mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">截止前多久提醒？</div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {options.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setSelected(v)}
                className={[
                  'rounded-lg border py-1 text-xs transition-colors',
                  selected === v
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                ].join(' ')}
              >
                {v < 60 ? `${v} 分钟` : `${v / 60} 小时`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]">
              取消
            </button>
            <button type="button" onClick={confirm}
              className="flex-1 rounded-lg bg-[var(--color-primary)] py-1 text-xs font-semibold text-white hover:opacity-80">
              确认
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── ReviewRow ─────────────────────────────────────────────────────────────────
function ReviewRow({
  item,
  onReview,
}: {
  item: ReviewItem
  onReview: (item: ReviewItem) => void
}) {
  const [showReminder, setShowReminder] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const pcfg = priorityCfg[item.priority]

  useEffect(() => {
    if (!showReminder) return
    const fn = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) setShowReminder(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showReminder])

  return (
    <div ref={rowRef} className="relative flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 hover:border-[var(--color-primary)] transition-colors">
      {/* Priority dot */}
      <div className={['mt-1.5 h-2 w-2 shrink-0 rounded-full', pcfg.dot].join(' ')} />

      {/* Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: item.color }}
      >
        {item.avatar}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.name}</span>
          <span className={['rounded-full border px-1.5 py-0.5 text-[9px] font-medium', typeCfg[item.reviewType]].join(' ')}>
            {item.reviewType}
          </span>
          <span className={['rounded-full border px-1.5 py-0.5 text-[9px] font-medium', pcfg.badge].join(' ')}>
            {pcfg.label}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{item.checkpoint}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          <span className="text-[var(--color-text-muted)]">{item.submittedAt}</span>
          <span className="text-[var(--color-text-muted)]">·</span>
          <span className={item.priority === 'urgent' ? 'font-semibold text-red-500' : 'text-[var(--color-text-secondary)]'}>
            截止 {item.deadline}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => onReview(item)}
          className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-80"
        >
          去批改
        </button>
        <button
          type="button"
          onClick={() => setShowReminder((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          提醒
        </button>
      </div>

      {/* Reminder popover */}
      {showReminder && (
        <ReminderPopover item={item} onClose={() => setShowReminder(false)} />
      )}
    </div>
  )
}

// ── submission → ReviewItem adapter ──────────────────────────────────────────
const AVATAR_COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#ec4899']
const reviewContactIdByName = Object.fromEntries(
  [...myTeachingStudents, ...myDiagnosisStudents]
    .filter((student) => student.contactId)
    .map((student) => [student.name, student.contactId]),
)

function submissionToReviewItem(s: Submission, idx: number): ReviewItem {
  const colorIdx = idx % AVATAR_COLORS.length
  return {
    id:              s.id,
    name:            s.student_name,
    avatar:          s.student_name.slice(-1),
    color:           AVATAR_COLORS[colorIdx],
    contactId:       reviewContactIdByName[s.student_name] ?? '',
    reviewType:      s.review_type,
    checkpoint:      s.checkpoint,
    deadline:        s.deadline,
    priority:        s.priority,
    submittedAt:     s.submitted_at,
    submittedNormal: s.submitted_normal === 1,
  }
}

// ── ReviewModal ───────────────────────────────────────────────────────────────
export function ReviewModal() {
  const openTaskKey    = useWorkbenchStore((s) => s.openTaskKey)
  const close          = useWorkbenchStore((s) => s.closeTaskModal)

  const [activeTab, setActiveTab]   = useState<typeof TYPE_TABS[number]>('全部')
  const [sortBy, setSortBy]         = useState<'priority' | 'time'>('priority')
  const [gradingItem, setGradingItem] = useState<ReviewItem | null>(null)
  const [items, setItems]           = useState<ReviewItem[]>([])
  const [loading, setLoading]       = useState(false)

  // Load from API whenever modal opens
  useEffect(() => {
    if (openTaskKey !== 'pendingReview') return
    setLoading(true)
    fetchSubmissions()
      .then((list) => setItems(list.map(submissionToReviewItem)))
      .catch(() => {/* keep empty list */})
      .finally(() => setLoading(false))
  }, [openTaskKey])

  if (openTaskKey !== 'pendingReview') return null

  const filtered = items.filter(
    (it) => activeTab === '全部' || it.reviewType === activeTab,
  )
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    return a.submittedAt.localeCompare(b.submittedAt)
  })

  const counts = {
    urgent: items.filter((i) => i.priority === 'urgent').length,
    normal: items.filter((i) => i.priority === 'normal').length,
    low:    items.filter((i) => i.priority === 'low').length,
  }

  function handleReview(item: ReviewItem) {
    setGradingItem(item)
  }

  return (
    <>
    {gradingItem && (
      <GradingWorkspace item={gradingItem} onBack={() => setGradingItem(null)} />
    )}
    {createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative flex w-[min(760px,90vw)] max-h-[82vh] flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">待批改</div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />紧急 {counts.urgent}</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block" />普通 {counts.normal}</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />宽松 {counts.low}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <button
              type="button"
              onClick={() => setSortBy((s) => s === 'priority' ? 'time' : 'priority')}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {sortBy === 'priority' ? '按优先级' : '按提交时间'}
            </button>
            <button type="button" onClick={close}
              className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]">
              ✕
            </button>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] px-4 pt-2 pb-0">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={[
                'px-3 py-1.5 text-xs border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {tab}
              {tab !== '全部' && (
                <span className="ml-1 text-[9px] text-[var(--color-text-muted)]">
                  {items.filter((i) => i.reviewType === tab).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">加载中…</div>
          ) : sorted.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">暂无待批改</div>
          ) : (
            sorted.map((item) => (
              <ReviewRow key={item.id} item={item} onReview={handleReview} />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )}
    </>
  )
}
