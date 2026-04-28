import { createPortal } from 'react-dom'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../../lib/api'
import { apiUrl } from '../../../../lib/apiBase'
import { fetchSubmissionFileUrl, uploadReviewedSubmissionPdf } from '../../api/submissions'
import { useWorkbenchStore } from '../../store/workbenchStore'

type WorkspaceTab = 'publish' | 'schedule' | 'history' | 'homework'
type FileFieldKey = 'question' | 'handout' | 'qaSummary' | 'report'
type HomeworkFilter = 'all' | 'pending' | 'reviewed' | 'sent'
type HomeworkLocalStatus = 'pending' | 'reviewed' | 'sent'

interface StudentOption {
  id: string
  name: string
  grade: string
  subject: string
  avatar: string
  color: string
}

interface DrillResource {
  url: string
  fileName: string
  storedFile?: string
  size?: number
}

interface PublishDraft {
  weekLabel: string
  title: string
  pointName: string
  liveDate: string
  liveTime: string
  dueDate: string
  dueTime: string
  notes: string
  liveLink: string
  replayLink: string
  question: DrillResource | null
  handout: DrillResource | null
  qaSummary: DrillResource | null
  report: DrillResource | null
}

interface ScheduleDraft {
  weekLabel: string
  title: string
  liveDate: string
  liveTime: string
  dueDate: string
  dueTime: string
  remark: string
}

interface ScheduleItem {
  id: string
  weekLabel: string
  title: string
  liveAt: string
  dueAt: string
  remark: string
  assignedCount: number
  status: 'pending' | 'published'
}

interface HistoryRecord {
  id: string
  pointName: string
  weekLabel: string
  title: string
  liveAt: string
  dueAt: string
  notes: string
  publishedAt: string
  assignedCount: number
  studentIds: string[]
  studentNames: string[]
  resources: {
    question: DrillResource | null
    handout: DrillResource | null
    qaSummary: DrillResource | null
    report: DrillResource | null
    liveLink: string
    replayLink: string
  }
  scheduleItems: ScheduleItem[]
}

interface HomeworkRecord {
  id: string
  studentId: string
  studentName: string
  pointName: string
  stageKey: string
  taskId: string
  feedbackTaskId: string
  fileName: string
  submittedAt: string
  graded: boolean
  score: number | null
  feedback: string
  reviewedFileName: string
  hasReviewedFile: boolean
  grade: string
  subject: string
  aiDone: boolean
  aiMeta: Record<string, unknown>
}

interface HomeworkDraft {
  score: string
  teacherComment: string
  reviewFile: File | null
  reviewFileName: string
  savedAt: string
  localStatus: HomeworkLocalStatus
}

interface DrillUploadResponse {
  ok?: boolean
  url?: string
  fileName?: string
  storedFile?: string
  size?: number
  message?: string
}

const TAB_META: Array<{ key: WorkspaceTab; label: string; hint: string }> = [
  { key: 'publish', label: '本周发布', hint: '发布本周直播刷题内容' },
  { key: 'schedule', label: '日程安排', hint: '维护直播时间和作业截止时间' },
  { key: 'history', label: '历史数据', hint: '查看每周发布历史' },
  { key: 'homework', label: '作业查看', hint: '查看学生提交与批改反馈' },
]

const DEFAULT_DRAFT: PublishDraft = {
  weekLabel: '第 1 周',
  title: '直播刷题',
  pointName: '申论刷题',
  liveDate: '',
  liveTime: '19:00',
  dueDate: '',
  dueTime: '23:59',
  notes: '',
  liveLink: '',
  replayLink: '',
  question: null,
  handout: null,
  qaSummary: null,
  report: null,
}

const DEFAULT_SCHEDULE_DRAFT: ScheduleDraft = {
  weekLabel: DEFAULT_DRAFT.weekLabel,
  title: DEFAULT_DRAFT.title,
  liveDate: DEFAULT_DRAFT.liveDate,
  liveTime: DEFAULT_DRAFT.liveTime,
  dueDate: DEFAULT_DRAFT.dueDate,
  dueTime: DEFAULT_DRAFT.dueTime,
  remark: '',
}

const FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip'

function getTodayDate() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDateTime(date = '', time = '') {
  return [date, time].filter(Boolean).join(' ').trim()
}

function getNowLabel() {
  return new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDisplayLabel(value = '') {
  return value || '未设置'
}

function isHttpUrl(value = '') {
  return /^https?:\/\//i.test(String(value).trim())
}

function getResourceLabel(resource: DrillResource | null) {
  if (!resource) return '未上传'
  return resource.fileName || resource.url
}

function getResourceCount(draft: PublishDraft) {
  return [draft.question, draft.handout, draft.qaSummary, draft.report].filter(Boolean).length
}

function normalizeResource(raw: unknown): DrillResource | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const url = String(record.url || '').trim()
  const fileName = String(record.fileName || '').trim()
  if (!url && !fileName) return null

  return {
    url,
    fileName,
    storedFile: String(record.storedFile || '').trim() || undefined,
    size: typeof record.size === 'number' ? record.size : undefined,
  }
}

