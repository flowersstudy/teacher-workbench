import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { fetchStudentReviewOverview, type ReviewOverview, type ReviewPointStatus } from '../../api/reviewOverview'
import { ReviewOverviewModal } from './ReviewOverviewModal'
import type { ComplaintRecord, QuestionAnswer, StudentDetailMeta, StudentInfoItem, StudentItem, TaskListItem } from '../../types'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { ComplaintModal } from '../LeftPanel/ComplaintModal'
import { LearningPathPanel } from './LearningPathPanel'
import { api } from '../../../../lib/api'

function formatDateTime(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return format(date, 'yyyy-MM-dd HH:mm')
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return format(date, 'yyyy-MM-dd')
}

function formatNumericValue(value?: number | null, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }

  return `${Number(value)}${suffix}`
}

type TeamRoleKey = 'coach' | 'diagnosis' | 'manager'
type TeamTeacherOption = {
  id: string
  name: string
  title?: string
  role?: string
  roleLabel?: string
}

const TEAM_ROLE_CONFIG: Array<{ key: TeamRoleKey; label: string }> = [
  { key: 'coach', label: '带教老师' },
  { key: 'diagnosis', label: '诊断老师' },
  { key: 'manager', label: '学管老师' },
]

function normalizeTeamRoleKey(role?: string | null): TeamRoleKey | '' {
  const safeRole = String(role || '')
  if (safeRole === 'coach' || safeRole.includes('带教')) return 'coach'
  if (safeRole === 'diagnosis' || safeRole.includes('诊断')) return 'diagnosis'
  if (safeRole === 'manager' || safeRole.includes('学管')) return 'manager'
  return ''
}

function Section({
  title,
  extra,
  children,
}: {
  title: string
  extra?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {extra}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function MetaGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-[var(--color-bg-left)] px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)]">{item.label}</div>
          <div className="mt-1 text-sm text-[var(--color-text-primary)]">{item.value || '-'}</div>
        </div>
      ))}
    </div>
  )
}

function StudentInfoCard({
  item,
  onDelete,
}: {
  item: StudentInfoItem
  onDelete: () => void
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-[var(--color-text-primary)]">
            {item.authorName || '老师'}
          </div>
          <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
            {formatDateTime(item.createdAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] transition-colors hover:border-red-300 hover:text-red-500"
        >
          删除
        </button>
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-primary)]">
        {item.content}
      </div>
    </div>
  )
}

function SubmissionCard({ answer }: { answer: QuestionAnswer }) {
  const reviewed = answer.status === 'reviewed'

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {answer.questionTitle || '作答记录'}
          </div>
          <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
            {formatDateTime(answer.submittedAt)}
          </div>
        </div>
        <span
          className={[
            'rounded-full px-2 py-1 text-[10px] font-medium',
            reviewed ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600',
          ].join(' ')}
        >
          {reviewed ? '已批改' : '待批改'}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-[var(--color-bg-left)] px-3 py-2.5 text-xs leading-6 text-[var(--color-text-primary)]">
        {answer.studentAnswer}
      </div>

      {reviewed && (
        <div className="mt-3 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)] px-3 py-2.5">
          <div className="text-[10px] text-[var(--color-text-muted)]">
            分数 {answer.score ?? '-'} · {formatDateTime(answer.reviewedAt)}
          </div>
          <div className="mt-1 text-xs leading-6 text-[var(--color-text-primary)]">
            {answer.teacherComment || '暂无批语'}
          </div>
        </div>
      )}
    </div>
  )
}

