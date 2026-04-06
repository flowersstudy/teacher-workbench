import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { checkpointContents, studentDetails } from '../../mock/workbenchMock'
import type { StudentItem, Handout, Replay, QuestionAnswer, QuestionType, KnowledgePoint } from '../../mock/workbenchMock'
import { teacher } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { ComplaintModal } from '../LeftPanel/ComplaintModal'
import type { ComplaintRecord } from '../../types'

// ── style helpers ─────────────────────────────────────────────────────────────
const roleAvatarColor: Record<string, string> = {
  带教老师: '#e8845a',
  诊断老师: '#4a90d9',
  学管:     '#4caf74',
  校长:     '#9c6fcc',
}

const statusCfg = {
  mastered: { label: '已掌握', bar: 'bg-green-400',  text: 'text-green-600' },
  learning: { label: '学习中', bar: 'bg-[var(--color-primary)]', text: 'text-[var(--color-primary)]' },
  weak:     { label: '待强化', bar: 'bg-red-400',    text: 'text-red-500' },
}

const questionTypeCfg: Record<QuestionType, { cls: string }> = {
  '入学诊断':  { cls: 'bg-purple-100 text-purple-700' },
  '卡点练习题': { cls: 'bg-blue-100 text-blue-700' },
  '卡点考试':  { cls: 'bg-orange-100 text-orange-700' },
  '整卷批改':  { cls: 'bg-green-100 text-green-700' },
}

// ── sub-components ────────────────────────────────────────────────────────────
function ProgressBar({ progress, status }: { progress: number; status: 'mastered' | 'learning' | 'weak' }) {
  const cfg = statusCfg[status]
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={['h-full rounded-full transition-all', cfg.bar].join(' ')} style={{ width: `${progress}%` }} />
      </div>
      <span className="w-7 text-right text-[10px] text-[var(--color-text-muted)]">{progress}%</span>
    </div>
  )
}

