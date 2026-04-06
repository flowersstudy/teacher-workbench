import { myDiagnosisStudents, myTeachingStudents, studentDetails, teacherNameToContactId, teacherProfiles } from '../../mock/workbenchMock'
import type { StudentItem } from '../../mock/workbenchMock'

const allStudents = [...myTeachingStudents, ...myDiagnosisStudents]

const statusConfig = {
  normal:  { label: '正常',   cls: 'bg-green-100 text-green-600' },
  warning: { label: '异常',   cls: 'bg-red-100 text-red-500' },
  new:     { label: '新学员', cls: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
  leave:   { label: '已请假', cls: 'bg-gray-100 text-gray-500' },
}

function MiniStudentCard({ student, onClick }: { student: StudentItem; onClick: () => void }) {
  const s = statusConfig[student.status]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-3 py-2.5 text-left hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: student.color }}
      >
        {student.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-primary)]">{student.name}</span>
          <span className={['rounded-full px-1.5 py-0.5 text-[9px] font-medium', s.cls].join(' ')}>{s.label}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
          {student.grade} · {student.subject} · 最近上课 {student.lastSession}
        </div>
      </div>
      <svg className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

function Section({ title, students, onStudentClick }: { title: string; students: StudentItem[]; onStudentClick: (s: StudentItem) => void }) {
  if (students.length === 0) return null
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{title}</span>
        <span className="rounded-full bg-[var(--color-bg-left)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">{students.length} 人</span>
      </div>
      <div className="space-y-1.5">
        {students.map((s) => (
          <MiniStudentCard key={s.id} student={s} onClick={() => onStudentClick(s)} />
        ))}
      </div>
    </div>
  )
}

export function TeacherProfileView({
  teacherName,
  onBack,
  onStudentClick,
  onGoToChat,
}: {
  teacherName: string
  onBack: () => void
  onStudentClick: (student: StudentItem) => void
  onGoToChat?: (contactId: string) => void
}) {
  const profile = teacherProfiles[teacherName]

  // Derive students by role for this teacher
  const teachingStudents = allStudents.filter((s) =>
    studentDetails[s.id]?.teachers.some((t) => t.name === teacherName && t.role === '带教老师')
  )
  const diagnosisStudents = allStudents.filter((s) =>
    studentDetails[s.id]?.teachers.some((t) => t.name === teacherName && t.role === '诊断老师')
  )

  const avatarColor = profile?.color ?? '#888'
  const totalStudents = new Set([...teachingStudents, ...diagnosisStudents].map((s) => s.id)).size
  const teacherContactId = teacherNameToContactId[teacherName]

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
          title={teacherContactId ? '进入对话框' : undefined}
          disabled={!teacherContactId || !onGoToChat}
          onClick={() => teacherContactId && onGoToChat?.(teacherContactId)}
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white transition-opacity',
            teacherContactId && onGoToChat ? 'cursor-pointer hover:opacity-80 ring-2 ring-offset-1 ring-transparent hover:ring-[var(--color-primary)]' : 'cursor-default',
          ].join(' ')}
          style={{ backgroundColor: avatarColor }}
        >
          {teacherName.slice(0, 1)}
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">{teacherName}</div>
            {teacherContactId && onGoToChat && (
              <span className="text-[10px] text-[var(--color-text-muted)]">点击头像进入对话</span>
            )}
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">{profile?.primaryRole ?? '老师'} · {profile?.subject}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-px border-b border-[var(--color-border)] bg-[var(--color-border)]">
          {[
            { label: '入职日期', value: profile?.joinDate ?? '-' },
            { label: '主要角色', value: profile?.primaryRole ?? '-' },
            { label: '总学生数', value: `${totalStudents} 人` },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center bg-white py-3">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">{item.value}</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-5 p-4">
          {/* Intro */}
          {profile?.intro && (
            <div className="rounded-lg bg-[var(--color-bg-left)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
              {profile.intro}
            </div>
          )}

          <Section title="作为带教老师的学生" students={teachingStudents} onStudentClick={onStudentClick} />
          <Section title="作为诊断老师的学生" students={diagnosisStudents} onStudentClick={onStudentClick} />

          {teachingStudents.length === 0 && diagnosisStudents.length === 0 && (
            <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">暂无学生数据</div>
          )}
        </div>
      </div>
    </div>
  )
}
