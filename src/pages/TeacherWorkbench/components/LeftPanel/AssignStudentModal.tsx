import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { checkpointContents, kpointTypes, staffRoster, teacherProfiles } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'

type RightTab = 'course' | 'question' | 'version' | 'exam'
type VersionKey = 'standard' | 'express' | 'premium'

const teachingStaff = staffRoster.filter((m) => m.role === '带教老师')

const mockQuestions = Array.from({ length: 5 }, (_, i) => ({ id: `mq${i + 1}`, label: `题目 ${i + 1}` }))
const mockExams     = Array.from({ length: 3 }, (_, i) => ({ id: `me${i + 1}`, label: `考试 ${i + 1}` }))

const typeLabel: Record<string, string> = { manual: '手动', default: '默认', weak: '补弱' }
const typeCls:   Record<string, string> = {
  manual:  'text-[var(--color-text-muted)]',
  default: 'text-[var(--color-primary)]',
  weak:    'text-orange-500',
}

const versions: {
  key: VersionKey
  name: string
  price: string
  period: string
  condition: string
  benefits: string[]
  color: string
}[] = [
  {
    key: 'standard',
    name: '标准版',
    price: '1080 / 1680',
    period: '首轮突破：7天 · 月度刷题：到考前',
    condition: '备考时间满足的，优先建议标准版',
    color: '#e8845a',
    benefits: [
      '1节15分钟1v1共识课',
      '1节45分钟1v1纠偏课',
      '配套录播理论课',
      '配套刷题 + 人工批改 + 1v1答疑',
      '2次卡点测验 + 人工批改 + 批改报告（含1次补考）',
      '月度直播刷题课',
      '月度卡点测试 + 人工批改 + 批改报告（含1次补考）',
    ],
  },
  {
    key: 'express',
    name: '极速版',
    price: '1680 / 1980',
    period: '3—4天',
    condition: '考前1—2个月，学习时间紧张，且理解能力强的用户',
    color: '#4a90d9',
    benefits: [
      '2节45分钟1v1纠偏课',
      '3道卡点纠偏作业批改',
      '1套卡点理论讲义',
      '2次卡点测验 + 人工批改 + 批改报告（含1次补考）',
    ],
  },
  {
    key: 'premium',
    name: '尊享版',
    price: '3080',
    period: '3—4天',
    condition: '考前1—2个月，学习时间紧张，且理解能力弱的用户',
    color: '#7c3aed',
    benefits: [
      '4节45分钟1v1纠偏课',
      '6道卡点纠偏作业批改',
      '3次卡点测验 + 人工批改 + 批改报告（含2次补考）',
    ],
  },
]