function ComplaintCard({
  complaint,
  onResolve,
}: {
  complaint: ComplaintRecord
  onResolve: (note: string) => Promise<void>
}) {
  const [resolvedNote, setResolvedNote] = useState('')
  const isPending = complaint.status === 'pending'

  return (
    <div className="rounded-xl border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
          投诉记录
        </div>
        <span
          className={[
            'rounded-full px-2 py-1 text-[10px] font-medium',
            isPending ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600',
          ].join(' ')}
        >
          {isPending ? '待处理' : '已处理'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[var(--color-text-primary)]">
        <div><span className="text-[var(--color-text-muted)]">诉求：</span>{complaint.demand || '-'}</div>
        <div><span className="text-[var(--color-text-muted)]">原因：</span>{complaint.reason || '-'}</div>
        <div><span className="text-[var(--color-text-muted)]">建议：</span>{complaint.suggestion || '-'}</div>
        <div><span className="text-[var(--color-text-muted)]">截止：</span>{complaint.deadline || '-'}</div>
        <div><span className="text-[var(--color-text-muted)]">提交时间：</span>{formatDateTime(complaint.submittedAt)}</div>
      </div>

      {complaint.extraNote && (
        <div className="mt-3 rounded-xl bg-[var(--color-bg-left)] px-3 py-2.5 text-xs leading-6 text-[var(--color-text-primary)]">
          {complaint.extraNote}
        </div>
      )}

      {isPending ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={resolvedNote}
            onChange={(event) => setResolvedNote(event.target.value)}
            rows={3}
            placeholder="填写处理说明"
            className="w-full resize-none rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)]"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!resolvedNote.trim()}
              onClick={async () => {
                await onResolve(resolvedNote.trim())
                setResolvedNote('')
              }}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              标记已处理
            </button>
          </div>
        </div>
      ) : complaint.resolvedNote ? (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs leading-6 text-green-700">
          {complaint.resolvedNote}
        </div>
      ) : null}
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState<'info' | 'content'>('content')
  const [activeCheckpoint, setActiveCheckpoint] = useState('')
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [_reviewPointStatuses, setReviewPointStatuses] = useState<ReviewPointStatus[]>([])
  const [reviewOverviewData, setReviewOverviewData] = useState<ReviewOverview | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [infoDraft, setInfoDraft] = useState('')
  const [infoSaving, setInfoSaving] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [allCourses, setAllCourses] = useState<{ id: number; name: string; subject: string }[]>([])
  const [assigning, setAssigning] = useState(false)
  const [teamManagerOpen, setTeamManagerOpen] = useState(false)
  const [teamTeacherOptions, setTeamTeacherOptions] = useState<TeamTeacherOption[]>([])
  const [teamDraft, setTeamDraft] = useState<Record<TeamRoleKey, string>>({
    coach: '',
    diagnosis: '',
    manager: '',
  })
  const [teamSaving, setTeamSaving] = useState(false)

  const teacherName = useWorkbenchStore((state) => state.teacherName)
  const openAssignStudent = useWorkbenchStore((state) => state.openAssignStudent)
  const notesMap = useWorkbenchStore((state) => state.notesMap)
  const openNotes = useWorkbenchStore((state) => state.openNotes)
  const loadNotes = useWorkbenchStore((state) => state.loadNotes)
  const studentInfoMap = useWorkbenchStore((state) => state.studentInfoMap)
  const studentDetailMetaMap = useWorkbenchStore((state) => state.studentDetailMetaMap)
  const studentAnswersMap = useWorkbenchStore((state) => state.studentAnswersMap)
  const addStudentInfo = useWorkbenchStore((state) => state.addStudentInfo)
  const deleteStudentInfo = useWorkbenchStore((state) => state.deleteStudentInfo)
  const loadStudentInfo = useWorkbenchStore((state) => state.loadStudentInfo)
  const flaggedMap = useWorkbenchStore((state) => state.flaggedMap)
  const setStudentFlag = useWorkbenchStore((state) => state.setStudentFlag)
  const loadStudentFlag = useWorkbenchStore((state) => state.loadStudentFlag)
  const complaintsMap = useWorkbenchStore((state) => state.complaintsMap)
  const resolveComplaint = useWorkbenchStore((state) => state.resolveComplaint)

  const openAssignModal = useCallback(async () => {
    setAssignOpen(true)
    if (allCourses.length === 0) {
      const data = await api.get<{ id: number; name: string; subject: string }[]>('/api/teacher/courses')
      setAllCourses(data)
    }
  }, [allCourses.length])

  const assignCourse = useCallback(async (courseId: number) => {
    setAssigning(true)
    try {
      await api.post(`/api/teacher/students/${student.id}/courses`, { courseId })
      await loadStudentInfo(student.id)
      setAssignOpen(false)
    } finally {
      setAssigning(false)
    }
  }, [student.id, loadStudentInfo])

  useEffect(() => {
    void loadStudentInfo(student.id)
    void loadStudentFlag(student.id)
    if (student.contactId) {
      void loadNotes(student.contactId)
    }
  }, [student.contactId, student.id, loadNotes, loadStudentFlag, loadStudentInfo])

  useEffect(() => {
    let active = true

    fetchStudentReviewOverview(student.id)
      .then((result) => {
        if (active) {
          setReviewOverviewData(result)
          setReviewPointStatuses(Array.isArray(result.pointStatuses) ? result.pointStatuses : [])
        }
      })
      .catch(() => {
        if (active) {
          setReviewOverviewData(null)
          setReviewPointStatuses([])
        }
      })

    return () => {
      active = false
    }
  }, [student.id])

  const detailMeta = studentDetailMetaMap[student.id] as StudentDetailMeta | undefined
  const studentInfos = studentInfoMap[student.id] ?? []
  const answers = studentAnswersMap[student.id] ?? []
  const chatNotes = student.contactId ? (notesMap[student.contactId] ?? []) : []
  const complaints = complaintsMap[student.id] ?? []
  const isFlagged = flaggedMap[student.id] ?? false
  const learningPathPointName = useMemo(() => {
    const activeCourse = detailMeta?.courses?.find((course) => course.status !== 'completed')
      ?? detailMeta?.courses?.[0]
    return activeCourse?.name || student.subject || ''
  }, [detailMeta?.courses, student.subject])
  const checkpointTabs = detailMeta?.checkpoints ?? []
  const selectedCheckpoint = checkpointTabs.find((checkpoint) => checkpoint.name === activeCheckpoint) ?? null

  const profileItems = useMemo(() => ([
    { label: '入学日期', value: formatDateOnly(detailMeta?.joinDate) },
    { label: '累计课次', value: `${detailMeta?.sessionCount ?? 0}` },
    { label: '累计学时', value: `${detailMeta?.totalHours ?? 0}` },
    { label: '年级', value: detailMeta?.profile.grade || student.grade || '-' },
    { label: '性别', value: detailMeta?.profile.gender || '-' },
    { label: '家乡', value: detailMeta?.profile.hometown || '-' },
    { label: '备考状态', value: detailMeta?.profile.examStatus || '-' },
    { label: '考试时间', value: detailMeta?.profile.examDate || '-' },
    { label: '学历', value: detailMeta?.profile.education || '-' },
    { label: '专业', value: detailMeta?.profile.major || '-' },
  ]), [detailMeta, student.grade])
  const reviewArchiveItems = useMemo(() => {
    const progress = reviewOverviewData?.progress
    const entryScore = progress?.entryScore ?? null
    const currentScore = progress?.currentScore ?? null
    const latestDiagnosisScore = currentScore ?? entryScore
    const targetScore = progress?.targetScore ?? null
    const scoreGap = latestDiagnosisScore !== null && targetScore !== null
      ? Number(targetScore) - Number(latestDiagnosisScore)
      : null

    return [
      { label: '目标考试', value: String(reviewOverviewData?.targetExam || '').trim() || '-' },
      { label: '入学诊断分', value: formatNumericValue(entryScore, '分') },
      { label: '当前诊断分', value: formatNumericValue(latestDiagnosisScore, '分') },
      { label: '目标分', value: formatNumericValue(targetScore, '分') },
      { label: '提分差', value: formatNumericValue(scoreGap, '分') },
    ]
  }, [reviewOverviewData])
  const pointScoreItems = useMemo(() => (
    [...(reviewOverviewData?.pointRates ?? [])]
      .sort((left, right) => (left.sortOrder ?? 999) - (right.sortOrder ?? 999))
  ), [reviewOverviewData])

  const pendingCount = answers.filter((item) => item.status === 'pending').length
  const teamTeacherMap = useMemo(() => {
    const entries = (detailMeta?.teamTeachers ?? []).reduce((result, teacher) => {
      const roleKey = normalizeTeamRoleKey(teacher.role)
      if (roleKey && !result[roleKey]) {
        result[roleKey] = teacher
      }
      return result
    }, {} as Partial<Record<TeamRoleKey, StudentDetailMeta['teamTeachers'][number]>>)

    return entries
  }, [detailMeta?.teamTeachers])
  const teamTeacherOptionsByRole = useMemo(() => ({
    coach: teamTeacherOptions.filter((teacher) => normalizeTeamRoleKey(teacher.role) === 'coach'),
    diagnosis: teamTeacherOptions.filter((teacher) => normalizeTeamRoleKey(teacher.role) === 'diagnosis'),
    manager: teamTeacherOptions.filter((teacher) => normalizeTeamRoleKey(teacher.role) === 'manager'),
  }), [teamTeacherOptions])

  useEffect(() => {
    setActiveCheckpoint('')
  }, [student.id])

  useEffect(() => {
    if (checkpointTabs.length === 0) {
      setActiveCheckpoint('')
      return
    }

    setActiveCheckpoint((current) => {
      if (current && checkpointTabs.some((checkpoint) => checkpoint.name === current)) {
        return current
      }

      const preferred = checkpointTabs.find((checkpoint) => checkpoint.name === learningPathPointName && checkpoint.hasData)
        ?? checkpointTabs.find((checkpoint) => checkpoint.hasData)
        ?? checkpointTabs[0]

      return preferred?.name || ''
    })
  }, [checkpointTabs, learningPathPointName])

  async function handleAddInfo() {
    const text = infoDraft.trim()
    if (!text) return

    setInfoSaving(true)
    try {
      await addStudentInfo(student.id, teacherName || '老师', 'teacher', text)
      setInfoDraft('')
    } finally {
      setInfoSaving(false)
    }
  }

  async function openTeamManager() {
    setTeamDraft({
      coach: teamTeacherMap.coach?.id ?? '',
      diagnosis: teamTeacherMap.diagnosis?.id ?? '',
      manager: teamTeacherMap.manager?.id ?? '',
    })
    setTeamManagerOpen(true)

    if (teamTeacherOptions.length > 0) return
    const result = await api.get<{ list: TeamTeacherOption[] }>('/api/teacher/list')
    setTeamTeacherOptions(Array.isArray(result.list) ? result.list : [])
  }

  async function saveTeamTeachers() {
    if (teamSaving) return

    setTeamSaving(true)
    try {
      for (const role of TEAM_ROLE_CONFIG) {
        await api.put(`/api/teacher/students/${student.id}/team-members/${role.key}`, {
          teacherId: teamDraft[role.key] ? Number(teamDraft[role.key]) : 0,
        })
      }
      await loadStudentInfo(student.id)
      setTeamManagerOpen(false)
    } finally {
      setTeamSaving(false)
    }
  }

  function openCheckpointAssignModal(checkpointName: string) {
    const assignItem: TaskListItem = {
      id: `assign_student_${student.id}`,
      name: student.name,
      subtitle: `${student.grade} · ${student.subject}`,
      avatar: student.avatar,
      color: student.color,
      actionLabel: '分配任务',
      contactId: student.contactId,
      studentId: student.id,
      pointName: checkpointName,
      presetCheckpoints: [checkpointName],
      preferredTeacherId: teamTeacherMap.coach?.id ? String(teamTeacherMap.coach.id) : '',
    }
    openAssignStudent(assignItem)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          返回
        </button>

        <button
          type="button"
          disabled={!student.contactId || !onGoToChat}
          onClick={() => student.contactId && onGoToChat?.(student.contactId)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white disabled:cursor-default disabled:opacity-70"
          style={{ backgroundColor: student.color }}
          title={student.contactId ? '进入聊天' : undefined}
        >
          {student.avatar}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {student.name}
            </div>
            {isFlagged && (
              <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-500">
                重点关注
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {student.grade} · {student.subject}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void setStudentFlag(student.id, !isFlagged)}
          className={[
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            isFlagged
              ? 'border border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
              : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
          ].join(' ')}
        >
          {isFlagged ? '取消关注' : '标记关注'}
        </button>
      </div>

      <div className="flex border-b border-[var(--color-border)]">
        {[
          { key: 'content', label: `学习内容${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'info', label: '学习档案' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as 'info' | 'content')}
            className={[
              'flex-1 px-4 py-3 text-sm transition-colors',
              activeTab === tab.key
                ? 'border-b-2 border-[var(--color-primary)] font-semibold text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto bg-[var(--color-bg-left)] p-4">
        <div className="space-y-4">
          {activeTab === 'info' ? (
            <>
              <Section title="基础信息">
                <MetaGrid items={profileItems} />
              </Section>

              <Section
                title="诊断档案"
                extra={(
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    录入分数
                  </button>
                )}
              >
                <div className="space-y-4">
                  <MetaGrid items={reviewArchiveItems} />
                  {pointScoreItems.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {pointScoreItems.map((item) => (
                        <div
                          key={`${item.pointName}_${item.sortOrder ?? 0}`}
                          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-3"
                        >
                          <div className="text-xs font-medium text-[var(--color-text-primary)]">
                            {item.pointName}
                          </div>
                          <div className="mt-2 text-[11px] text-[var(--color-text-secondary)]">
                            当前 {formatNumericValue(item.currentRate, '%')} · 目标 {formatNumericValue(item.targetRate, '%')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      暂无诊断卡点分数，老师录入后会同步到学生复盘页和学习档案。
                    </div>
                  )}
                </div>
              </Section>

              <Section
                title="团队老师"
                extra={(
                  <button
                    type="button"
                    onClick={() => void openTeamManager()}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    管理团队老师
                  </button>
                )}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {TEAM_ROLE_CONFIG.map((role) => {
                    const teacher = teamTeacherMap[role.key]
                    return (
                      <div
                        key={role.key}
                        className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-3"
                      >
                        <div className="text-[10px] text-[var(--color-text-muted)]">{role.label}</div>
                        {teacher ? (
                          <button
                            type="button"
                            onClick={() => onTeacherClick(teacher.name)}
                            className="mt-2 text-left"
                          >
                            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{teacher.name}</div>
                            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{teacher.title || teacher.role || '-'}</div>
                          </button>
                        ) : (
                          <div className="mt-2 text-xs text-[var(--color-text-muted)]">未设置</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Section>

              {teamManagerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setTeamManagerOpen(false)}>
                  <div className="w-[420px] rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
                    <div className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">管理团队老师</div>
                    <div className="space-y-4">
                      {TEAM_ROLE_CONFIG.map((role) => (
                        <label key={role.key} className="block">
                          <div className="mb-1 text-xs font-medium text-[var(--color-text-secondary)]">{role.label}</div>
                          <select
                            value={teamDraft[role.key]}
                            onChange={(event) => setTeamDraft((prev) => ({ ...prev, [role.key]: event.target.value }))}
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                          >
                            <option value="">不设置</option>
                            {teamTeacherOptionsByRole[role.key].map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.name}{teacher.title ? ` · ${teacher.title}` : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setTeamManagerOpen(false)}
                        className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        disabled={teamSaving}
                        onClick={() => void saveTeamTeachers()}
                        className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {teamSaving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <Section
                title="课程进度"
                extra={
                  <button
                    type="button"
                    onClick={() => void openAssignModal()}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    + 分配课程
                  </button>
                }
              >
                {detailMeta?.courses?.length ? (
                  <div className="space-y-3">
                    {detailMeta.courses.map((course) => (
                      <div key={course.id} className="rounded-xl border border-[var(--color-border)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{course.name}</div>
                            <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{course.subject}</div>
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">{course.progress}%</div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-bg-left)]">
                          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max(0, Math.min(100, course.progress))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">暂无课程进度</div>
                )}
              </Section>

              {assignOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAssignOpen(false)}>
                  <div className="w-80 rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">选择要分配的课程</div>
                    {allCourses.length === 0 ? (
                      <div className="text-xs text-[var(--color-text-muted)]">加载中...</div>
                    ) : (
                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {allCourses
                          .filter((c) => !detailMeta?.courses?.some((sc) => String(sc.id) === String(c.id)))
                          .map((course) => (
                            <button
                              key={course.id}
                              type="button"
                              disabled={assigning}
                              onClick={() => void assignCourse(course.id)}
                              className="w-full rounded-xl border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-left)] disabled:opacity-50"
                            >
                              <div className="text-sm font-medium text-[var(--color-text-primary)]">{course.name}</div>
                              <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{course.subject}</div>
                            </button>
                          ))}
                        {allCourses.filter((c) => !detailMeta?.courses?.some((sc) => String(sc.id) === String(c.id))).length === 0 && (
                          <div className="text-xs text-[var(--color-text-muted)]">该学生已分配所有课程</div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setAssignOpen(false)}
                      className="mt-4 w-full rounded-xl border border-[var(--color-border)] py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <Section
                title="老师备注"
                extra={student.contactId ? (
                  <button
                    type="button"
                    onClick={() => openNotes(student.contactId!)}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    打开全部对话备注
                  </button>
                ) : undefined}
              >
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--color-border)] p-3">
                    <textarea
                      value={infoDraft}
                      onChange={(event) => setInfoDraft(event.target.value)}
                      rows={3}
                      placeholder="补充学生学习情况、沟通记录或风险点"
                      className="w-full resize-none rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={!infoDraft.trim() || infoSaving}
                        onClick={() => void handleAddInfo()}
                        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        添加备注
                      </button>
                    </div>
                  </div>

                  {studentInfos.length ? (
                    studentInfos.map((item) => (
                      <StudentInfoCard
                        key={item.id}
                        item={item}
                        onDelete={() => void deleteStudentInfo(student.id, item.id)}
                      />
                    ))
                  ) : (
                    <div className="text-xs text-[var(--color-text-muted)]">暂无老师备注</div>
                  )}

                  {chatNotes.length > 0 && (
                    <div className="rounded-xl border border-[var(--color-border)] p-3">
                      <div className="text-sm font-semibold text-[var(--color-text-primary)]">聊天备注</div>
                      <div className="mt-3 space-y-2">
                        {chatNotes.slice(-3).reverse().map((note) => (
                          <div key={note.id} className="rounded-xl bg-[var(--color-bg-left)] px-3 py-2.5">
                            <div className="text-[10px] text-[var(--color-text-muted)]">
                              {note.authorName} · {formatDateTime(note.createdAt)}
                            </div>
                            <div className="mt-1 text-xs leading-6 text-[var(--color-text-primary)]">
                              {note.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section
                title="投诉处理"
                extra={(
                  <button
                    type="button"
                    onClick={() => setShowComplaintModal(true)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    新建投诉
                  </button>
                )}
              >
                {complaints.length ? (
                  <div className="space-y-3">
                    {complaints.map((complaint) => (
                      <ComplaintCard
                        key={complaint.id}
                        complaint={complaint}
                        onResolve={(note) => resolveComplaint(student.id, complaint.id, note)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">暂无投诉记录</div>
                )}
              </Section>
            </>
          ) : (
            <>
              <Section title="卡点学习状态">
                {checkpointTabs.length ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {checkpointTabs.map((checkpoint) => {
                        const isActive = checkpoint.name === activeCheckpoint

                        return (
                          <button
                            key={checkpoint.name}
                            type="button"
                            onClick={() => setActiveCheckpoint(checkpoint.name)}
                            className={[
                              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                              isActive
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                                : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)]',
                            ].join(' ')}
                          >
                            {checkpoint.name}
                          </button>
                        )
                      })}
                    </div>

                    {selectedCheckpoint ? (
                      selectedCheckpoint.hasData ? (
                        <LearningPathPanel studentId={student.id} pointName={selectedCheckpoint.name} />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-8 text-center">
                          <div className="text-sm text-[var(--color-text-muted)]">
                            该卡点暂未分配学习任务，分配后这里会显示该卡点下老师布置的完整学习内容和完成状态。
                          </div>
                          <button
                            type="button"
                            onClick={() => openCheckpointAssignModal(selectedCheckpoint.name)}
                            className="mt-4 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                          >
                            分配这个卡点
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                        请选择一个卡点查看学习任务。
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">暂无卡点学习数据</div>
                )}
              </Section>

              <Section title="作业与提交">
                {answers.length ? (
                  <div className="space-y-3">
                    {answers.map((answer) => (
                      <SubmissionCard key={answer.id} answer={answer} />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">暂无提交记录</div>
                )}
              </Section>
            </>
          )}
        </div>
      </div>

      {showComplaintModal && (
        <ComplaintModal student={student} onClose={() => setShowComplaintModal(false)} />
      )}

      {showReviewModal && (
        <ReviewOverviewModal
          studentId={student.id}
          initialData={reviewOverviewData}
          onClose={() => setShowReviewModal(false)}
          onSaved={(data) => {
            setReviewOverviewData(data)
            setReviewPointStatuses(Array.isArray(data.pointStatuses) ? data.pointStatuses : [])
          }}
        />
      )}
    </div>
  )
}
