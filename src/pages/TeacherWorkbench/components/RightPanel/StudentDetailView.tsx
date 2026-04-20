import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { fetchStudentReviewOverview, type ReviewPointStatus } from '../../api/reviewOverview'
import type { ComplaintRecord, QuestionAnswer, StudentDetailMeta, StudentInfoItem, StudentItem } from '../../types'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { ComplaintModal } from '../LeftPanel/ComplaintModal'
import { LearningPathPanel } from './LearningPathPanel'

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

function ReviewStatusBadge({ status }: { status: ReviewPointStatus['status'] }) {
  const config = {
    learning: { label: '学习中', cls: 'border-blue-200 bg-blue-50 text-blue-600' },
    completed: { label: '已完成', cls: 'border-green-200 bg-green-50 text-green-600' },
    pending: { label: '待推进', cls: 'border-orange-200 bg-orange-50 text-orange-600' },
    locked: { label: '未开始', cls: 'border-gray-200 bg-gray-50 text-gray-500' },
  }[status]

  return (
    <span className={['rounded-full border px-2 py-1 text-[10px] font-medium', config.cls].join(' ')}>
      {config.label}
    </span>
  )
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
  const [activeTab, setActiveTab] = useState<'info' | 'content'>('info')
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [reviewPointStatuses, setReviewPointStatuses] = useState<ReviewPointStatus[]>([])
  const [infoDraft, setInfoDraft] = useState('')
  const [infoSaving, setInfoSaving] = useState(false)

  const teacherName = useWorkbenchStore((state) => state.teacherName)
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
          setReviewPointStatuses(Array.isArray(result.pointStatuses) ? result.pointStatuses : [])
        }
      })
      .catch(() => {
        if (active) {
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

  const pendingCount = answers.filter((item) => item.status === 'pending').length

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
          { key: 'info', label: '学习档案' },
          { key: 'content', label: `学习内容${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
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

              <Section title="团队老师">
                {detailMeta?.teamTeachers?.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {detailMeta.teamTeachers.map((teacher) => (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => onTeacherClick(teacher.name)}
                        className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-3 text-left transition-colors hover:border-[var(--color-primary)]"
                      >
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{teacher.name}</div>
                        <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{teacher.role || '-'}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">暂无团队老师信息</div>
                )}
              </Section>

              <Section title="课程进度">
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
              <LearningPathPanel studentId={student.id} pointName={student.subject} />

              <Section title="复盘知识点状态">
                {reviewPointStatuses.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {reviewPointStatuses.map((item, index) => (
                      <div key={`${item.pointId ?? 'point'}-${index}`} className="rounded-xl border border-[var(--color-border)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-[var(--color-text-primary)]">{item.pointName}</div>
                          <ReviewStatusBadge status={item.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">暂无复盘知识点状态</div>
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
    </div>
  )
}