function normalizeScheduleItem(raw: unknown): ScheduleItem {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  return {
    id: String(record.id || `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    weekLabel: String(record.weekLabel || '').trim(),
    title: String(record.title || '').trim(),
    liveAt: String(record.liveAt || '').trim(),
    dueAt: String(record.dueAt || '').trim(),
    remark: String(record.remark || '').trim(),
    assignedCount: Number(record.assignedCount || 0),
    status: record.status === 'published' ? 'published' : 'pending',
  }
}

function normalizeHistoryRecord(raw: unknown): HistoryRecord {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const resources = record.resources && typeof record.resources === 'object'
    ? record.resources as Record<string, unknown>
    : {}

  return {
    id: String(record.id || ''),
    pointName: String(record.pointName || ''),
    weekLabel: String(record.weekLabel || ''),
    title: String(record.title || ''),
    liveAt: String(record.liveAt || ''),
    dueAt: String(record.dueAt || ''),
    notes: String(record.notes || ''),
    publishedAt: String(record.publishedAt || ''),
    assignedCount: Number(record.assignedCount || 0),
    studentIds: Array.isArray(record.studentIds) ? record.studentIds.map((item) => String(item)) : [],
    studentNames: Array.isArray(record.studentNames) ? record.studentNames.map((item) => String(item)) : [],
    resources: {
      question: normalizeResource(resources.question),
      handout: normalizeResource(resources.handout),
      qaSummary: normalizeResource(resources.qaSummary),
      report: normalizeResource(resources.report),
      liveLink: String(resources.liveLink || ''),
      replayLink: String(resources.replayLink || ''),
    },
    scheduleItems: Array.isArray(record.scheduleItems)
      ? record.scheduleItems.map((item) => normalizeScheduleItem({ ...item, status: 'published' }))
      : [],
  }
}

function normalizeHomeworkRecord(raw: unknown): HomeworkRecord {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const rawScore = record.score
  let score: number | null = null

  if (typeof rawScore === 'number' && !Number.isNaN(rawScore)) {
    score = rawScore
  } else if (rawScore === null) {
    score = null
  } else if (rawScore !== undefined && rawScore !== '') {
    const parsed = Number(rawScore)
    score = Number.isNaN(parsed) ? null : parsed
  }

  return {
    id: String(record.id || ''),
    studentId: String(record.studentId || ''),
    studentName: String(record.studentName || ''),
    pointName: String(record.pointName || ''),
    stageKey: String(record.stageKey || ''),
    taskId: String(record.taskId || ''),
    feedbackTaskId: String(record.feedbackTaskId || ''),
    fileName: String(record.fileName || ''),
    submittedAt: String(record.submittedAt || ''),
    graded: Boolean(record.graded),
    score,
    feedback: String(record.feedback || ''),
    reviewedFileName: String(record.reviewedFileName || ''),
    hasReviewedFile: Boolean(record.hasReviewedFile),
    grade: String(record.grade || ''),
    subject: String(record.subject || ''),
    aiDone: Boolean(record.aiDone),
    aiMeta: record.aiMeta && typeof record.aiMeta === 'object' ? record.aiMeta as Record<string, unknown> : {},
  }
}

function buildInitialHomeworkDraft(record: HomeworkRecord): HomeworkDraft {
  return {
    score: record.score === null ? '' : String(record.score),
    teacherComment: record.feedback || '',
    reviewFile: null,
    reviewFileName: record.reviewedFileName || '',
    savedAt: '',
    localStatus: record.graded ? 'sent' : 'pending',
  }
}

function buildScheduleItemFromDraft(draft: ScheduleDraft, assignedCount: number): ScheduleItem {
  return {
    id: `schedule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    weekLabel: draft.weekLabel.trim(),
    title: draft.title.trim(),
    liveAt: formatDateTime(draft.liveDate, draft.liveTime),
    dueAt: formatDateTime(draft.dueDate, draft.dueTime),
    remark: draft.remark.trim(),
    assignedCount,
    status: 'pending',
  }
}

function buildPublishScheduleItems(draft: PublishDraft, _selectedStudentIds: string[], items: ScheduleItem[]) {
  if (items.length > 0) {
    return items.map((item) => ({
      id: item.id,
      weekLabel: item.weekLabel,
      title: item.title,
      liveAt: item.liveAt,
      dueAt: item.dueAt,
      remark: item.remark,
    }))
  }

  return [{
    id: `schedule_${Date.now()}`,
    weekLabel: draft.weekLabel,
    title: draft.title,
    liveAt: formatDateTime(draft.liveDate, draft.liveTime),
    dueAt: formatDateTime(draft.dueDate, draft.dueTime),
    remark: draft.notes,
  }]
}

function getHomeworkStatus(record: HomeworkRecord, draft?: HomeworkDraft): HomeworkLocalStatus {
  if (draft?.localStatus) return draft.localStatus
  return record.graded ? 'sent' : 'pending'
}

function getHomeworkStatusLabel(status: HomeworkLocalStatus) {
  switch (status) {
    case 'reviewed':
      return '已暂存'
    case 'sent':
      return '已发送'
    default:
      return '待处理'
  }
}

function getScheduleStatusLabel(status: ScheduleItem['status']) {
  return status === 'published' ? '已发布' : '待发布'
}

function getAiResult(record: HomeworkRecord) {
  const result = record.aiMeta.result && typeof record.aiMeta.result === 'object'
    ? record.aiMeta.result as Record<string, unknown>
    : {}

  const score = result.score === null || result.score === undefined
    ? null
    : Number(result.score)

  return {
    status: String(result.status || ''),
    score: Number.isNaN(score) ? null : score,
    feedback: String(result.feedback || ''),
    reviewedFileName: String(result.reviewedFileName || ''),
  }
}

function openExternalLink(url = '') {
  if (!url) return
  const targetUrl = isHttpUrl(url) ? url : apiUrl(url)
  window.open(targetUrl, '_blank', 'noopener,noreferrer')
}

function WorkspaceTabButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl border px-4 py-3 text-left transition-all',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-[var(--shadow-xs)]'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-left)]',
      ].join(' ')}
    >
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</div>
      <div className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</div>
    </button>
  )
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-[var(--shadow-xs)]">
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">{hint}</div>
    </div>
  )
}

