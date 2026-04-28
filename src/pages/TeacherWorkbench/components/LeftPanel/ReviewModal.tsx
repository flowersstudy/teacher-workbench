import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { GradingWorkspace } from './GradingWorkspace'
import { fetchSubmissions } from '../../api/submissions'
import type { ReviewItem, Submission } from '../../api/submissions'

const priorityCfg = {
  urgent: { label: '紧急', dot: 'bg-red-500', badge: 'bg-red-50 text-red-600 border-red-200' },
  normal: { label: '普通', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-600 border-orange-200' },
  low: { label: '宽松', dot: 'bg-green-400', badge: 'bg-green-50 text-green-600 border-green-200' },
} as const

const PRIORITY_ORDER: ReviewItem['priority'][] = ['urgent', 'normal', 'low']

const STAGE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'diagnose', label: '诊断' },
  { key: 'theory', label: '理论' },
  { key: 'training', label: '实训' },
  { key: 'exam', label: '测试' },
  { key: 'drill', label: '刷题' },
] as const

type StageTabKey = typeof STAGE_TABS[number]['key']

function getStageLabel(stageKey: string): string {
  if (stageKey === 'report') return '完成'
  const match = STAGE_TABS.find((tab) => tab.key === stageKey)
  return match ? match.label : '未分类'
}

function getReviewTypeClass(reviewType: string): string {
  switch (reviewType) {
    case '入学诊断':
      return 'bg-[#e6f1fb] text-[#185fa5]'
    case '卡点练习题':
      return 'bg-[#e8f5e2] text-[#2d6a2d]'
    case '卡点考试':
      return 'bg-[#fff0e8] text-[#b06040]'
    case '整卷批改':
      return 'bg-[#f3e8ff] text-[#6b21a8]'
    case '二阶试卷':
      return 'bg-[#fef3c7] text-[#92400e]'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function scheduleNotification(title: string, body: string, delayMs: number) {
  const run = () => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }

  if (delayMs <= 0) {
    run()
    return
  }

  window.setTimeout(run, delayMs)
}

async function requestAndSchedule(item: ReviewItem, minutesBefore: number) {
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission !== 'granted') return false

  const match = item.deadline.match(/(\d{2}):(\d{2})/)
  if (!match) return false

  const now = new Date()
  const due = new Date(now)
  due.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0)
  if (item.deadline.startsWith('明日')) due.setDate(due.getDate() + 1)

  const fireAt = new Date(due.getTime() - minutesBefore * 60 * 1000)
  scheduleNotification(
    '📝 待批改提醒',
    `${item.name} 的 ${item.reviewType}（${item.pointName || item.checkpoint}）将于 ${item.deadline} 截止`,
    fireAt.getTime() - now.getTime(),
  )

  return true
}