function KnowledgePointRow({ kp }: { kp: KnowledgePoint }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = statusCfg[kp.status]
  const hasAssignments = (kp.assignments?.length ?? 0) > 0

  // Compute avg score & accuracy from assignments
  const avgScore    = hasAssignments
    ? Math.round(kp.assignments!.reduce((s, a) => s + a.score, 0) / kp.assignments!.length)
    : null
  const avgAccuracy = hasAssignments
    ? Math.round(kp.assignments!.reduce((s, a) => s + a.accuracy, 0) / kp.assignments!.length)
    : null

  return (
    <div>
      {/* Header row — clickable if has assignments */}
      <div
        className={['flex items-center justify-between', hasAssignments ? 'cursor-pointer' : ''].join(' ')}
        onClick={() => hasAssignments && setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-text-primary)]">{kp.name}</span>
          {hasAssignments && (
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={['text-[var(--color-text-muted)] transition-transform', expanded ? 'rotate-180' : ''].join(' ')}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          {avgScore !== null && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              均分 <span className="font-semibold text-[var(--color-text-primary)]">{avgScore}</span>
              <span className="ml-1.5">正确率 <span className="font-semibold text-[var(--color-text-primary)]">{avgAccuracy}%</span></span>
            </span>
          )}
          <span className={['text-[10px] font-medium', cfg.text].join(' ')}>{cfg.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-1">
        <ProgressBar progress={kp.progress} status={kp.status} />
      </div>

      {/* Expanded assignments */}
      {expanded && hasAssignments && (
        <div className="mt-2 space-y-1 rounded-lg bg-[var(--color-bg-left)] px-2.5 py-2">
          <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto] gap-x-3 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <span>作业名称</span>
            <span className="text-right">得分</span>
            <span className="text-right">正确率</span>
            <span className="text-right">日期</span>
          </div>
          {kp.assignments!.map((a, i) => {
            const scoreColor = a.score >= 80 ? 'text-green-600' : a.score >= 60 ? 'text-[var(--color-primary)]' : 'text-red-500'
            const accColor   = a.accuracy >= 80 ? 'text-green-600' : a.accuracy >= 60 ? 'text-[var(--color-primary)]' : 'text-red-500'
            return (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center border-t border-[var(--color-border)] pt-1">
                <span className="truncate text-[10px] text-[var(--color-text-primary)]">{a.title}</span>
                <span className={['text-right text-[11px] font-semibold tabular-nums', scoreColor].join(' ')}>{a.score}分</span>
                <span className={['text-right text-[11px] font-semibold tabular-nums', accColor].join(' ')}>{a.accuracy}%</span>
                <span className="text-right text-[10px] text-[var(--color-text-muted)] tabular-nums">{a.date.slice(5)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="12" height="12" viewBox="0 0 24 24"
          fill={n <= rating ? '#f59e0b' : 'none'}
          stroke={n <= rating ? '#f59e0b' : '#d1d5db'}
          strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  )
}

function fileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const color = ext === 'pdf' ? 'text-red-400' : ext === 'docx' || ext === 'doc' ? 'text-blue-400' : ext === 'pptx' || ext === 'ppt' ? 'text-orange-400' : 'text-gray-400'
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${color} shrink-0`}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

// ── AnswerCard ────────────────────────────────────────────────────────────────
function AnswerCard({
  answer,
  onReview,
}: {
  answer: QuestionAnswer
  onReview: (id: string, score: number, comment: string) => void
}) {
  const [open, setOpen]       = useState(false)
  const [score, setScore]     = useState(answer.score?.toString() ?? '')
  const [comment, setComment] = useState(answer.teacherComment ?? '')

  const isReviewed = answer.status === 'reviewed'
  const typeCfg    = questionTypeCfg[answer.questionType]

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={['rounded-full px-2 py-0.5 text-[9px] font-medium shrink-0', typeCfg.cls].join(' ')}>
              {answer.questionType}
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{answer.questionTitle}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {format(new Date(answer.submittedAt), 'MM-dd HH:mm')} 提交
            </span>
            {isReviewed ? (
              <span className="text-[10px] text-green-600 font-medium">✓ 已批改 · {answer.score}分</span>
            ) : (
              <span className="text-[10px] text-orange-500 font-medium">⏳ 待批改</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        >
          {open ? '收起' : '查看'}
        </button>
      </div>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2.5 space-y-3">
          {/* Student answer */}
          <div>
            <div className="mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">学生作答</div>
            <div className="whitespace-pre-wrap rounded-lg bg-white border border-[var(--color-border)] px-3 py-2 text-xs leading-relaxed text-[var(--color-text-primary)]">
              {answer.studentAnswer}
            </div>
          </div>

          {/* Existing teacher comment */}
          {isReviewed && answer.teacherComment && !open && null}
          {isReviewed && answer.teacherComment && (
            <div>
              <div className="mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                老师批语 · {answer.reviewedAt ? format(new Date(answer.reviewedAt), 'MM-dd HH:mm') : ''}
              </div>
              <div className="rounded-lg bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 px-3 py-2 text-xs leading-relaxed text-[var(--color-text-primary)]">
                {answer.teacherComment}
              </div>
            </div>
          )}

          {/* Mark form */}
          {!isReviewed && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-[var(--color-text-secondary)]">批改</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="分数(0-100)"
                  className="w-28 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">分</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="批语（可留空直接给分）"
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!score}
                  onClick={() => {
                    const s = parseInt(score, 10)
                    if (isNaN(s) || s < 0 || s > 100) return
                    onReview(answer.id, s, comment)
                    setOpen(false)
                  }}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-40"
                >
                  提交批改
                </button>
              </div>
            </div>
          )}

          {/* Re-review option for already reviewed */}
          {isReviewed && (
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-[var(--color-text-secondary)]">修改批语</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-28 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">分</span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!score}
                  onClick={() => {
                    const s = parseInt(score, 10)
                    if (isNaN(s)) return
                    onReview(answer.id, s, comment)
                    setOpen(false)
                  }}
                  className="rounded-lg border border-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:opacity-40"
                >
                  更新
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── StudentDetailView ─────────────────────────────────────────────────────────
export function StudentDetailView({
  student,
  onBack,
  onTeacherClick,
  onGoToChat,
}: {
  student: StudentItem
  onBack: () => void
  onTeacherClick: (name: string) => void
  onGoToChat?: (contactId: string) => void
}) {
  const [activeTab, setActiveTab]   = useState<'info' | 'content'>('info')
  const [courseTab, setCourseTab]   = useState<'diagnosis' | 'checkpoint'>('checkpoint')

  // ── 诊断课当前步骤 ──
  const [currentDiagStep, setCurrentDiagStep] = useState(1)

  // ── 学习路径可编辑内容 ──
  const [diagLimits, setDiagLimits] = useState<Record<number, string>>({})
  const [editingStep, setEditingStep] = useState<{ tab: 'diag'; num: number } | null>(null)
  const [stepDraft,   setStepDraft]   = useState('')
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())

  // ── 卡点课进度管理 ──
  type CpStepStatus = 'normal' | 'delayed' | 'urgent' | 'pending'
  type CpStep = { label: string; status: CpStepStatus }
  const [customCpSteps, setCustomCpSteps] = useState<CpStep[] | null>(null)
  const [isManagingCp, setIsManagingCp]   = useState(false)
  const [managedSteps, setManagedSteps]   = useState<CpStep[]>([])

  useEffect(() => {
    setDiagLimits({})
    setEditingStep(null)
    setExpandedDays(new Set())
    setCustomCpSteps(null)
    setIsManagingCp(false)
  }, [student.id])

  // ── 编辑弹窗 state ──
  const [editingDay, setEditingDay] = useState<{ day: number; stepName: string; isPractice: boolean } | null>(null)
  const [draftAssignedIds, setDraftAssignedIds] = useState<string[]>([])
  const [draftNote, setDraftNote] = useState('')

  const studentPracticeAssignments   = useWorkbenchStore((s) => s.studentPracticeAssignments)
  const setStudentPracticeAssignment = useWorkbenchStore((s) => s.setStudentPracticeAssignment)
  const studentDayNotes              = useWorkbenchStore((s) => s.studentDayNotes)
  const setStudentDayNote            = useWorkbenchStore((s) => s.setStudentDayNote)

  const notesMap        = useWorkbenchStore((s) => s.notesMap)
  const loadNotes       = useWorkbenchStore((s) => s.loadNotes)
  const openNotes       = useWorkbenchStore((s) => s.openNotes)
  const studentInfoMap    = useWorkbenchStore((s) => s.studentInfoMap)
  const loadStudentInfo   = useWorkbenchStore((s) => s.loadStudentInfo)
  const addStudentInfo    = useWorkbenchStore((s) => s.addStudentInfo)
  const deleteStudentInfo = useWorkbenchStore((s) => s.deleteStudentInfo)
  const flaggedMap        = useWorkbenchStore((s) => s.flaggedMap)
  const setStudentFlag    = useWorkbenchStore((s) => s.setStudentFlag)
  const loadStudentFlag   = useWorkbenchStore((s) => s.loadStudentFlag)
  const complaintsMap     = useWorkbenchStore((s) => s.complaintsMap)
  const resolveComplaint  = useWorkbenchStore((s) => s.resolveComplaint)

  useEffect(() => {
    if (student.contactId) void loadNotes(student.contactId)
  }, [student.contactId, loadNotes])

  useEffect(() => {
    void loadStudentInfo(student.id)
    void loadStudentFlag(student.id)
  }, [student.id, loadStudentInfo, loadStudentFlag])

  const isFlagged = flaggedMap[student.id] ?? false

  const detail = studentDetails[student.id]

  const [localHandouts, setLocalHandouts] = useState<Handout[]>([])
  const [localReplays, setLocalReplays]   = useState<Replay[]>([])
  const [replayInput, setReplayInput]     = useState('')
  const [showReplayInput, setShowReplayInput] = useState(false)
  const [localAnswers, setLocalAnswers]   = useState<QuestionAnswer[]>(detail?.answers ?? [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allHandouts = [...(detail?.handouts ?? []), ...localHandouts]
  const allReplays  = [...(detail?.replays ?? []), ...localReplays]
  const feedbacks   = detail?.feedbacks ?? []

  // ── 相关信息 form state ──
  const [showInfoForm, setShowInfoForm]   = useState(false)
  const [infoDraft, setInfoDraft]         = useState('')
  const [infoRole, setInfoRole]           = useState('带教老师')
  const [infoAuthor, setInfoAuthor]       = useState('李老师')
  const [infoSaving, setInfoSaving]       = useState(false)

  // ── 投诉 modal state ──
  const [showComplaintModal, setShowComplaintModal] = useState(false)

  async function handleAddInfo() {
    const text = infoDraft.trim()
    if (!text) return
    setInfoSaving(true)
    await addStudentInfo(student.id, infoAuthor.trim() || '匿名', infoRole, text)
    setInfoDraft('')
    setShowInfoForm(false)
    setInfoSaving(false)
  }

  const INFO_ROLES = ['带教老师', '诊断老师', '学管', '校长', '销售', '其他']
  const INFO_ROLE_STYLE: Record<string, string> = {
    带教老师: 'bg-[#fff0e8] text-[#b06040]',
    诊断老师: 'bg-[#e6f1fb] text-[#185fa5]',
    学管:     'bg-[#e8f5e2] text-[#2d6a2d]',
    校长:     'bg-[#f3e8ff] text-[#6b21a8]',
    销售:     'bg-[#fef9c3] text-[#854d0e]',
    其他:     'bg-[var(--color-bg-left)] text-[var(--color-text-muted)]',
    投诉:     'bg-red-50 text-red-600',
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const today = new Date().toISOString().slice(0, 10)
    const newHandouts: Handout[] = files.map((f, i) => ({
      id: `local-${Date.now()}-${i}`,
      fileName: f.name,
      uploadedBy: teacher.name,
      role: '带教老师',
      date: today,
      sessionLabel: detail?.currentChapter ?? '最新课',
    }))
    setLocalHandouts((prev) => [...prev, ...newHandouts])
    e.target.value = ''
  }

  function handleAddReplay() {
    const url = replayInput.trim()
    if (!url) return
    const today = new Date().toISOString().slice(0, 10)
    setLocalReplays((prev) => [...prev, {
      id: `lr-${Date.now()}`,
      sessionLabel: detail?.currentChapter ?? '最新课',
      date: today,
      url,
    }])
    setReplayInput('')
    setShowReplayInput(false)
  }

  function handleReview(answerId: string, score: number, comment: string) {
    setLocalAnswers((prev) => prev.map((a) =>
      a.id === answerId
        ? { ...a, status: 'reviewed' as const, score, teacherComment: comment, reviewedAt: new Date().toISOString() }
        : a,
    ))
  }

  const pendingCount = localAnswers.filter((a) => a.status === 'pending').length

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          返回
        </button>
        <button
          type="button"
          title={student.contactId ? '进入对话框' : undefined}
          disabled={!student.contactId || !onGoToChat}
          onClick={() => student.contactId && onGoToChat?.(student.contactId)}
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white transition-opacity',
            student.contactId && onGoToChat ? 'cursor-pointer hover:opacity-80 ring-2 ring-offset-1 ring-transparent hover:ring-[var(--color-primary)]' : 'cursor-default',
          ].join(' ')}
          style={{ backgroundColor: student.color }}
        >
          {student.avatar}
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{student.name}</div>
            {isFlagged && (
              <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500 ring-1 ring-red-200">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                重点关注
              </span>
            )}
            {student.contactId && onGoToChat && (
              <span className="text-[10px] text-[var(--color-text-muted)]">点击头像进入对话</span>
            )}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">{student.grade} · {student.subject}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px border-b border-[var(--color-border)] bg-[var(--color-border)] shrink-0">
        {[
          { label: '入学日期', value: detail?.joinDate ?? '-' },
          { label: '累计课次', value: detail ? `${detail.sessionCount} 节` : '-' },
          { label: '累计学时', value: detail ? `${detail.totalHours} 小时` : '-' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center bg-white py-3">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.value}</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-[var(--color-border)]">
        {(['info', 'content'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={[
              'flex-1 py-2 text-xs font-medium transition-colors',
              activeTab === t
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            ].join(' ')}
          >
            {t === 'info' ? '学习档案' : '学习内容'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">

        {/* ── 学习内容 tab ── */}
        {activeTab === 'content' && (() => {
          const cp = checkpointContents.find((c) => c.name === student.subject)
          const assignedIds = cp ? (studentPracticeAssignments[student.id]?.[cp.id] ?? []) : []
          const path = cp?.standardPath ?? []
          const dayMatch = detail?.currentChapter.match(/DAY(\d)/)
          const currentDay = dayMatch ? parseInt(dayMatch[1], 10) : null

          function toggleQ(qId: string) {
            if (!cp) return
            const next = assignedIds.includes(qId)
              ? assignedIds.filter((id) => id !== qId)
              : [...assignedIds, qId]
            setStudentPracticeAssignment(student.id, cp.id, next)
          }

          if (!cp || !path.length) return (
            <div className="p-4 text-xs text-[var(--color-text-muted)]">该卡点暂无内容配置</div>
          )

          const statusMap = {
            normal:  { label: '已正常完成', labelCls: 'text-green-600',  headerCls: 'bg-green-50 border-green-200',  bodyBorder: 'border-green-200' },
            delayed: { label: '延期完成',   labelCls: 'text-orange-500', headerCls: 'bg-orange-50 border-orange-200', bodyBorder: 'border-orange-200' },
            urgent:  { label: '急需完成',   labelCls: 'text-[var(--color-primary)]', headerCls: 'bg-[var(--color-primary-light)] border-[var(--color-primary)]', bodyBorder: 'border-[var(--color-primary)]' },
            pending: { label: '待完成',     labelCls: 'text-[var(--color-text-muted)]', headerCls: 'bg-white border-[var(--color-border)]', bodyBorder: 'border-[var(--color-border)]' },
          }

          // 第一个刷题 DAY 的 index，用来决定在哪里渲染题目列表
          const firstPracticeDay = path.findIndex((s) => s.includes('刷题')) + 1

          return (
            <>
            <div className="space-y-2 p-4">

              {/* ── 学习目标 ── */}
              {cp.learningObjectives.length > 0 && (
                <div className="border border-[var(--color-border)]">
                  <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2">
                    <span className="text-sm font-semibold text-[var(--color-text-secondary)]">本阶段学习目标</span>
                    <span className="ml-2 text-xs text-[var(--color-text-muted)]">{cp.learningObjectives.length} 项</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {cp.learningObjectives.map((obj, idx) => (
                      <div key={idx} className="flex gap-2.5 px-3 py-2.5">
                        <span className="mt-0.5 w-5 shrink-0 text-xs font-bold tabular-nums text-[var(--color-text-muted)]">{idx + 1}</span>
                        <span className="text-sm leading-snug text-[var(--color-text-primary)]">{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {path.map((step, i) => {
                const day = i + 1
                const stepName = step.replace(/^DAY\d+\s*/, '')
                // 拆分主任务和附加任务（如"刷题+背诵规范词" → ['刷题', '背诵规范词']）
                const parts = stepName.split('+').map((s) => s.trim())
                const mainTask = parts[0]
                const extraTasks = parts.slice(1)

                const overrideStatus = detail?.dayStatuses?.[day]
                const status: 'normal' | 'delayed' | 'urgent' | 'pending' =
                  overrideStatus ?? (currentDay == null ? 'pending' : day < currentDay ? 'normal' : day === currentDay ? 'urgent' : 'pending')
                const sm = statusMap[status]

                const is1v1     = mainTask.includes('共识课') || mainTask.includes('纠偏课')
                const isTheory  = mainTask.includes('理论')
                const isPractice = mainTask.includes('刷题')
                const isExam    = mainTask.includes('考试')

                return (
                  <div key={day} className={['border', sm.headerCls].join(' ')}>
                    {/* 行头 */}
                    <div className={['flex items-center justify-between border-b px-3 py-2', sm.bodyBorder].join(' ')}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tabular-nums text-[var(--color-text-secondary)]">DAY{day}</span>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{mainTask}</span>
                        {extraTasks.map((t) => (
                          <span key={t} className="rounded bg-[var(--color-bg-left)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={['text-xs font-medium', sm.labelCls].join(' ')}>{sm.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDay({ day, stepName, isPractice })
                            setDraftAssignedIds(assignedIds)
                            setDraftNote(studentDayNotes[student.id]?.[day] ?? '')
                          }}
                          className="rounded border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          编辑
                        </button>
                      </div>
                    </div>

                    {/* 行内容 */}
                    <div className="px-3 py-2.5 space-y-1.5">

                      {/* 1V1 课 */}
                      {is1v1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--color-text-secondary)]">腾讯会议录播</span>
                          <span className="text-xs text-[var(--color-text-muted)]">待上传</span>
                        </div>
                      )}

                      {/* 理论录播课 */}
                      {isTheory && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">理论课视频</span>
                            <span className={['text-xs', cp.theoryVideoId ? 'text-green-600' : 'text-[var(--color-text-muted)]'].join(' ')}>
                              {cp.theoryVideoId ? '已上传' : '待上传'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">课程讲义</span>
                            <span className={['text-xs', cp.theoryHandoutPdf ? 'text-green-600' : 'text-[var(--color-text-muted)]'].join(' ')}>
                              {cp.theoryHandoutPdf ? '已上传' : '待上传'}
                            </span>
                          </div>
                        </>
                      )}

                      {/* 刷题 */}
                      {isPractice && day === firstPracticeDay && (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">分配题目（适用 DAY{firstPracticeDay}–DAY{firstPracticeDay + 2}）</span>
                            <span className="text-xs text-[var(--color-primary)]">{assignedIds.length}/{cp.practiceQuestions.length} 已分配</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-left)]">
                            <div
                              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                              style={{ width: cp.practiceQuestions.length ? `${(assignedIds.length / cp.practiceQuestions.length) * 100}%` : '0%' }}
                            />
                          </div>
                          <div className="mt-1 space-y-1">
                            {cp.practiceQuestions.map((q, idx) => {
                              const assigned = assignedIds.includes(q.id)
                              const typeCls = q.selectionType === 'default' ? 'text-[var(--color-primary)]'
                                            : q.selectionType === 'weak'    ? 'text-orange-500'
                                                                             : 'text-[var(--color-text-muted)]'
                              const typeLabel = q.selectionType === 'default' ? '默认' : q.selectionType === 'weak' ? '补弱' : '手动'
                              return (
                                <label
                                  key={q.id}
                                  className={[
                                    'flex cursor-pointer items-center gap-2 border px-2.5 py-1.5 transition-colors',
                                    assigned ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-left)]',
                                  ].join(' ')}
                                >
                                  <span className="w-5 shrink-0 text-center text-xs text-[var(--color-text-muted)]">{idx + 1}</span>
                                  <span className={['w-8 shrink-0 text-xs font-medium', typeCls].join(' ')}>{typeLabel}</span>
                                  <span className={['min-w-0 flex-1 text-xs', assigned ? 'font-medium text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                                    {q.title}
                                  </span>
                                  <div className={['flex h-4 w-4 shrink-0 items-center justify-center border transition-colors', assigned ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'].join(' ')}>
                                    {assigned && (
                                      <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                        <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                  <input type="checkbox" className="sr-only" checked={assigned} onChange={() => toggleQ(q.id)} />
                                </label>
                              )
                            })}
                          </div>
                        </>
                      )}
                      {isPractice && day !== firstPracticeDay && (
                        <span className="text-xs text-[var(--color-text-muted)]">同 DAY{firstPracticeDay} 题目继续练习</span>
                      )}

                      {/* 考试 */}
                      {isExam && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">考题</span>
                            <span className={['text-xs', cp.examTitle ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'].join(' ')}>
                              {cp.examTitle ?? '待填充'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">考试讲义</span>
                            <span className={['text-xs', cp.examHandoutPdf ? 'text-green-600' : 'text-[var(--color-text-muted)]'].join(' ')}>
                              {cp.examHandoutPdf ? '已上传' : '待上传'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">解析视频</span>
                            <span className={['text-xs', cp.examVideoId ? 'text-green-600' : 'text-[var(--color-text-muted)]'].join(' ')}>
                              {cp.examVideoId ? '已上传' : '待上传'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-secondary)]">解析讲义</span>
                            <span className={['text-xs', cp.examAnalysisPdf ? 'text-green-600' : 'text-[var(--color-text-muted)]'].join(' ')}>
                              {cp.examAnalysisPdf ? '已上传' : '待上传'}
                            </span>
                          </div>
                        </>
                      )}

                      {/* 已保存的备注 */}
                      {studentDayNotes[student.id]?.[day] && (
                        <div className="mt-1 border-t border-[var(--color-border)] pt-1.5 text-xs text-[var(--color-text-secondary)]">
                          <span className="font-medium text-[var(--color-text-muted)]">备注：</span>
                          {studentDayNotes[student.id][day]}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── 编辑弹窗 ── */}
            {editingDay && (() => {
              const { day, stepName, isPractice } = editingDay
              const dayNote = draftNote

              function confirmEdit() {
                if (isPractice && cp) {
                  setStudentPracticeAssignment(student.id, cp.id, draftAssignedIds)
                }
                if (dayNote.trim() !== (studentDayNotes[student.id]?.[day] ?? '')) {
                  setStudentDayNote(student.id, day, dayNote.trim())
                }
                setEditingDay(null)
              }

              return (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center"
                  onClick={() => setEditingDay(null)}
                >
                  <div className="absolute inset-0 bg-black/40" />
                  <div
                    className="relative w-[480px] max-h-[80vh] flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* 弹窗头 */}
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">修改学习任务</div>
                        <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">DAY{day} · {stepName}</div>
                      </div>
                      <button type="button" onClick={() => setEditingDay(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)] transition-colors">✕</button>
                    </div>

                    <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
                      {/* 练习题勾选（仅刷题类型） */}
                      {isPractice && cp && (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">分配练习题</span>
                            <span className="text-[10px] text-[var(--color-primary)]">{draftAssignedIds.length}/{cp.practiceQuestions.length} 已选</span>
                          </div>
                          <div className="space-y-1">
                            {cp.practiceQuestions.map((q, idx) => {
                              const checked = draftAssignedIds.includes(q.id)
                              const typeCls = q.selectionType === 'default' ? 'text-[var(--color-primary)]'
                                            : q.selectionType === 'weak'    ? 'text-orange-500'
                                                                             : 'text-[var(--color-text-muted)]'
                              const typeLabel = q.selectionType === 'default' ? '默认' : q.selectionType === 'weak' ? '补弱' : '手动'
                              return (
                                <label key={q.id} className={['flex cursor-pointer items-center gap-2 border px-2.5 py-1.5 transition-colors',
                                  checked ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-left)]'].join(' ')}>
                                  <span className="w-5 shrink-0 text-center text-[10px] text-[var(--color-text-muted)]">{idx + 1}</span>
                                  <span className={['w-8 shrink-0 text-[10px] font-medium', typeCls].join(' ')}>{typeLabel}</span>
                                  <span className={['min-w-0 flex-1 text-[11px]', checked ? 'font-medium text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>{q.title}</span>
                                  <div className={['flex h-4 w-4 shrink-0 items-center justify-center border transition-colors',
                                    checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white'].join(' ')}>
                                    {checked && <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                  </div>
                                  <input type="checkbox" className="sr-only" checked={checked}
                                    onChange={() => setDraftAssignedIds((prev) => prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id])} />
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* 自定义备注 */}
                      <div>
                        <div className="mb-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">备注 / 自定义说明</div>
                        <textarea
                          rows={3}
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          placeholder="为该学生添加这一天的个性化说明或注意事项…"
                          className="w-full resize-none rounded border border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    {/* 弹窗底部 */}
                    <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
                      <button type="button" onClick={() => setEditingDay(null)}
                        className="rounded border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)] transition-colors">
                        取消
                      </button>
                      <button type="button" onClick={confirmEdit}
                        className="rounded bg-[var(--color-primary)] px-5 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                        确认修改
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
            </>
          )
        })()}

        {/* ── 学习档案 tab ── */}
        {activeTab === 'info' && (
        <div className="space-y-4 p-4">

          {/* ── 请假信息 ── */}
          {detail?.leaveInfo && (() => {
            const lv = detail.leaveInfo!
            const rows: { label: string; value: string }[] = [
              { label: '请假开始', value: lv.startDate },
              { label: '请假结束', value: lv.endDate },
              { label: '请假原因', value: lv.reason },
              ...(lv.resumeDate ? [{ label: '预计复课', value: lv.resumeDate }] : []),
            ]
            return (
              <div className="border border-orange-200 bg-orange-50">
                <div className="flex items-center gap-2 border-b border-orange-200 px-3 py-2">
                  <span className="text-xs font-semibold text-orange-700">请假中</span>
                  <span className="text-[10px] text-orange-500">{lv.startDate} — {lv.endDate}</span>
                </div>
                <div className="divide-y divide-orange-100">
                  {rows.map((r) => (
                    <div key={r.label} className="flex gap-3 px-3 py-2">
                      <span className="w-16 shrink-0 text-[11px] text-orange-400">{r.label}</span>
                      <span className="flex-1 text-[11px] text-orange-800">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── 学习进度 ── */}
          {(() => {
            // ── Tab bar ──
            const tabBar = (
              <div className="mb-2 flex items-center justify-between">
                <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
                  {(['checkpoint', 'diagnosis'] as const).map((t) => (
                    <button key={t} type="button"
                      onClick={() => setCourseTab(t)}
                      className={[
                        'px-3 py-1 text-xs font-medium transition-colors',
                        courseTab === t
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]',
                      ].join(' ')}>
                      {t === 'checkpoint' ? '卡点课' : '诊断课'}
                    </button>
                  ))}
                </div>
                <span className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[9px] text-green-600">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                  同步自学生端
                </span>
              </div>
            )

            // ── 卡点课（原有逻辑）──
            if (courseTab === 'checkpoint') {
              if (!detail) return null
              const cpForPath = checkpointContents.find((c) => c.name === student.subject)
              const basePath = cpForPath?.standardPath ?? []
              const dayMatch = detail.currentChapter.match(/DAY(\d)/)
              const currentDay = dayMatch ? parseInt(dayMatch[1], 10) : null
              if (!basePath.length || currentDay === null) return null

              // 有效步骤列表：自定义 or 标准
              const effectiveSteps: CpStep[] = customCpSteps ?? basePath.map((s, i) => {
                const day = i + 1
                const label = s.replace(/^DAY\d+\s*/, '')
                const overrideStatus = detail.dayStatuses?.[day]
                const status: CpStepStatus = overrideStatus ?? (day < currentDay ? 'normal' : day === currentDay ? 'urgent' : 'pending')
                return { label, status }
              })

              const statusCfgMap: Record<CpStepStatus, { badge: React.ReactNode; circle: string; label: string }> = {
                normal:  { badge: <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] text-green-600">已正常完成</span>,  circle: 'bg-green-500',                    label: '已正常完成' },
                delayed: { badge: <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] text-orange-500">延期完成</span>,   circle: 'bg-orange-500',                   label: '延期完成'   },
                urgent:  { badge: <span className="rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 text-[10px] text-[var(--color-primary)]">急需完成</span>, circle: 'bg-[var(--color-primary)]', label: '急需完成' },
                pending: { badge: <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">待完成</span>,            circle: 'bg-[var(--color-text-muted)]',    label: '待完成'     },
              }

              // ── 管理进度模式 ──
              if (isManagingCp) {
                const STATUS_OPTIONS: CpStepStatus[] = ['normal', 'delayed', 'urgent', 'pending']
                const statusPillCls: Record<CpStepStatus, string> = {
                  normal:  'border-green-300 bg-green-50 text-green-700',
                  delayed: 'border-orange-300 bg-orange-50 text-orange-600',
                  urgent:  'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',
                  pending: 'border-gray-200 bg-gray-50 text-gray-500',
                }
                return (
                  <div>
                    {tabBar}
                    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                      {/* 管理头 */}
                      <div className="flex items-center justify-between bg-[var(--color-bg-left)] px-4 py-2.5 border-b border-[var(--color-border)]">
                        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">管理课程进度</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">共 {managedSteps.length} 步</span>
                      </div>
                      {/* 步骤列表 */}
                      <div className="divide-y divide-[var(--color-border)]">
                        {managedSteps.map((ms, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-left)] text-[10px] font-bold text-[var(--color-text-muted)]">{i + 1}</span>
                            <input
                              type="text" value={ms.label}
                              onChange={(e) => setManagedSteps((p) => p.map((s, j) => j === i ? { ...s, label: e.target.value } : s))}
                              className="flex-1 rounded border border-[var(--color-border)] px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
                            />
                            {/* 状态选择 */}
                            <div className="flex gap-1">
                              {STATUS_OPTIONS.map((st) => (
                                <button key={st} type="button"
                                  onClick={() => setManagedSteps((p) => p.map((s, j) => j === i ? { ...s, status: st } : s))}
                                  className={['rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                                    ms.status === st ? statusPillCls[st] : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]',
                                  ].join(' ')}>
                                  {statusCfgMap[st].label}
                                </button>
                              ))}
                            </div>
                            {/* 删除 */}
                            <button type="button"
                              onClick={() => setManagedSteps((p) => p.filter((_, j) => j !== i))}
                              disabled={managedSteps.length <= 1}
                              className="shrink-0 rounded p-1 text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* 添加步骤 */}
                      <button type="button"
                        onClick={() => setManagedSteps((p) => [...p, { label: '新步骤', status: 'pending' }])}
                        className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-[var(--color-border)] py-2.5 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        添加步骤
                      </button>
                    </div>
                    {/* 操作按钮 */}
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button"
                        onClick={() => setIsManagingCp(false)}
                        className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)] transition-colors">
                        取消
                      </button>
                      <button type="button"
                        onClick={() => { setCustomCpSteps(managedSteps); setIsManagingCp(false) }}
                        className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                        保存
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div>
                  {tabBar}
                  <div className="space-y-0 overflow-hidden rounded-xl border border-[var(--color-border)]">
                    {effectiveSteps.map((es, i) => {
                      const day = i + 1
                      const { badge, circle } = statusCfgMap[es.status]
                      const dayLabel = `DAY${day}`
                      const matchingHandouts = allHandouts.filter((h) =>
                        h.sessionLabel.includes(dayLabel) || es.label.toLowerCase().split(' ').some((w) => w.length > 1 && h.sessionLabel.includes(w))
                      )
                      const matchingReplays = allReplays.filter((r) =>
                        r.sessionLabel.includes(dayLabel) || es.label.toLowerCase().split(' ').some((w) => w.length > 1 && r.sessionLabel.includes(w))
                      )
                      const isExpanded = expandedDays.has(day)
                      const typeStyle: Record<string, string> = {
                        '入学诊断':   'bg-purple-50 text-purple-600 border-purple-200',
                        '卡点练习题': 'bg-blue-50 text-blue-600 border-blue-200',
                        '卡点考试':   'bg-orange-50 text-orange-600 border-orange-200',
                        '整卷批改':   'bg-green-50 text-green-600 border-green-200',
                      }
                      return (
                        <div key={day} className={['px-4 py-3', i !== effectiveSteps.length - 1 ? 'border-b border-[var(--color-border)]' : ''].join(' ')}>
                          <div className="flex items-start gap-3">
                            <div className={['flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white mt-0.5', circle].join(' ')}>
                              {day}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{es.label}</span>
                                {badge}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedDays((s) => { const n = new Set(s); n.has(day) ? n.delete(day) : n.add(day); return n })}
                              className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-left)]"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                className={['transition-transform', isExpanded ? 'rotate-180' : ''].join(' ')}>
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                            </button>
                          </div>

                          {/* 展开区域：讲义 / 回放 / 作答 */}
                          {isExpanded && (
                            <div className="ml-9 mt-2.5 space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-3">
                              {/* 课程讲义 */}
                              <div>
                                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  课程讲义
                                </div>
                                {matchingHandouts.length === 0 ? (
                                  <div className="text-xs text-[var(--color-text-muted)]">暂无讲义</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {matchingHandouts.map((h) => (
                                      <div key={h.id} className="flex items-center gap-2 text-xs">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-primary)]">
                                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                        </svg>
                                        <span className="flex-1 truncate text-[var(--color-text-primary)]">{h.fileName}</span>
                                        <span className="shrink-0 text-[var(--color-text-muted)]">{h.date.slice(5)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 学习回放 */}
                              <div>
                                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                                  </svg>
                                  学习回放
                                </div>
                                {matchingReplays.length === 0 ? (
                                  <div className="text-xs text-[var(--color-text-muted)]">暂无回放</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {matchingReplays.map((r) => (
                                      <div key={r.id} className="flex items-center gap-2 text-xs">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-primary)]">
                                          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                                        </svg>
                                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-[var(--color-primary)] hover:underline">
                                          {r.sessionLabel}
                                        </a>
                                        {r.duration && <span className="shrink-0 text-[var(--color-text-muted)]">{r.duration}</span>}
                                        <span className="shrink-0 text-[var(--color-text-muted)]">{r.date.slice(5)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 题目作答 */}
                              <div>
                                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                                  </svg>
                                  题目作答
                                </div>
                                {localAnswers.length === 0 ? (
                                  <div className="text-xs text-[var(--color-text-muted)]">暂无作答记录</div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {localAnswers.map((ans) => {
                                      const isReviewed = ans.status === 'reviewed'
                                      const scoreColor = !isReviewed ? '' : (ans.score ?? 0) >= 80 ? 'text-green-600' : (ans.score ?? 0) >= 60 ? 'text-[var(--color-primary)]' : 'text-red-500'
                                      return (
                                        <div key={ans.id} className="flex items-center gap-2 text-xs">
                                          <span className={['shrink-0 rounded-full border px-1.5 py-0.5 text-[11px]', typeStyle[ans.questionType] ?? 'bg-gray-50 text-gray-500 border-gray-200'].join(' ')}>
                                            {ans.questionType}
                                          </span>
                                          <span className="flex-1 truncate text-[var(--color-text-primary)]">{ans.questionTitle}</span>
                                          {isReviewed && ans.score !== undefined ? (
                                            <span className={['shrink-0 font-semibold tabular-nums', scoreColor].join(' ')}>{ans.score}分</span>
                                          ) : (
                                            <span className="shrink-0 text-[var(--color-text-muted)]">待批改</span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* 管理进度按钮 */}
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setManagedSteps([...effectiveSteps]); setIsManagingCp(true) }}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      管理进度
                    </button>
                  </div>
                </div>
              )
            }

            // ── 诊断课 6步 ──
            const diagSteps = [
              { num: 1, title: '建立专属诊断群', limit: '' },
              { num: 2, title: '1V1 电话沟通',   limit: '2天内完成' },
              { num: 3, title: '诊断试卷',        limit: '3天内完成' },
              { num: 4, title: '听解析',          limit: '2天内完成' },
              { num: 5, title: '1V1 诊断课',      limit: '3天内完成' },
              { num: 6, title: '诊断报告',        limit: '' },
            ]
            const diagBadgeMap = {
              normal:  <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] text-green-600">已正常完成</span>,
              delayed: <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] text-orange-500">延期完成</span>,
              urgent:  <span className="rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 text-[10px] text-[var(--color-primary)]">急需完成</span>,
              pending: <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-500">待完成</span>,
            }

            return (
              <div>
                {tabBar}
                <div className="space-y-0 overflow-hidden rounded-xl border border-[var(--color-border)]">
                  {diagSteps.map((step, idx) => {
                    const isDone    = step.num < currentDiagStep
                    const isCurrent = step.num === currentDiagStep
                    const status: keyof typeof diagBadgeMap = isDone ? 'normal' : isCurrent ? 'urgent' : 'pending'
                    const circleColor = status === 'normal' ? 'bg-green-500' : status === 'urgent' ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-text-muted)]'
                    return (
                      <div key={step.num} className={['px-4 py-3', idx !== diagSteps.length - 1 ? 'border-b border-[var(--color-border)]' : ''].join(' ')}>
                        <div className="flex items-center gap-3">
                          <div className={['flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', circleColor].join(' ')}>
                            {step.num}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-[var(--color-text-primary)]">{step.title}</span>
                              {diagBadgeMap[status]}
                            </div>
                            {editingStep?.tab === 'diag' && editingStep.num === step.num ? (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <input
                                  autoFocus type="text" value={stepDraft}
                                  onChange={(e) => setStepDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { setDiagLimits((p) => ({ ...p, [step.num]: stepDraft.trim() })); setEditingStep(null) }
                                    if (e.key === 'Escape') setEditingStep(null)
                                  }}
                                  className="flex-1 rounded border border-[var(--color-primary)] px-2 py-0.5 text-xs outline-none"
                                  placeholder="如：3天内完成"
                                />
                                <button type="button" onClick={() => { setDiagLimits((p) => ({ ...p, [step.num]: stepDraft.trim() })); setEditingStep(null) }}
                                  className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold text-white">确认</button>
                                <button type="button" onClick={() => setEditingStep(null)}
                                  className="rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">取消</button>
                              </div>
                            ) : (
                              <div className="mt-0.5 flex items-center gap-1">
                                <span className="text-[10px] text-[var(--color-text-muted)]">
                                  {diagLimits[step.num] !== undefined ? diagLimits[step.num] : step.limit}
                                </span>
                                <button type="button" title="修改学习路径"
                                  onClick={() => { setStepDraft(diagLimits[step.num] !== undefined ? diagLimits[step.num] : (step.limit ?? '')); setEditingStep({ tab: 'diag', num: step.num }) }}
                                  className="rounded p-0.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" disabled={currentDiagStep <= 1}
                    onClick={() => setCurrentDiagStep((s) => s - 1)}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] disabled:opacity-30 transition-colors">
                    上一步
                  </button>
                  <button type="button" disabled={currentDiagStep >= diagSteps.length}
                    onClick={() => setCurrentDiagStep((s) => s + 1)}
                    className="rounded-lg bg-[var(--color-primary)] px-3 py-1 text-[10px] font-semibold text-white hover:opacity-80 disabled:opacity-30 transition-opacity">
                    标记完成 →
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Teachers grouped by kpoint */}
          {detail && detail.teachersByKpoint.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">负责老师</div>
              <div className="space-y-2">
                {detail.teachersByKpoint.map((group) => (
                  <div key={group.kpoint} className="rounded-[var(--radius-card)] border border-[var(--color-border)] px-3 py-2.5">
                    {/* Kpoint label */}
                    <div className="mb-2 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: group.color }}>
                        {group.kpoint}
                      </span>
                    </div>
                    {/* Teachers in this kpoint */}
                    <div className="flex flex-wrap gap-2">
                      {group.teachers.map((t) => (
                        <button
                          type="button"
                          key={t.role + t.name}
                          onClick={() => onTeacherClick(t.name)}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
                        >
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                            style={{ backgroundColor: roleAvatarColor[t.role] ?? '#888' }}
                          >
                            {t.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-[var(--color-text-primary)]">{t.name}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">{t.role}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 投诉记录 ── */}
          {(() => {
            const complaints = complaintsMap[student.id] ?? []
            if (complaints.length === 0) return null
            return (
              <div>
                <div className="mb-2 text-xs font-semibold text-[var(--color-text-secondary)]">学生投诉建议记录</div>
                <div className="space-y-2">
                  {complaints.map((c) => (
                    <ComplaintCard
                      key={c.id}
                      complaint={c}
                      onResolve={(note) => resolveComplaint(student.id, c.id, note)}
                    />
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ── 相关信息 (immediately after teachers) ── */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">相关信息</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(true)}
                  className="flex items-center gap-1 text-[10px] text-red-500 hover:underline"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  学生投诉建议增加
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInfoForm((v) => !v); setInfoDraft(''); setInfoRole('带教老师') }}
                  className="text-[10px] text-[var(--color-primary)] hover:underline"
                >
                  {showInfoForm ? '取消' : '+ 添加'}
                </button>
              </div>
            </div>

            {/* Add form */}
            {showInfoForm && (
              <div className="mb-3 rounded-[var(--radius-card)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] p-3 space-y-2">
                {/* Role + author row */}
                <div className="flex items-center gap-2">
                  <select
                    value={infoRole}
                    onChange={(e) => setInfoRole(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)]"
                  >
                    {INFO_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input
                    value={infoAuthor}
                    onChange={(e) => setInfoAuthor(e.target.value)}
                    placeholder="姓名"
                    className="w-20 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
                  />
                </div>
                {/* Content */}
                <textarea
                  value={infoDraft}
                  onChange={(e) => setInfoDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddInfo() } }}
                  placeholder="输入信息内容… (Enter 提交)"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)] placeholder:text-[var(--color-text-muted)]"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={!infoDraft.trim() || infoSaving}
                    onClick={() => void handleAddInfo()}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    {infoSaving ? '提交中…' : '提交'}
                  </button>
                </div>
              </div>
            )}

            {/* Info list */}
            {(() => {
              const items = studentInfoMap[student.id] ?? []
              if (items.length === 0 && !showInfoForm) return (
                <div className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">暂无相关信息</div>
              )
              return (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="group rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={['rounded-full px-2 py-0.5 text-[10px] font-medium', INFO_ROLE_STYLE[item.authorRole] ?? INFO_ROLE_STYLE['其他']].join(' ')}>
                          {item.authorRole}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{item.authorName}</span>
                        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                          {format(new Date(item.createdAt), 'MM-dd HH:mm')}
                        </span>
                        <button
                          type="button"
                          onClick={() => void deleteStudentInfo(student.id, item.id)}
                          className="hidden group-hover:flex items-center rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">{item.content}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Knowledge points + Exam scores */}
          {detail && (detail.knowledgePoints.length > 0 || detail.answers.length > 0) && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="text-xs font-semibold text-[var(--color-text-secondary)]">知识点掌握情况</div>
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] text-green-600 border border-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  同步老师上传
                </span>
              </div>

              {/* 题目得分 */}
              {detail.knowledgePoints.length > 0 && (
                <div className="space-y-2.5">
                  {detail.knowledgePoints.map((kp) => (
                    <KnowledgePointRow key={kp.name} kp={kp} />
                  ))}
                </div>
              )}

              {/* 试卷批改得分 */}
              {detail.answers.length > 0 && (
                <div className={detail.knowledgePoints.length > 0 ? 'mt-4' : ''}>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">试卷得分</div>
                  <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                    {detail.answers.map((ans, i) => {
                      const isReviewed = ans.status === 'reviewed'
                      const scoreColor = !isReviewed ? ''
                        : (ans.score ?? 0) >= 80 ? 'text-green-600'
                        : (ans.score ?? 0) >= 60 ? 'text-[var(--color-primary)]'
                        : 'text-red-500'
                      const typeStyle: Record<string, string> = {
                        '入学诊断':   'bg-purple-50 text-purple-600 border-purple-200',
                        '卡点练习题': 'bg-blue-50 text-blue-600 border-blue-200',
                        '卡点考试':   'bg-orange-50 text-orange-600 border-orange-200',
                        '整卷批改':   'bg-green-50 text-green-600 border-green-200',
                      }
                      return (
                        <div key={ans.id} className={['px-4 py-3', i !== detail.answers.length - 1 ? 'border-b border-[var(--color-border)]' : ''].join(' ')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium text-[var(--color-text-primary)]">{ans.questionTitle}</span>
                                <span className={['rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', typeStyle[ans.questionType] ?? 'bg-gray-50 text-gray-500 border-gray-200'].join(' ')}>
                                  {ans.questionType}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                                提交于 {ans.submittedAt.slice(0, 10)}
                              </div>
                              {isReviewed && ans.teacherComment && (
                                <div className="mt-1.5 rounded-lg bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 px-2.5 py-1.5 text-[10px] leading-relaxed text-[var(--color-text-primary)]">
                                  {ans.teacherComment}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {isReviewed && ans.score !== undefined ? (
                                <span className={['text-base font-bold tabular-nums', scoreColor].join(' ')}>{ans.score}<span className="text-[10px] font-normal text-[var(--color-text-muted)]"> 分</span></span>
                              ) : (
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-400">待批改</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Student feedback */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">学生反馈</div>
              <span className="rounded-full bg-[var(--color-bg-left)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">{feedbacks.length}</span>
            </div>
            {feedbacks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-[11px] text-[var(--color-text-muted)]">
                暂无学生反馈
              </div>
            ) : (
              <div className="space-y-2">
                {feedbacks.map((fb) => (
                  <div key={fb.id} className="rounded-[var(--radius-card)] border border-[var(--color-border)] px-3 py-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{fb.sessionLabel}</span>
                        <StarRow rating={fb.rating} />
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)]">{fb.date}</span>
                    </div>
                    {fb.tags.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {fb.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-[var(--color-bg-left)] px-2 py-0.5 text-[9px] text-[var(--color-text-secondary)]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {fb.comment && (
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{fb.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question answers */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">题目作答</div>
              <span className="rounded-full bg-[var(--color-bg-left)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">{localAnswers.length}</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
                  {pendingCount} 待批改
                </span>
              )}
            </div>
            {localAnswers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-[11px] text-[var(--color-text-muted)]">
                暂无作答记录
              </div>
            ) : (
              <div className="space-y-2">
                {localAnswers.map((ans) => (
                  <AnswerCard key={ans.id} answer={ans} onReview={handleReview} />
                ))}
              </div>
            )}
          </div>

          {/* Handouts */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">课程讲义</div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[10px] font-medium text-white hover:opacity-80 transition-opacity"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                上传讲义
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                className="hidden" onChange={handleFileChange} />
            </div>
            {allHandouts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-[11px] text-[var(--color-text-muted)]">暂无讲义，点击右上角上传</div>
            ) : (
              <div className="space-y-2">
                {allHandouts.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2">
                    {fileIcon(h.fileName)}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-[var(--color-text-primary)]">{h.fileName}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{h.uploadedBy} · {h.sessionLabel} · {h.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Replays */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">课程回放</div>
              <button
                type="button"
                onClick={() => setShowReplayInput((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-[var(--color-primary)] px-2.5 py-1 text-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                添加回放
              </button>
            </div>
            {showReplayInput && (
              <div className="mb-2 flex gap-2">
                <input type="url" value={replayInput} onChange={(e) => setReplayInput(e.target.value)}
                  placeholder="粘贴回放链接…"
                  className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddReplay()} />
                <button type="button" onClick={handleAddReplay}
                  className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white hover:opacity-80">
                  确认
                </button>
              </div>
            )}
            {allReplays.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-[11px] text-[var(--color-text-muted)]">暂无回放，点击右上角添加链接</div>
            ) : (
              <div className="space-y-2">
                {allReplays.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[var(--color-text-primary)]">{r.sessionLabel} 回放</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">{r.date}{r.duration ? ` · ${r.duration}` : ''}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-text-muted)]">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Teacher notes — 对话框备注 + 静态备注合并 */}
          {(() => {
            const chatNotes = student.contactId ? (notesMap[student.contactId] ?? []) : []
            const staticNotes = detail?.teacherNotes ?? []
            if (chatNotes.length === 0 && staticNotes.length === 0) return null
            return (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)]">老师备注</div>
                  <div className="flex items-center gap-2">
                    {/* 重点关注开关 */}
                    <button
                      type="button"
                      onClick={() => void setStudentFlag(student.id, !isFlagged)}
                      className={[
                        'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
                        isFlagged
                          ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-red-200 hover:bg-red-50 hover:text-red-400',
                      ].join(' ')}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24"
                        fill={isFlagged ? 'currentColor' : 'none'}
                        stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      {isFlagged ? '已重点关注' : '重点关注'}
                    </button>
                    {student.contactId && (
                      <button
                        type="button"
                        onClick={() => openNotes(student.contactId!)}
                        className="text-[10px] text-[var(--color-primary)] hover:underline"
                      >
                        + 添加备注
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {/* 对话框实时备注 */}
                  {chatNotes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)] p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: roleAvatarColor['带教老师'] }}
                        >
                          {n.authorName.slice(0, 1)}
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{n.authorName}</span>
                        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                          {format(new Date(n.createdAt), 'MM-dd HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{n.text}</p>
                    </div>
                  ))}
                  {/* 原有静态备注 */}
                  {staticNotes.map((note, i) => (
                    <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                          style={{ backgroundColor: roleAvatarColor[note.role] ?? '#888' }}
                        >
                          {note.name.slice(0, 1)}
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-text-primary)]">{note.name}</span>
                        <span className="rounded-full bg-[var(--color-bg-left)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-muted)]">{note.role}</span>
                        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">{note.date}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
        )}
      </div>

      {showComplaintModal && (
        <ComplaintModal student={student} onClose={() => setShowComplaintModal(false)} />
      )}
    </div>
  )
}

// ── ComplaintCard ─────────────────────────────────────────────────────────────
function ComplaintCard({
  complaint,
  onResolve,
}: {
  complaint: ComplaintRecord
  onResolve: (note: string) => void
}) {
  const [resolving, setResolving] = useState(false)
  const [resolveNote, setResolveNote] = useState('')

  const isPending = complaint.status === 'pending'

  return (
    <div className={['rounded-[var(--radius-card)] border p-3 text-xs', isPending ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'].join(' ')}>
      {/* Header row */}
      <div className="mb-2 flex items-center gap-2">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isPending ? 'text-red-500' : 'text-green-600'}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span className={['font-semibold', isPending ? 'text-red-600' : 'text-green-700'].join(' ')}>
          {isPending ? '投诉处理中' : '投诉已解决'}
        </span>
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
          {format(new Date(complaint.submittedAt), 'MM-dd HH:mm')}
        </span>
      </div>

      {/* Fields */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">学生诉求</span>
          <span className="flex-1 text-[11px] text-[var(--color-text-primary)]">{complaint.demand}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">投诉原因</span>
          <span className="flex-1 text-[11px] text-[var(--color-text-primary)]">{complaint.reason}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">解决建议</span>
          <span className="flex-1 text-[11px] text-[var(--color-text-primary)]">{complaint.suggestion}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">负责人</span>
          <span className="flex-1 text-[11px] text-[var(--color-text-primary)]">{complaint.resolvers.join('、')}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">截止时间</span>
          <span className={['text-[11px] font-medium', isPending && complaint.deadline < new Date().toISOString().slice(0, 10) ? 'text-red-500' : 'text-[var(--color-text-primary)]'].join(' ')}>
            {complaint.deadline}
          </span>
        </div>
        {complaint.extraNote && (
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">补充说明</span>
            <span className="flex-1 text-[11px] text-[var(--color-text-primary)]">{complaint.extraNote}</span>
          </div>
        )}
        {complaint.attachments.length > 0 && (
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-[10px] text-[var(--color-text-muted)]">附件</span>
            <div className="flex flex-wrap gap-1">
              {complaint.attachments.map((att) => (
                <img key={att.id} src={att.dataUrl} alt={att.name}
                  className="h-10 w-10 rounded border border-[var(--color-border)] object-cover" />
              ))}
            </div>
          </div>
        )}
        {complaint.resolvedNote && (
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-[10px] text-green-500">解决说明</span>
            <span className="flex-1 text-[11px] text-green-700">{complaint.resolvedNote}</span>
          </div>
        )}
      </div>

      {/* Resolve action */}
      {isPending && (
        <div className="mt-2.5 border-t border-red-200 pt-2.5">
          {resolving ? (
            <div className="space-y-1.5">
              <textarea
                autoFocus rows={2} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)}
                placeholder="填写解决说明（可选）…"
                className="w-full resize-none rounded-lg border border-green-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-green-500 placeholder:text-gray-300"
              />
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setResolving(false)}
                  className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-text-muted)] hover:bg-white">
                  取消
                </button>
                <button type="button" onClick={() => { onResolve(resolveNote.trim()); setResolving(false) }}
                  className="rounded-lg bg-green-500 px-3 py-1 text-[10px] font-semibold text-white hover:bg-green-600">
                  确认已解决
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setResolving(true)}
              className="flex items-center gap-1 text-[10px] font-medium text-green-600 hover:underline">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              标记已解决
            </button>
          )}
        </div>
      )}
    </div>
  )
}
