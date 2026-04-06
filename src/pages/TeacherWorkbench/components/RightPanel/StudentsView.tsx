import { useEffect, useState } from 'react'
import { myDiagnosisStudents, myTeachingStudents } from '../../mock/workbenchMock'
import type { StudentItem } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { StudentDetailView } from './StudentDetailView'
import { TeacherProfileView } from './TeacherProfileView'

type Role = 'teacher' | 'manager'
type StudentTab = 'teaching' | 'diagnosis' | 'diagnosed' | 'checkpoint'
type NavItem =
  | { type: 'list' }
  | { type: 'student'; student: StudentItem }
  | { type: 'teacher'; name: string }

const mockAllStudents = [...myTeachingStudents, ...myDiagnosisStudents]

const statusConfig = {
  normal:    { label: '正常',   cls: 'bg-green-100 text-green-600' },
  warning:   { label: '异常',   cls: 'bg-red-100 text-red-500' },
  new:       { label: '新学员', cls: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
  leave:     { label: '已请假', cls: 'bg-gray-100 text-gray-500' },
  completed: { label: '已完成', cls: 'bg-teal-50 text-teal-700' },
}

function StudentCard({ student, onClick }: { student: StudentItem; onClick: () => void }) {
  const s = statusConfig[student.status]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-3 text-left hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: student.color }}
      >
        {student.avatar}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{student.name}</span>
          <span className={['rounded-full px-1.5 py-0.5 text-[10px] font-medium', s.cls].join(' ')}>
            {s.label}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span>{student.grade}</span>
          <span>·</span>
          <span>{student.subject}</span>
          <span>·</span>
          <span>最近上课 {student.lastSession}</span>
        </div>
      </div>
      <svg className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

export function StudentsView() {
  const [role, setRole] = useState<Role>('teacher')
  const [tab, setTab]   = useState<StudentTab>('teaching')
  const [stack, setStack] = useState<NavItem[]>([{ type: 'list' }])

  // Reset tab when role changes
  function switchRole(r: Role) {
    setRole(r)
    setTab(r === 'teacher' ? 'teaching' : 'diagnosed')
  }

  const targetStudentId    = useWorkbenchStore((s) => s.targetStudentId)
  const clearTargetStudent = useWorkbenchStore((s) => s.clearTargetStudent)
  const targetTeacherName  = useWorkbenchStore((s) => s.targetTeacherName)
  const clearTargetTeacher = useWorkbenchStore((s) => s.clearTargetTeacher)
  const selectContact      = useWorkbenchStore((s) => s.selectContact)
  const apiStudents        = useWorkbenchStore((s) => s.students)

  // 有真实数据用真实数据，否则降级到 mock
  const allStudents = apiStudents.length > 0 ? apiStudents : mockAllStudents

  // Jump to student detail when triggered from task modal / chat avatar
  useEffect(() => {
    if (!targetStudentId) return
    const student = allStudents.find((s) => s.id === targetStudentId)
    if (student) {
      setStack([{ type: 'list' }, { type: 'student', student }])
    }
    clearTargetStudent()
  }, [targetStudentId, clearTargetStudent, allStudents])

  // Jump to teacher profile when triggered from chat avatar
  useEffect(() => {
    if (!targetTeacherName) return
    setStack([{ type: 'list' }, { type: 'teacher', name: targetTeacherName }])
    clearTargetTeacher()
  }, [targetTeacherName, clearTargetTeacher])

  const current = stack[stack.length - 1]

  function push(item: NavItem) { setStack((s) => [...s, item]) }
  function pop() { setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)) }

  if (current.type === 'teacher') {
    return (
      <TeacherProfileView
        teacherName={current.name}
        onBack={pop}
        onStudentClick={(student) => push({ type: 'student', student })}
        onGoToChat={(contactId) => selectContact(contactId)}
      />
    )
  }

  if (current.type === 'student') {
    return (
      <StudentDetailView
        student={current.student}
        onBack={pop}
        onTeacherClick={(name) => push({ type: 'teacher', name })}
        onGoToChat={(contactId) => selectContact(contactId)}
      />
    )
  }

  const students =
    tab === 'teaching'   ? (apiStudents.length > 0 ? apiStudents : myTeachingStudents)  :
    tab === 'diagnosis'  ? (apiStudents.length > 0 ? apiStudents : myDiagnosisStudents) :
    tab === 'diagnosed'  ? (apiStudents.length > 0 ? apiStudents : myDiagnosisStudents) :
                           (apiStudents.length > 0 ? apiStudents : myTeachingStudents)

  const tabCls = (active: boolean) =>
    [
      'px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
      active
        ? 'bg-[var(--color-primary)] text-white'
        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]',
    ].join(' ')

  const roleBtnCls = (active: boolean) =>
    [
      'px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'bg-white text-[var(--color-primary)] shadow-sm'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
    ].join(' ')

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">我的学生</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">共 {students.length} 人</span>
          {/* Role toggle */}
          <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)]">
            <button type="button" className={roleBtnCls(role === 'teacher')} onClick={() => switchRole('teacher')}>
              老师
            </button>
            <button type="button" className={roleBtnCls(role === 'manager')} onClick={() => switchRole('manager')}>
              学管
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
        {role === 'teacher' ? (
          <>
            <button type="button" className={tabCls(tab === 'teaching')} onClick={() => setTab('teaching')}>
              我的带教
            </button>
            <button type="button" className={tabCls(tab === 'diagnosis')} onClick={() => setTab('diagnosis')}>
              我的诊断
            </button>
          </>
        ) : (
          <>
            <button type="button" className={tabCls(tab === 'diagnosed')} onClick={() => setTab('diagnosed')}>
              诊断学员
            </button>
            <button type="button" className={tabCls(tab === 'checkpoint')} onClick={() => setTab('checkpoint')}>
              卡点学员
            </button>
          </>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} onClick={() => push({ type: 'student', student: s })} />
          ))}
        </div>
      </div>
    </div>
  )
}