function ReminderPopover({ item, onClose }: { item: ReviewItem; onClose: () => void }) {
  const [done, setDone] = useState(false)
  const [selected, setSelected] = useState(30)
  const options = [10, 30, 60, 120]

  async function confirm() {
    const ok = await requestAndSchedule(item, selected)
    if (ok) {
      setDone(true)
      window.setTimeout(onClose, 1200)
      return
    }
    alert('浏览器通知权限未开启，请先允许通知后再试。')
  }

  return (
    <div
      className="absolute right-0 top-full z-20 mt-1 w-52 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 shadow-lg"
      onClick={(e) => e.stopPropagation()}
    >
      {done ? (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          提醒已设置
        </div>
      ) : (
        <>
          <div className="mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">截止前多久提醒？</div>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {options.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                className={[
                  'rounded-lg border py-1 text-xs transition-colors',
                  selected === value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] font-semibold text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                ].join(' ')}
              >
                {value < 60 ? `${value} 分钟` : `${value / 60} 小时`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirm}
              className="flex-1 rounded-lg bg-[var(--color-primary)] py-1 text-xs font-semibold text-white hover:opacity-80"
            >
              确认
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ReviewRow({ item, onReview }: { item: ReviewItem; onReview: (item: ReviewItem) => void }) {
  const [showReminder, setShowReminder] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)
  const priority = priorityCfg[item.priority]

  useEffect(() => {
    if (!showReminder) return
    const fn = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setShowReminder(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showReminder])

  return (
    <div
      ref={rowRef}
      className="relative flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 transition-colors hover:border-[var(--color-primary)]"
    >
      <div className={['mt-1.5 h-2 w-2 shrink-0 rounded-full', priority.dot].join(' ')} />

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: item.color }}
      >
        {item.avatar}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.name}</span>
          <span className={['rounded-full border px-1.5 py-0.5 text-[9px] font-medium', getReviewTypeClass(item.reviewType)].join(' ')}>
            {item.reviewType}
          </span>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700">
            {getStageLabel(item.stageKey)}
          </span>
          <span className={['rounded-full border px-1.5 py-0.5 text-[9px] font-medium', priority.badge].join(' ')}>
            {priority.label}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
          {item.pointName || item.checkpoint || '未命名卡点'}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          <span className="text-[var(--color-text-muted)]">{item.submittedAt}</span>
          <span className="text-[var(--color-text-muted)]">·</span>
          <span className={item.priority === 'urgent' ? 'font-semibold text-red-500' : 'text-[var(--color-text-secondary)]'}>
            截止 {item.deadline || '--'}
          </span>
        </div>
      </div>

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
          onClick={() => setShowReminder((value) => !value)}
          className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          提醒
        </button>
      </div>

      {showReminder && <ReminderPopover item={item} onClose={() => setShowReminder(false)} />}
    </div>
  )
}

const AVATAR_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899']

function submissionToReviewItem(s: Submission, idx: number, reviewContactIdByName: Record<string, string>): ReviewItem {
  const colorIdx = idx % AVATAR_COLORS.length
  return {
    id: s.id,
    name: s.student_name,
    avatar: s.student_name.slice(-1),
    color: AVATAR_COLORS[colorIdx],
    contactId: reviewContactIdByName[s.student_name] ?? '',
    fileName: s.file_name,
    reviewType: s.review_type,
    checkpoint: s.checkpoint,
    pointName: s.point_name,
    stageKey: String(s.stage_key || '').trim() || 'diagnose',
    taskId: s.task_id,
    deadline: s.deadline,
    priority: s.priority,
    submittedAt: s.submitted_at,
    submittedNormal: s.submitted_normal === 1,
  }
}

export function ReviewModal() {
  const openTaskKey = useWorkbenchStore((s) => s.openTaskKey)
  const close = useWorkbenchStore((s) => s.closeTaskModal)
  const students = useWorkbenchStore((s) => s.students)
  const chatContacts = useWorkbenchStore((s) => s.chatContacts)

  const [activeTab, setActiveTab] = useState<StageTabKey>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'time'>('priority')
  const [gradingItem, setGradingItem] = useState<ReviewItem | null>(null)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(false)

  const reviewContactIdByName = useMemo(
    () =>
      students.reduce<Record<string, string>>((acc, student) => {
        const contactId = chatContacts.find((contact) => contact.studentId === student.id)?.id
        if (contactId) {
          acc[student.name] = contactId
        }
        return acc
      }, {}),
    [chatContacts, students],
  )

  useEffect(() => {
    if (openTaskKey !== 'pendingReview') return
    setLoading(true)
    fetchSubmissions()
      .then((list) => setItems(list.map((submission, index) => submissionToReviewItem(submission, index, reviewContactIdByName))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [openTaskKey, reviewContactIdByName])

  if (openTaskKey !== 'pendingReview') return null

  const filtered = items.filter((item) => activeTab === 'all' || item.stageKey === activeTab)
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
    }
    return a.submittedAt.localeCompare(b.submittedAt)
  })

  const counts = {
    urgent: items.filter((item) => item.priority === 'urgent').length,
    normal: items.filter((item) => item.priority === 'normal').length,
    low: items.filter((item) => item.priority === 'low').length,
  }

  function handleReview(item: ReviewItem) {
    setGradingItem(item)
  }

  return (
    <>
      {gradingItem && <GradingWorkspace item={gradingItem} onBack={() => setGradingItem(null)} />}
      {createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={close}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative flex w-[min(760px,90vw)] max-h-[82vh] flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-[var(--color-text-primary)]">待批改</div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                    紧急 {counts.urgent}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
                    普通 {counts.normal}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                    宽松 {counts.low}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSortBy((value) => (value === 'priority' ? 'time' : 'priority'))}
                  className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {sortBy === 'priority' ? '按优先级' : '按提交时间'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex gap-1 border-b border-[var(--color-border)] px-4 pt-2 pb-0">
              {STAGE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'px-3 py-1.5 text-xs border-b-2 transition-colors',
                    activeTab === tab.key
                      ? 'border-[var(--color-primary)] font-semibold text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1 text-[9px] text-[var(--color-text-muted)]">
                      {items.filter((item) => item.stageKey === tab.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-2 overflow-auto p-3">
              {loading ? (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">加载中...</div>
              ) : sorted.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">暂无待批改</div>
              ) : (
                sorted.map((item) => <ReviewRow key={item.id} item={item} onReview={handleReview} />)
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