function SectionCard({
  title,
  desc,
  children,
  action,
}: {
  title: string
  desc: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-xs)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-[var(--color-text-primary)]">{title}</div>
          <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{desc}</div>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function FileCard({
  title,
  subtitle,
  resource,
  uploading,
  onPick,
  onPreview,
}: {
  title: string
  subtitle: string
  resource: DrillResource | null
  uploading: boolean
  onPick: () => void
  onPreview: () => void
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-page-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">{subtitle}</div>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
          {uploading ? '上传中' : resource ? '已上传' : '未上传'}
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-4">
        <div className="text-sm font-medium text-[var(--color-text-primary)]">
          {resource ? resource.fileName : 'Click to upload'}
        </div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
          {resource?.url || 'PDF / Office / image / zip'}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPick}
            disabled={uploading}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? '上传中...' : (resource ? '重新上传' : '上传')}
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={!resource?.url}
          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
            预览
          </button>
        </div>
      </div>
    </div>
  )
}

export function LiveDrillModal() {
  const openTaskKey = useWorkbenchStore((state) => state.openTaskKey)
  const closeTaskModal = useWorkbenchStore((state) => state.closeTaskModal)
  const students = useWorkbenchStore((state) => state.students)

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('publish')
  const [publishDraft, setPublishDraft] = useState<PublishDraft>({
    ...DEFAULT_DRAFT,
    liveDate: getTodayDate(),
    dueDate: getTodayDate(),
  })
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    ...DEFAULT_SCHEDULE_DRAFT,
    liveDate: getTodayDate(),
    dueDate: getTodayDate(),
  })
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [uploadingMap, setUploadingMap] = useState<Record<FileFieldKey, boolean>>({
    question: false,
    handout: false,
    qaSummary: false,
    report: false,
  })
  const [publishBusy, setPublishBusy] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [homeworkLoading, setHomeworkLoading] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecord[]>([])
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null)
  const [homeworkFilter, setHomeworkFilter] = useState<HomeworkFilter>('all')
  const [homeworkDrafts, setHomeworkDrafts] = useState<Record<string, HomeworkDraft>>({})
  const [homeworkBusyId, setHomeworkBusyId] = useState<string | null>(null)
  const [bannerMessage, setBannerMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const questionInputRef = useRef<HTMLInputElement>(null)
  const handoutInputRef = useRef<HTMLInputElement>(null)
  const summaryInputRef = useRef<HTMLInputElement>(null)
  const reportInputRef = useRef<HTMLInputElement>(null)
  const reviewFileInputRef = useRef<HTMLInputElement>(null)

  const availableStudents = useMemo<StudentOption[]>(() => {
    if (students.length > 0) {
      return students.map((student) => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        subject: student.subject,
        avatar: student.avatar,
        color: student.color,
      }))
    }
    return []
  }, [students])

  const selectedHistory = useMemo(
    () => historyRecords.find((item) => item.id === selectedHistoryId) || historyRecords[0] || null,
    [historyRecords, selectedHistoryId],
  )

  const filteredHomework = useMemo(() => {
    return homeworkRecords.filter((record) => {
      const status = getHomeworkStatus(record, homeworkDrafts[record.id])
      if (homeworkFilter === 'pending') return status === 'pending'
      if (homeworkFilter === 'reviewed') return status === 'reviewed'
      if (homeworkFilter === 'sent') return status === 'sent'
      return true
    })
  }, [homeworkDrafts, homeworkFilter, homeworkRecords])

  const selectedHomework = useMemo(
    () => filteredHomework.find((item) => item.id === selectedHomeworkId)
      || homeworkRecords.find((item) => item.id === selectedHomeworkId)
      || filteredHomework[0]
      || homeworkRecords[0]
      || null,
    [filteredHomework, homeworkRecords, selectedHomeworkId],
  )

  const reviewedCount = useMemo(
    () => homeworkRecords.filter((record) => getHomeworkStatus(record, homeworkDrafts[record.id]) !== 'pending').length,
    [homeworkDrafts, homeworkRecords],
  )

  const sentCount = useMemo(
    () => homeworkRecords.filter((record) => getHomeworkStatus(record, homeworkDrafts[record.id]) === 'sent').length,
    [homeworkDrafts, homeworkRecords],
  )

  useEffect(() => {
    if (selectedStudentIds.length === 0 && availableStudents.length > 0) {
      setSelectedStudentIds(availableStudents.slice(0, 4).map((student) => student.id))
    }
  }, [availableStudents, selectedStudentIds.length])

  useEffect(() => {
    if (openTaskKey !== 'liveDrill') return
    void loadHistory()
    void loadHomeworks()
  }, [openTaskKey])

  useEffect(() => {
    if (!selectedHistoryId && historyRecords.length > 0) {
      setSelectedHistoryId(historyRecords[0].id)
    }
  }, [historyRecords, selectedHistoryId])

  useEffect(() => {
    if (!selectedHomeworkId && homeworkRecords.length > 0) {
      setSelectedHomeworkId(homeworkRecords[0].id)
    }
  }, [homeworkRecords, selectedHomeworkId])

  if (openTaskKey !== 'liveDrill') return null

  async function loadHistory() {
    setHistoryLoading(true)
    setErrorMessage('')

    try {
      const data = await api.get<unknown[]>('/api/teacher/drill/history')
      const records = Array.isArray(data) ? data.map((item) => normalizeHistoryRecord(item)) : []
      setHistoryRecords(records)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }

  async function loadHomeworks() {
    setHomeworkLoading(true)
    setErrorMessage('')

    try {
      const data = await api.get<unknown[]>('/api/teacher/drill/homeworks')
      const records = Array.isArray(data) ? data.map((item) => normalizeHomeworkRecord(item)) : []
      setHomeworkRecords(records)
      setHomeworkDrafts((current) => {
        const next = { ...current }
        records.forEach((record) => {
          const existing = next[record.id]
          if (!existing) {
            next[record.id] = buildInitialHomeworkDraft(record)
            return
          }

          if (record.graded) {
            next[record.id] = {
              ...existing,
              score: record.score === null ? existing.score : String(record.score),
              teacherComment: record.feedback || existing.teacherComment,
              reviewFileName: record.reviewedFileName || existing.reviewFileName,
              localStatus: 'sent',
            }
          }
        })
        return next
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load homework')
    } finally {
      setHomeworkLoading(false)
    }
  }

  function handleClose() {
    closeTaskModal()
    setBannerMessage('')
    setErrorMessage('')
  }

  function updatePublishDraft<K extends keyof PublishDraft>(key: K, value: PublishDraft[K]) {
    setPublishDraft((current) => ({ ...current, [key]: value }))
  }

  function updateScheduleDraft<K extends keyof ScheduleDraft>(key: K, value: ScheduleDraft[K]) {
    setScheduleDraft((current) => ({ ...current, [key]: value }))
  }

  function updateHomeworkDraft(id: string, patch: Partial<HomeworkDraft>) {
    setHomeworkDrafts((current) => {
      const fallbackRecord = homeworkRecords.find((item) => item.id === id)
      const base = current[id] || (fallbackRecord ? buildInitialHomeworkDraft(fallbackRecord) : {
        score: '',
        teacherComment: '',
        reviewFile: null,
        reviewFileName: '',
        savedAt: '',
        localStatus: 'pending' as const,
      })

      return {
        ...current,
        [id]: {
          ...base,
          ...patch,
        },
      }
    })
  }

  function selectAllStudents() {
    setSelectedStudentIds(availableStudents.map((student) => student.id))
  }

  function clearStudents() {
    setSelectedStudentIds([])
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((current) => (
      current.includes(studentId)
        ? current.filter((item) => item !== studentId)
        : [...current, studentId]
    ))
  }

  function syncScheduleFromPublish() {
    setScheduleDraft({
      weekLabel: publishDraft.weekLabel,
      title: publishDraft.title,
      liveDate: publishDraft.liveDate,
      liveTime: publishDraft.liveTime,
      dueDate: publishDraft.dueDate,
      dueTime: publishDraft.dueTime,
      remark: publishDraft.notes,
    })
    setBannerMessage('已把本周发布信息同步到日程表单')
  }

  function addScheduleItem() {
    if (!scheduleDraft.weekLabel.trim() || !scheduleDraft.title.trim()) {
      setErrorMessage('周次和标题不能为空')
      return
    }

    const nextItem = buildScheduleItemFromDraft(scheduleDraft, selectedStudentIds.length)
    setScheduleItems((current) => [nextItem, ...current])
    setBannerMessage('已加入日程安排')
    setErrorMessage('')
  }

  async function uploadFieldFile(key: FileFieldKey, file: File | null) {
    if (!file) return

    setUploadingMap((current) => ({ ...current, [key]: true }))
    setErrorMessage('')
    setBannerMessage('')

    try {
      const body = new FormData()
      body.append('file', file)
      const payload = await api.postForm<DrillUploadResponse>('/api/teacher/drill/upload-file', body)

      if (!payload?.ok || !payload.url) {
        throw new Error(payload?.message || '上传失败')
      }

      const resource: DrillResource = {
        url: payload.url,
        fileName: payload.fileName || file.name,
        storedFile: payload.storedFile,
        size: payload.size,
      }

      updatePublishDraft(key, resource as PublishDraft[typeof key])
      setBannerMessage(`${file.name} 上传成功`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploadingMap((current) => ({ ...current, [key]: false }))
    }
  }

  async function handlePublish() {
    if (!publishDraft.pointName.trim()) {
      setErrorMessage('卡点名称不能为空')
      setActiveTab('publish')
      return
    }

    if (!publishDraft.title.trim()) {
      setErrorMessage('标题不能为空')
      setActiveTab('publish')
      return
    }

    if (!publishDraft.question?.url) {
      setErrorMessage('请先上传题目')
      setActiveTab('publish')
      return
    }

    if (!publishDraft.liveLink.trim() || !isHttpUrl(publishDraft.liveLink)) {
      setErrorMessage('请填写正确的直播链接')
      setActiveTab('publish')
      return
    }

    if (publishDraft.replayLink.trim() && !isHttpUrl(publishDraft.replayLink)) {
      setErrorMessage('回放链接必须是完整的 http 或 https 地址')
      setActiveTab('publish')
      return
    }

    if (selectedStudentIds.length === 0) {
      setErrorMessage('请至少选择 1 名学生')
      setActiveTab('publish')
      return
    }

    setPublishBusy(true)
    setErrorMessage('')
    setBannerMessage('')

    try {
      const payload = await api.post<{ ok?: boolean; assignedCount?: number }>('/api/teacher/drill/publish', {
        studentIds: selectedStudentIds,
        pointName: publishDraft.pointName.trim(),
        weekLabel: publishDraft.weekLabel.trim(),
        title: publishDraft.title.trim(),
        liveDate: publishDraft.liveDate,
        liveTime: publishDraft.liveTime,
        dueDate: publishDraft.dueDate,
        dueTime: publishDraft.dueTime,
        notes: publishDraft.notes.trim(),
        liveLink: publishDraft.liveLink.trim(),
        replayLink: publishDraft.replayLink.trim(),
        question: publishDraft.question,
        handout: publishDraft.handout,
        qaSummary: publishDraft.qaSummary,
        report: publishDraft.report,
        scheduleItems: buildPublishScheduleItems(publishDraft, selectedStudentIds, scheduleItems),
      })

      if (!payload?.ok) {
        throw new Error('发布失败')
      }

      setScheduleItems((current) => current.map((item) => ({ ...item, status: 'published' })))
      setBannerMessage(`发布成功，已同步给 ${payload.assignedCount || selectedStudentIds.length} 名学生`)
      await loadHistory()
      await loadHomeworks()
      setActiveTab('history')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '发布失败')
    } finally {
      setPublishBusy(false)
    }
  }

  async function previewSubmission(id: string) {
    try {
      const url = await fetchSubmissionFileUrl(id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '打开学生作业失败')
    }
  }

  function saveHomeworkReview(id: string) {
    updateHomeworkDraft(id, {
      savedAt: getNowLabel(),
      localStatus: 'reviewed',
    })
    setBannerMessage('已暂存老师批改内容')
  }

  async function sendHomeworkReview(record: HomeworkRecord) {
    const draft = homeworkDrafts[record.id] || buildInitialHomeworkDraft(record)
    draft.score = ''
    draft.teacherComment = draft.teacherComment || ' '
    const scoreText = draft.score.trim()
    const scoreValue = scoreText ? Number(scoreText) : null

    if (scoreText && Number.isNaN(scoreValue)) {
      setErrorMessage('分数必须是数字')
      return
    }

    if (!draft.teacherComment.trim()) {
      setErrorMessage('请先填写老师批改意见')
      return
    }

    setHomeworkBusyId(record.id)
    setErrorMessage('')
    setBannerMessage('')

    try {
      let reviewedFileName = record.reviewedFileName

      if (draft.reviewFile) {
        const uploadResult = await uploadReviewedSubmissionPdf(record.id, draft.reviewFile)
        reviewedFileName = uploadResult.reviewedFileName || reviewedFileName
      }

      await api.put<{ ok?: boolean }>(`/api/submissions/${record.id}/grade`, {})

      setHomeworkRecords((current) => current.map((item) => (
        item.id === record.id
          ? {
              ...item,
              graded: true,
              score: null,
              feedback: '',
              reviewedFileName,
              hasReviewedFile: Boolean(reviewedFileName),
            }
          : item
      )))

      updateHomeworkDraft(record.id, {
        reviewFile: null,
        reviewFileName: reviewedFileName,
        savedAt: getNowLabel(),
        localStatus: 'sent',
      })
      setBannerMessage('批改结果已发送给学生')
      await loadHomeworks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '发送批改失败')
    } finally {
      setHomeworkBusyId(null)
    }
  }

  const selectedHomeworkDraft = selectedHomework
    ? (homeworkDrafts[selectedHomework.id] || buildInitialHomeworkDraft(selectedHomework))
    : undefined

  const selectedHomeworkAiResult = selectedHomework ? getAiResult(selectedHomework) : null

  const schedulePreview = scheduleItems.length > 0
    ? scheduleItems
    : buildPublishScheduleItems(publishDraft, selectedStudentIds, []).map((item) => ({
        ...normalizeScheduleItem(item),
        assignedCount: selectedStudentIds.length,
      }))

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex h-[min(92vh,960px)] w-[min(1320px,100%)] flex-col overflow-hidden rounded-[32px] bg-[var(--color-page-bg)] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] bg-white px-6 py-5">
          <div>
            <div className="text-xl font-semibold text-[var(--color-text-primary)]">直播刷题</div>
            <div className="mt-1 text-sm text-[var(--color-text-muted)]">
              老师端是题目、直播、回放、讲义、答疑总结、刷题报告和作业批改的统一数据源。
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            关闭
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[260px] shrink-0 border-r border-[var(--color-border)] bg-white px-5 py-5">
            <div className="space-y-3">
              {TAB_META.map((tab) => (
                <WorkspaceTabButton
                  key={tab.key}
                  active={activeTab === tab.key}
                  label={tab.label}
                  hint={tab.hint}
                  onClick={() => setActiveTab(tab.key)}
                />
              ))}
            </div>
          </aside>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {(bannerMessage || errorMessage) && (
              <div
                className={[
                  'mb-5 rounded-2xl border px-4 py-3 text-sm',
                  errorMessage
                    ? 'border-red-200 bg-red-50 text-red-600'
                    : 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]',
                ].join(' ')}
              >
                {errorMessage || bannerMessage}
              </div>
            )}

            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="已选学生" value={selectedStudentIds.length} hint="本周发布范围" />
              <SummaryCard label="已上传资源" value={getResourceCount(publishDraft)} hint="题目 / 讲义 / 总结 / 报告" />
              <SummaryCard label="历史记录" value={historyRecords.length} hint="每周发布沉淀" />
              <SummaryCard label="已处理作业" value={`${reviewedCount}/${homeworkRecords.length}`} hint={`已发送 ${sentCount}`} />
            </div>

            {activeTab === 'publish' && (
              <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <SectionCard title="本周发布信息" desc="先定义周次、卡点、时间和链接，再统一发布给学生。">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">周次</div>
                      <input
                        value={publishDraft.weekLabel}
                        onChange={(event) => updatePublishDraft('weekLabel', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">标题</div>
                      <input
                        value={publishDraft.title}
                        onChange={(event) => updatePublishDraft('title', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">卡点名称</div>
                      <input
                        value={publishDraft.pointName}
                        onChange={(event) => updatePublishDraft('pointName', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">直播日期</div>
                      <input
                        type="date"
                        value={publishDraft.liveDate}
                        onChange={(event) => updatePublishDraft('liveDate', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">直播时间</div>
                      <input
                        type="time"
                        value={publishDraft.liveTime}
                        onChange={(event) => updatePublishDraft('liveTime', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">截止日期</div>
                      <input
                        type="date"
                        value={publishDraft.dueDate}
                        onChange={(event) => updatePublishDraft('dueDate', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">截止时间</div>
                      <input
                        type="time"
                        value={publishDraft.dueTime}
                        onChange={(event) => updatePublishDraft('dueTime', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">直播链接</div>
                      <input
                        value={publishDraft.liveLink}
                        onChange={(event) => updatePublishDraft('liveLink', event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">回放链接</div>
                      <input
                        value={publishDraft.replayLink}
                        onChange={(event) => updatePublishDraft('replayLink', event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">备注</div>
                      <textarea
                        value={publishDraft.notes}
                        onChange={(event) => updatePublishDraft('notes', event.target.value)}
                        className="min-h-[96px] w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard title="资源上传" desc="这里上传的资源会一一映射到学生端刷题流程。">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FileCard
                      title="上传题目"
                      subtitle="学生端节点：题目"
                      resource={publishDraft.question}
                      uploading={uploadingMap.question}
                      onPick={() => questionInputRef.current?.click()}
                      onPreview={() => openExternalLink(publishDraft.question?.url || '')}
                    />
                    <FileCard
                      title="上传讲义"
                      subtitle="学生端节点：讲义"
                      resource={publishDraft.handout}
                      uploading={uploadingMap.handout}
                      onPick={() => handoutInputRef.current?.click()}
                      onPreview={() => openExternalLink(publishDraft.handout?.url || '')}
                    />
                    <FileCard
                      title="上传答疑总结"
                      subtitle="学生端节点：答疑总结"
                      resource={publishDraft.qaSummary}
                      uploading={uploadingMap.qaSummary}
                      onPick={() => summaryInputRef.current?.click()}
                      onPreview={() => openExternalLink(publishDraft.qaSummary?.url || '')}
                    />
                    <FileCard
                      title="上传刷题报告"
                      subtitle="学生端节点：刷题报告"
                      resource={publishDraft.report}
                      uploading={uploadingMap.report}
                      onPick={() => reportInputRef.current?.click()}
                      onPreview={() => openExternalLink(publishDraft.report?.url || '')}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="适用学生" desc="老师一周发布一次，但可以同时分配给多名学生。">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={selectAllStudents}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={clearStudents}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      清空
                    </button>
                    <button
                      type="button"
                      onClick={syncScheduleFromPublish}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      同步日程表单
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableStudents.map((student) => {
                      const active = selectedStudentIds.includes(student.id)
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => toggleStudent(student.id)}
                          className={[
                            'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                            active
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                              : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]',
                          ].join(' ')}
                        >
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ backgroundColor: student.color }}
                          >
                            {student.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{student.name}</div>
                            <div className="mt-1 text-xs text-[var(--color-text-muted)]">{student.grade} 璺?{student.subject}</div>
                          </div>
                          <span className="text-xs font-semibold text-[var(--color-primary)]">
                            {active ? '已选择' : '选择'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </SectionCard>

                <SectionCard
                  title="发布预览"
                  desc="学生端按顺序读取：题目 -> 上传作业 -> AI批改 -> 去上课 -> 去回顾 -> 讲义 -> 答疑总结 -> 刷题报告。"
                  action={(
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={publishBusy}
                      className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {publishBusy ? '发布中...' : '发布'}
                    </button>
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--color-page-bg)] p-4">
                      <div className="text-xs text-[var(--color-text-muted)]">直播时间</div>
                      <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        {toDisplayLabel(formatDateTime(publishDraft.liveDate, publishDraft.liveTime))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-[var(--color-page-bg)] p-4">
                      <div className="text-xs text-[var(--color-text-muted)]">作业截止</div>
                      <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                        {toDisplayLabel(formatDateTime(publishDraft.dueDate, publishDraft.dueTime))}
                      </div>
                    </div>
                    {[
                      ['题目', getResourceLabel(publishDraft.question)],
                      ['讲义', getResourceLabel(publishDraft.handout)],
                      ['答疑总结', getResourceLabel(publishDraft.qaSummary)],
                      ['刷题报告', getResourceLabel(publishDraft.report)],
                      ['直播链接', publishDraft.liveLink || '未设置'],
                      ['回放链接', publishDraft.replayLink || '未设置'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
                        <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                        <div className="mt-2 truncate text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <SectionCard title="日程表单" desc="维护本次直播时间和作业截止时间。">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">周次</div>
                      <input
                        value={scheduleDraft.weekLabel}
                        onChange={(event) => updateScheduleDraft('weekLabel', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">标题</div>
                      <input
                        value={scheduleDraft.title}
                        onChange={(event) => updateScheduleDraft('title', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">直播日期</div>
                      <input
                        type="date"
                        value={scheduleDraft.liveDate}
                        onChange={(event) => updateScheduleDraft('liveDate', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">直播时间</div>
                      <input
                        type="time"
                        value={scheduleDraft.liveTime}
                        onChange={(event) => updateScheduleDraft('liveTime', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">截止日期</div>
                      <input
                        type="date"
                        value={scheduleDraft.dueDate}
                        onChange={(event) => updateScheduleDraft('dueDate', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">截止时间</div>
                      <input
                        type="time"
                        value={scheduleDraft.dueTime}
                        onChange={(event) => updateScheduleDraft('dueTime', event.target.value)}
                        className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">备注</div>
                      <textarea
                        value={scheduleDraft.remark}
                        onChange={(event) => updateScheduleDraft('remark', event.target.value)}
                        className="min-h-[90px] w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={syncScheduleFromPublish}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      复制本周发布信息
                    </button>
                    <button
                      type="button"
                      onClick={addScheduleItem}
                      className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                    >
                      加入日程
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="日程列表" desc="这些条目会进入发布历史，也会驱动学生端日程数据。">
                  <div className="space-y-3">
                    {schedulePreview.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-page-bg)] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.weekLabel} · {item.title}</div>
                            <div className="mt-2 text-xs text-[var(--color-text-muted)]">直播：{toDisplayLabel(item.liveAt)}</div>
                            <div className="mt-1 text-xs text-[var(--color-text-muted)]">截止：{toDisplayLabel(item.dueAt)}</div>
                            <div className="mt-2 text-xs text-[var(--color-text-secondary)]">{item.remark || '暂无备注'}</div>
                          </div>
                          <div className="text-right">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                              {getScheduleStatusLabel(item.status)}
                            </span>
                            <div className="mt-3 text-xs text-[var(--color-text-muted)]">学生 {item.assignedCount} 人</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="grid gap-5 xl:grid-cols-[0.95fr_1.15fr]">
                <SectionCard
                  title="历史周次"
                  desc="每周发布的直播刷题会沉淀在这里，方便复用和回看。"
                  action={(
                    <button
                      type="button"
                      onClick={() => void loadHistory()}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      刷新
                    </button>
                  )}
                >
                  {historyLoading ? (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">正在加载历史数据...</div>
                  ) : historyRecords.length > 0 ? (
                    <div className="space-y-3">
                      {historyRecords.map((record) => (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => setSelectedHistoryId(record.id)}
                          className={[
                            'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                            selectedHistory?.id === record.id
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                              : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]',
                          ].join(' ')}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{record.weekLabel}</div>
                              <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{record.title}</div>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                              {record.assignedCount} 人
                            </span>
                          </div>
                          <div className="mt-3 text-xs text-[var(--color-text-muted)]">发布时间：{toDisplayLabel(record.publishedAt)}</div>
                          <div className="mt-1 text-xs text-[var(--color-text-muted)]">直播时间：{toDisplayLabel(record.liveAt)}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">暂时还没有发布历史。</div>
                  )}
                </SectionCard>

                <SectionCard title="历史详情" desc="查看这一周的文件、链接和分配学生。">
                  {selectedHistory ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[var(--color-page-bg)] p-4">
                        <div className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedHistory.weekLabel} · {selectedHistory.title}</div>
                        <div className="mt-2 text-sm text-[var(--color-text-secondary)]">卡点：{selectedHistory.pointName || '未设置'}</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-xl bg-white px-3 py-3 text-xs text-[var(--color-text-muted)]">发布时间：{toDisplayLabel(selectedHistory.publishedAt)}</div>
                          <div className="rounded-xl bg-white px-3 py-3 text-xs text-[var(--color-text-muted)]">直播时间：{toDisplayLabel(selectedHistory.liveAt)}</div>
                          <div className="rounded-xl bg-white px-3 py-3 text-xs text-[var(--color-text-muted)]">截止时间：{toDisplayLabel(selectedHistory.dueAt)}</div>
                        </div>
                        {!!selectedHistory.notes && (
                          <div className="mt-3 rounded-xl bg-white px-3 py-3 text-xs leading-6 text-[var(--color-text-secondary)]">
                            备注：{selectedHistory.notes}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          ['题目', selectedHistory.resources.question?.fileName || '未上传'],
                          ['讲义', selectedHistory.resources.handout?.fileName || '未上传'],
                          ['答疑总结', selectedHistory.resources.qaSummary?.fileName || '未上传'],
                          ['刷题报告', selectedHistory.resources.report?.fileName || '未上传'],
                          ['直播链接', selectedHistory.resources.liveLink || '未设置'],
                          ['回放链接', selectedHistory.resources.replayLink || '未设置'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3">
                            <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                            <div className="mt-2 truncate text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => openExternalLink(selectedHistory.resources.question?.url || '')}
                          disabled={!selectedHistory.resources.question?.url}
                          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          预览题目
                        </button>
                        <button
                          type="button"
                          onClick={() => openExternalLink(selectedHistory.resources.handout?.url || '')}
                          disabled={!selectedHistory.resources.handout?.url}
                          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          预览讲义
                        </button>
                        <button
                          type="button"
                          onClick={() => openExternalLink(selectedHistory.resources.qaSummary?.url || '')}
                          disabled={!selectedHistory.resources.qaSummary?.url}
                          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          预览答疑总结
                        </button>
                        <button
                          type="button"
                          onClick={() => openExternalLink(selectedHistory.resources.report?.url || '')}
                          disabled={!selectedHistory.resources.report?.url}
                          className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          预览刷题报告
                        </button>
                      </div>

                      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">分配学生</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedHistory.studentNames.map((name) => (
                            <span key={name} className="rounded-full bg-[var(--color-page-bg)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">日程安排</div>
                        <div className="mt-3 space-y-3">
                          {selectedHistory.scheduleItems.length > 0 ? selectedHistory.scheduleItems.map((item) => (
                            <div key={item.id} className="rounded-xl bg-[var(--color-page-bg)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                              {item.weekLabel} · {item.title} · 直播 {toDisplayLabel(item.liveAt)} · 截止 {toDisplayLabel(item.dueAt)}
                            </div>
                          )) : (
                            <div className="rounded-xl bg-[var(--color-page-bg)] px-4 py-3 text-sm text-[var(--color-text-muted)]">暂无日程条目。</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">当前没有可查看的历史记录。</div>
                  )}
                </SectionCard>
              </div>
            )}

            {activeTab === 'homework' && (
              <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <SectionCard
                  title="作业列表"
                  desc="读取直播刷题提交、AI节点状态和老师批改结果。"
                  action={(
                    <button
                      type="button"
                      onClick={() => void loadHomeworks()}
                      className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                    >
                      刷新
                    </button>
                  )}
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    {[
                      ['all', '全部'],
                      ['pending', '待处理'],
                      ['reviewed', '已暂存'],
                      ['sent', '已发送'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setHomeworkFilter(key as HomeworkFilter)}
                        className={[
                          'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                          homeworkFilter === key
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-page-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {homeworkLoading ? (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">正在加载作业数据...</div>
                  ) : filteredHomework.length > 0 ? (
                    <div className="space-y-3">
                      {filteredHomework.map((record) => {
                        const status = getHomeworkStatus(record, homeworkDrafts[record.id])
                        const active = selectedHomework?.id === record.id
                        return (
                          <button
                            key={record.id}
                            type="button"
                            onClick={() => setSelectedHomeworkId(record.id)}
                            className={[
                              'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                              active
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-[var(--color-text-primary)]">{record.studentName}</div>
                                <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{record.pointName || '未设置卡点'} · {record.fileName}</div>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                                {getHomeworkStatusLabel(status)}
                              </span>
                            </div>
                            <div className="mt-3 text-xs text-[var(--color-text-muted)]">提交时间：{toDisplayLabel(record.submittedAt)}</div>
                            <div className="mt-1 text-xs text-[var(--color-text-muted)]">AI 节点：{record.aiDone ? '已完成' : '未完成'}</div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">当前筛选下没有作业。</div>
                  )}
                </SectionCard>

                <SectionCard title="作业详情" desc="打开原始作业、上传批改版 PDF、暂存草稿并发送给学生。">
                  {selectedHomework && selectedHomeworkDraft ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[var(--color-page-bg)] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold text-[var(--color-text-primary)]">{selectedHomework.studentName}</div>
                            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{selectedHomework.grade} · {selectedHomework.subject} · {selectedHomework.pointName || '未设置卡点'}</div>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)]">
                            {getHomeworkStatusLabel(getHomeworkStatus(selectedHomework, selectedHomeworkDraft))}
                          </span>
                        </div>
                        <div className="mt-3 text-sm text-[var(--color-text-secondary)]">{selectedHomework.fileName}</div>
                        <div className="mt-2 text-xs text-[var(--color-text-muted)]">提交于 {toDisplayLabel(selectedHomework.submittedAt)}</div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                          <div className="text-sm font-semibold text-[var(--color-text-primary)]">学生作业</div>
                          <div className="mt-3 rounded-xl bg-[var(--color-page-bg)] px-3 py-3 text-xs text-[var(--color-text-secondary)]">
                            {selectedHomework.fileName}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => void previewSubmission(selectedHomework.id)}
                              className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]"
                            >
                              打开原始作业
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewFileInputRef.current?.click()}
                              className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                            >
                              上传批改版 PDF
                            </button>
                          </div>
                          <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                            批改文件：{selectedHomeworkDraft!.reviewFileName || '未上传'}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-[var(--color-text-primary)]">AI / 系统状态</div>
                            <span className="rounded-full bg-[var(--color-primary-light)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                              {selectedHomework.aiDone ? 'AI 节点已到达' : 'AI 节点未到达'}
                            </span>
                          </div>
                          <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                            <div className="rounded-xl bg-[var(--color-page-bg)] px-3 py-3">
                              学生 AI 环节：{selectedHomework.aiDone ? '已完成' : '未完成'}
                            </div>
                            <div className="rounded-xl bg-[var(--color-page-bg)] px-3 py-3">
                              当前结果状态：{selectedHomeworkAiResult?.status || (selectedHomework.graded ? 'reviewed' : 'pending_review')}
                            </div>
                            <div className="rounded-xl bg-[var(--color-page-bg)] px-3 py-3">
                              当前分数：{selectedHomeworkAiResult?.score ?? selectedHomework.score ?? '未设置'}
                            </div>
                            <div className="rounded-xl bg-[var(--color-page-bg)] px-3 py-3">
                              当前评语：{selectedHomeworkAiResult?.feedback || selectedHomework.feedback || '暂无'}
                            </div>
                            <div className="rounded-xl bg-[var(--color-page-bg)] px-3 py-3">
                              批改文件记录：{selectedHomeworkAiResult?.reviewedFileName || selectedHomework.reviewedFileName || '暂无'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">老师批改</div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[180px_1fr]">
                          <label className="block" style={{ display: 'none' }}>
                            <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">分数</div>
                            <input
                              value={selectedHomeworkDraft!.score}
                              onChange={(event) => updateHomeworkDraft(selectedHomework.id, { score: event.target.value, localStatus: 'reviewed' })}
                              placeholder="可选"
                              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                            />
                          </label>
                          <div className="rounded-xl bg-[var(--color-page-bg)] px-4 py-3 text-xs leading-6 text-[var(--color-text-secondary)]">
                            最终“发给学生”会调用现有批改接口：
                            先上传批改版 PDF，再把分数和评语写回学生端刷题流程。
                          </div>
                        </div>
                        <label className="mt-4 block" style={{ display: 'none' }}>
                          <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">老师评语</div>
                          <textarea
                            value={selectedHomeworkDraft!.teacherComment}
                            onChange={(event) => updateHomeworkDraft(selectedHomework.id, { teacherComment: event.target.value, localStatus: 'reviewed' })}
                            className="min-h-[140px] w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                          />
                        </label>
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="text-xs text-[var(--color-text-muted)]">
                            最近暂存：{selectedHomeworkDraft!.savedAt || '无'}
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => saveHomeworkReview(selectedHomework.id)}
                              disabled={homeworkBusyId === selectedHomework.id}
                              className="rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              暂存草稿
                            </button>
                            <button
                              type="button"
                              onClick={() => void sendHomeworkReview(selectedHomework)}
                              disabled={homeworkBusyId === selectedHomework.id}
                              className="rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {homeworkBusyId === selectedHomework.id ? '发送中...' : '发给学生'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">当前没有可查看的作业。</div>
                  )}
                </SectionCard>
              </div>
            )}
          </div>
        </div>

        <input
          ref={questionInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void uploadFieldFile('question', event.target.files?.[0] || null)
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={handoutInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void uploadFieldFile('handout', event.target.files?.[0] || null)
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={summaryInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void uploadFieldFile('qaSummary', event.target.files?.[0] || null)
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={reportInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="hidden"
          onChange={(event) => {
            void uploadFieldFile('report', event.target.files?.[0] || null)
            event.currentTarget.value = ''
          }}
        />
        <input
          ref={reviewFileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] || null
            if (selectedHomework && file) {
              updateHomeworkDraft(selectedHomework.id, {
                reviewFile: file,
                reviewFileName: file.name,
                localStatus: 'reviewed',
              })
              setBannerMessage(`${file.name} selected and ready to upload`)
            }
            event.currentTarget.value = ''
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