export function AssignStudentModal() {
  const item  = useWorkbenchStore((s) => s.assignStudentItem)
  const close = useWorkbenchStore((s) => s.closeAssignStudent)
  const setStudentPracticeAssignment = useWorkbenchStore((s) => s.setStudentPracticeAssignment)

  const [selectedKpoint, setSelectedKpoint]       = useState<string | null>(null)
  const [selectedTeacher, setSelectedTeacher]     = useState<string | null>(null)
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [selectedQIds,      setSelectedQIds]      = useState<string[]>([])
  const [selectedVersion,   setSelectedVersion]   = useState<VersionKey | null>(null)
  const [selectedExamIds,   setSelectedExamIds]   = useState<string[]>([])
  const [rightTab, setRightTab]                   = useState<RightTab>('version')
  const [showConfirm, setShowConfirm]             = useState(false)
  const [confirmed, setConfirmed]                 = useState(false)

  // Auto-select default courses when kpoint changes
  useEffect(() => {
    if (!selectedKpoint) { setSelectedCourseIds([]); setSelectedQIds([]); setSelectedExamIds([]); return }
    const cp = checkpointContents.find((c) => c.name === selectedKpoint)
    setSelectedCourseIds(cp ? cp.practiceQuestions.filter((q) => q.selectionType === 'default').map((q) => q.id) : [])
    setSelectedQIds([])
    setSelectedExamIds([])
  }, [selectedKpoint])

  if (!item) return null

  const checkpoint = selectedKpoint ? checkpointContents.find((c) => c.name === selectedKpoint) : null
  const canConfirm = !!selectedKpoint && !!selectedTeacher && !!selectedVersion && selectedCourseIds.length > 0 && selectedQIds.length > 0 && selectedExamIds.length > 0

  function toggleCourse(id: string) {
    setSelectedCourseIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }
  function toggleQ(id: string) {
    setSelectedQIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }
  function toggleExam(id: string) {
    setSelectedExamIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  function handleConfirm() {
    if (item?.studentId && checkpoint && selectedCourseIds.length > 0) {
      setStudentPracticeAssignment(item.studentId, checkpoint.id, selectedCourseIds)
    }
    setConfirmed(true)
    window.setTimeout(() => { setConfirmed(false); setShowConfirm(false); close() }, 1200)
  }

  const rightTabs: { key: RightTab; label: string }[] = [
    { key: 'version',  label: '选择版本' },
    { key: 'course',   label: '选择卡点课程' },
    { key: 'question', label: '选择题目' },
    { key: 'exam',     label: '选择考试' },
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative flex w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">分配学员</div>
            <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              {item.name}{item.subtitle ? ` · ${item.subtitle}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left ── */}
          <div className="flex w-[300px] shrink-0 flex-col border-r border-[var(--color-border)] overflow-auto">

            {/* 上：选择卡点类型 */}
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">选择卡点类型</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">选择该学员的主要卡点</div>
            </div>
            <div className="px-4 py-3 space-y-2 border-b border-[var(--color-border)]">
              {kpointTypes.map((kp) => {
                const active = selectedKpoint === kp.name
                return (
                  <button
                    key={kp.name}
                    type="button"
                    onClick={() => setSelectedKpoint(kp.name)}
                    className={[
                      'w-full rounded-xl border px-4 py-3 text-left transition-all',
                      active
                        ? 'border-transparent shadow-sm'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                    ].join(' ')}
                    style={active ? { backgroundColor: kp.color + '18', borderColor: kp.color } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                        style={active
                          ? { borderColor: kp.color, backgroundColor: kp.color }
                          : { borderColor: '#d1d5db', backgroundColor: 'transparent' }}
                      >
                        {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold" style={{ color: active ? kp.color : 'var(--color-text-primary)' }}>
                            {kp.name}
                          </span>
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                            style={active
                              ? { backgroundColor: kp.color + '25', color: kp.color }
                              : { backgroundColor: 'var(--color-bg-left)', color: 'var(--color-text-muted)' }}
                          >
                            {kp.tag}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                          {kp.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 下：选择带教老师 */}
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">选择带教老师</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">单选 · 将加入该学员的学习群</div>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              {teachingStaff.map((m) => {
                const profile = teacherProfiles[m.name]
                const active  = selectedTeacher === m.name
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setSelectedTeacher(m.name)}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                    ].join(' ')}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: profile?.color ?? '#999' }}
                    >
                      {profile?.avatar ?? m.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={['text-xs font-semibold', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                        {m.name}
                      </div>
                      {profile?.subject && (
                        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)] truncate">{profile.subject}</div>
                      )}
                    </div>
                    <div
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                      style={active
                        ? { borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary)' }
                        : { borderColor: '#d1d5db', backgroundColor: 'transparent' }}
                    >
                      {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

          </div>

          {/* ── Right: tabs ── */}
          <div className="flex flex-1 flex-col min-w-0">

            <div className="flex border-b border-[var(--color-border)] px-5 bg-white">
              {rightTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setRightTab(t.key)}
                  className={[
                    'mr-1 px-5 py-3 text-xs font-medium transition-colors border-b-2 -mb-px',
                    rightTab === t.key
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">

              {/* 选择卡点课程 */}
              {rightTab === 'course' && (
                !checkpoint ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
                    请先在左侧选择卡点类型
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        已选 {selectedCourseIds.length} / {checkpoint.practiceQuestions.length} 课
                      </span>
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-[var(--color-bg-left)]">
                        <div
                          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                          style={{ width: `${checkpoint.practiceQuestions.length > 0 ? (selectedCourseIds.length / checkpoint.practiceQuestions.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {checkpoint.practiceQuestions.map((q, idx) => {
                        const checked = selectedCourseIds.includes(q.id)
                        return (
                          <label
                            key={q.id}
                            className={[
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                              checked
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                            ].join(' ')}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-left)] text-[10px] font-semibold text-[var(--color-text-muted)]">
                              {idx + 1}
                            </span>
                            <span className={['w-8 shrink-0 text-[10px] font-medium', typeCls[q.selectionType] ?? ''].join(' ')}>
                              {typeLabel[q.selectionType] ?? q.selectionType}
                            </span>
                            <span className={[
                              'min-w-0 flex-1 text-xs leading-snug',
                              checked ? 'font-medium text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]',
                            ].join(' ')}>
                              {q.title}
                            </span>
                            <div className={[
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                              checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white',
                            ].join(' ')}>
                              {checked && (
                                <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                  <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleCourse(q.id)} />
                          </label>
                        )
                      })}
                    </div>
                  </>
                )
              )}

              {/* 选择题目 */}
              {rightTab === 'question' && (
                !checkpoint ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
                    请先在左侧选择卡点类型
                  </div>
                ) : (
                  <>
                    <div className="mb-3 text-[10px] text-[var(--color-text-muted)]">已选 {selectedQIds.length} / {mockQuestions.length} 题</div>
                    <div className="space-y-1.5">
                      {mockQuestions.map((q) => {
                        const checked = selectedQIds.includes(q.id)
                        return (
                          <label
                            key={q.id}
                            className={[
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                              checked
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                            ].join(' ')}
                          >
                            <span className={['min-w-0 flex-1 text-xs font-medium', checked ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                              {q.label}
                            </span>
                            <div className={[
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                              checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white',
                            ].join(' ')}>
                              {checked && (
                                <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                  <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleQ(q.id)} />
                          </label>
                        )
                      })}
                    </div>
                  </>
                )
              )}

              {/* 选择版本 */}
              {rightTab === 'version' && (
                <div className="space-y-3">
                  {versions.map((v) => {
                    const active = selectedVersion === v.key
                    return (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => setSelectedVersion(v.key)}
                        className={[
                          'w-full rounded-2xl border-2 px-5 py-4 text-left transition-all',
                          active ? 'shadow-sm' : 'border-[var(--color-border)] hover:border-gray-300',
                        ].join(' ')}
                        style={active ? { borderColor: v.color, backgroundColor: v.color + '0d' } : undefined}
                      >
                        {/* 版本标题行 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* radio */}
                            <div
                              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                              style={active
                                ? { borderColor: v.color, backgroundColor: v.color }
                                : { borderColor: '#d1d5db', backgroundColor: 'transparent' }}
                            >
                              {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm font-bold" style={{ color: active ? v.color : 'var(--color-text-primary)' }}>
                              {v.name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: v.color }}>
                            ¥{v.price}
                          </span>
                        </div>

                        {/* 核心权益 */}
                        <ul className="mt-3 space-y-1.5 pl-6">
                          {v.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                              <span className="mt-px shrink-0" style={{ color: v.color }}>·</span>
                              {b}
                            </li>
                          ))}
                        </ul>

                        {/* 周期 + 判断条件 */}
                        <div className="mt-3 flex flex-wrap gap-2 pl-6">
                          <span className="rounded-full bg-[var(--color-bg-left)] px-2.5 py-1 text-[10px] text-[var(--color-text-muted)]">
                            周期：{v.period}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px]"
                            style={active
                              ? { backgroundColor: v.color + '18', color: v.color }
                              : { backgroundColor: 'var(--color-bg-left)', color: 'var(--color-text-muted)' }}
                          >
                            {v.condition}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 选择考试 */}
              {rightTab === 'exam' && (
                !checkpoint ? (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)]">
                    请先在左侧选择卡点类型
                  </div>
                ) : (
                  <>
                    <div className="mb-3 text-[10px] text-[var(--color-text-muted)]">已选 {selectedExamIds.length} / {mockExams.length} 场</div>
                    <div className="space-y-1.5">
                      {mockExams.map((e) => {
                        const checked = selectedExamIds.includes(e.id)
                        return (
                          <label
                            key={e.id}
                            className={[
                              'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all',
                              checked
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                                : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                            ].join(' ')}
                          >
                            <span className={['min-w-0 flex-1 text-xs font-medium', checked ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                              {e.label}
                            </span>
                            <div className={[
                              'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                              checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white',
                            ].join(' ')}>
                              {checked && (
                                <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
                                  <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleExam(e.id)} />
                          </label>
                        )
                      })}
                    </div>
                  </>
                )
              )}

            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">
            {(() => {
              if (!selectedKpoint)                return '① 请选择卡点类型'
              if (!selectedTeacher)               return '② 请选择带教老师'
              if (!selectedVersion)               return '③ 请在右侧选择课程版本'
              if (selectedCourseIds.length === 0) return '④ 请在右侧选择卡点课程'
              if (selectedQIds.length === 0)      return '⑤ 请在右侧选择题目'
              if (selectedExamIds.length === 0)   return '⑥ 请在右侧选择考试'
              const vName = versions.find((v) => v.key === selectedVersion)?.name ?? ''
              return (
                <>
                  <span className="font-medium text-[var(--color-text-primary)]">{selectedKpoint}</span>
                  {' · '}
                  带教：<span className="font-medium text-[var(--color-text-primary)]">{selectedTeacher}</span>
                  {' · '}
                  {vName} · {selectedCourseIds.length} 课 · {selectedQIds.length} 题 · {selectedExamIds.length} 考试
                </>
              )
            })()}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => setShowConfirm(true)}
              className={[
                'rounded-lg px-5 py-1.5 text-xs font-semibold text-white transition-all',
                canConfirm
                  ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]'
                  : 'bg-[var(--color-primary)] opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              确认分配
            </button>
          </div>
        </div>

        {/* ── Confirmation overlay ── */}
        {showConfirm && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="w-[400px] rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">确认分配信息</div>
              <div className="mb-4 text-[10px] text-[var(--color-text-muted)]">请确认以下分配内容是否正确</div>

              <div className="space-y-2.5 rounded-xl bg-[var(--color-bg-left)] px-4 py-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">学员</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{item.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">卡点类型</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{selectedKpoint}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">带教老师</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{selectedTeacher}</span>
                </div>
                {selectedVersion && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">课程版本</span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {versions.find((v) => v.key === selectedVersion)?.name}
                      {' · ¥'}{versions.find((v) => v.key === selectedVersion)?.price}
                    </span>
                  </div>
                )}
                {selectedCourseIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">卡点课程</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{selectedCourseIds.length} 课</span>
                  </div>
                )}
                {selectedQIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">题目</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{selectedQIds.length} 题</span>
                  </div>
                )}
                {selectedExamIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">考试</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{selectedExamIds.length} 场</span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)] transition-colors"
                >
                  返回修改
                </button>
                <button
                  type="button"
                  disabled={confirmed}
                  onClick={handleConfirm}
                  className={[
                    'rounded-lg px-5 py-1.5 text-xs font-semibold text-white transition-all',
                    confirmed ? 'bg-green-500' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]',
                  ].join(' ')}
                >
                  {confirmed ? '✓ 分配成功' : '确认'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body,
  )
}
