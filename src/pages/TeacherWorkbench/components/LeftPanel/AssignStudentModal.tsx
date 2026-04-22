import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../../lib/api'
import {
  CHECKPOINT_ASSIGNMENT_LIBRARY,
  type AssignmentCheckpointLibrary,
  type AssignmentResourceItem,
  type AssignmentTheoryRow,
} from './assignmentLibrary.generated'
import { useWorkbenchStore } from '../../store/workbenchStore'

type RightTab = 'version' | 'province' | 'course' | 'question' | 'exam'
type VersionKey = 'standard' | 'express' | 'premium'

type TeacherOption = {
  id: string
  name: string
  title?: string
  role?: string
  roleLabel?: string
  color?: string
}

type ProvinceOption = {
  key: string
  label: string
}

type KnowledgeGroup = {
  key: string
  title: string
  rows: AssignmentTheoryRow[]
  knowledgeType: AssignmentTheoryRow['knowledgeType']
  desc: string
}

// Per-checkpoint configuration state
type CheckpointConfig = {
  checkpointName: string
  selectedVersion: VersionKey | null
  selectedProvince: string | null
  selectedKnowledgeIds: string[]
  selectedQuestionIds: string[]
  selectedExamIds: string[]
  selectedRemedialIds: string[]
}

const palette = ['#e8845a', '#4a90d9', '#7c3aed', '#16a34a', '#d79c69', '#b58f6f']

const PROVINCE_CANDIDATES = [
  '国考', '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
  '四川', '重庆', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆',
  '广西', '海南', '广东', '深圳', '香港', '澳门', '台湾',
] as const

const DEFAULT_PROVINCES: ProvinceOption[] = PROVINCE_CANDIDATES.map((key) => ({ key, label: key }))

const versions: Array<{
  key: VersionKey
  name: string
  price: string
  period: string
  condition: string
  benefits: string[]
  color: string
}> = [
  {
    key: 'standard',
    name: '标准版',
    price: '1080 / 1680',
    period: '首轮突破 7 天起，按计划持续到考前',
    condition: '适合备考时间相对充足的学员',
    color: '#e8845a',
    benefits: ['1 节共识课', '1 节纠偏课', '配套理论课', '刷题与人工批改', '卡点考试与报告'],
  },
  {
    key: 'express',
    name: '极速版',
    price: '1680 / 1980',
    period: '考前冲刺 3-7 天',
    condition: '适合时间紧、理解能力较强的学员',
    color: '#4a90d9',
    benefits: ['2 节纠偏课', '3 道纠偏作业', '1 套讲义资料', '2 次卡点考试'],
  },
  {
    key: 'premium',
    name: '尊享版',
    price: '3080',
    period: '考前冲刺 3-7 天',
    condition: '适合时间紧、需要更强跟进的学员',
    color: '#7c3aed',
    benefits: ['4 节纠偏课', '6 道纠偏作业', '3 次卡点考试', '更多人工跟进'],
  },
]

const checkpointOptions = CHECKPOINT_ASSIGNMENT_LIBRARY.map((item, index) => {
  const uniqueKnowledgePoints = Array.from(new Set(item.theoryRows.map((row) => row.knowledgePoint))).filter(Boolean)
  return {
    name: item.checkpointName,
    tag: item.theoryRows.some((row) => getKnowledgeType(row) === 'required') ? '必学' : '卡点',
    desc: uniqueKnowledgePoints.slice(0, 2).join(' · ') || '已导入该卡点下的理论课、刷题和考试数据',
    color: palette[index % palette.length],
  }
})

function buildTheoryId(row: AssignmentTheoryRow) {
  return `${row.sourceSheet}_${row.sourceRow}_${row.knowledgePoint}_${row.theoryTitle}`
}

function isOptionalLearningStatus(status: string) {
  return status.includes('选学')
}

function getKnowledgeType(row: AssignmentTheoryRow): AssignmentTheoryRow['knowledgeType'] {
  const status = String(row.learningStatusRaw || row.courseStatus || '').trim()
  if (isOptionalLearningStatus(status)) return 'optional'
  return row.knowledgeType === 'optional' ? 'optional' : 'required'
}

function getKnowledgeDescription(desc: string, knowledgeType: AssignmentTheoryRow['knowledgeType']) {
  const normalizedDesc = String(desc || '').trim()
  if (!normalizedDesc || normalizedDesc === '必学' || isOptionalLearningStatus(normalizedDesc)) {
    return knowledgeType === 'required' ? '必学知识点' : '选学知识点'
  }
  return normalizedDesc
}

function renderResourceTitle(item: AssignmentResourceItem) {
  return item.displayTitle || item.questionTitle || item.rawTitle || '未命名资源'
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function inferProvinceKeys(...texts: Array<string | undefined>) {
  const merged = texts.filter(Boolean).join(' ')
  if (!merged) return []
  return PROVINCE_CANDIDATES.filter((province) => merged.includes(province))
}

function getTheoryProvinceKeys(row: AssignmentTheoryRow) {
  return uniqueStrings(
    row.provinceKeys.length > 0
      ? row.provinceKeys
      : inferProvinceKeys(row.learningStatusRaw, row.theoryTitle, row.noteText, row.knowledgePoint),
  )
}

function getResourceProvinceKeys(item: AssignmentResourceItem) {
  return uniqueStrings(
    item.provinceKeys.length > 0
      ? item.provinceKeys
      : inferProvinceKeys(item.rawTitle, item.questionTitle, item.displayTitle, item.slotKey),
  )
}

function matchesProvince(provinceKeys: string[], selectedProvince: string | null) {
  if (!selectedProvince) return true
  if (provinceKeys.length === 0) return true
  return provinceKeys.includes(selectedProvince)
}

function makeDefaultConfig(checkpointName: string): CheckpointConfig {
  return {
    checkpointName,
    selectedVersion: null,
    selectedProvince: null,
    selectedKnowledgeIds: [],
    selectedQuestionIds: [],
    selectedExamIds: [],
    selectedRemedialIds: [],
  }
}

function isConfigComplete(cfg: CheckpointConfig, library: AssignmentCheckpointLibrary | null): boolean {
  if (!cfg.selectedVersion || !cfg.selectedProvince) return false
  const showTheory = cfg.selectedVersion !== 'express' && cfg.selectedVersion !== 'premium'
  if (showTheory && library && library.theoryRows.length > 0 && cfg.selectedKnowledgeIds.length === 0) return false
  if (library && library.practiceItems.length > 0 && cfg.selectedQuestionIds.length === 0) return false
  return true
}

function SelectCard({
  active,
  title,
  subtitle,
  onClick,
  extra,
}: {
  active: boolean
  title: string
  subtitle?: string
  onClick: () => void
  extra?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-xl border px-4 py-3 text-left transition-all',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className={['text-sm font-semibold', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{subtitle}</div>
          ) : null}
        </div>
        {extra}
      </div>
    </button>
  )
}

function CheckboxRow({
  checked,
  title,
  subtitle,
  badge,
  onToggle,
}: {
  checked: boolean
  title: string
  subtitle?: string
  badge?: string
  onToggle: () => void
}) {
  return (
    <label
      className={[
        'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all',
        checked
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={['text-sm font-medium', checked ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
            {title}
          </span>
          {badge ? (
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{subtitle}</div>
        ) : null}
      </div>
      <div
        className={[
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
          checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-[var(--color-border)] bg-white',
        ].join(' ')}
      >
        {checked ? (
          <svg width="9" height="7" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
    </label>
  )
}

function StepButton({
  index,
  title,
  active,
  completed,
  onClick,
}: {
  index: number
  title: string
  active: boolean
  completed: boolean
  onClick: () => void
}) {
  const isDone = completed && !active
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : isDone
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
          active ? 'bg-[var(--color-primary)] text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400',
        ].join(' ')}
      >
        {isDone ? '✓' : index}
      </span>
      <span>{title}</span>
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
      {text}
    </div>
  )
}

export function AssignStudentModal() {
  const { assignStudentItem, closeAssignStudent, assignStudentTask } =
    useWorkbenchStore()
  const assignStudentModalOpen = assignStudentItem !== null
  const assignStudentModalItemId = assignStudentItem?.id ?? null
  const closeAssignStudentModal = closeAssignStudent

  const [selectedCheckpoints, setSelectedCheckpoints] = useState<string[]>([])
  const [activeCheckpointTab, setActiveCheckpointTab] = useState<string | null>(null)
  const [checkpointConfigs, setCheckpointConfigs] = useState<Map<string, CheckpointConfig>>(new Map())
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherOption | null>(null)
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [activeTab, setActiveTab] = useState<RightTab>('version')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!assignStudentModalOpen) return
    api.get<{ list: TeacherOption[] }>('/api/teacher/list').then((res) => {
      const list = (res.list ?? []).map((t, i) => ({ ...t, color: palette[i % palette.length] }))
      setTeachers(list)
    }).catch(() => {})
  }, [assignStudentModalOpen])

  useEffect(() => {
    if (!assignStudentModalOpen) {
      setSelectedCheckpoints([])
      setActiveCheckpointTab(null)
      setCheckpointConfigs(new Map())
      setSelectedTeacher(null)
      setActiveTab('version')
      setSubmitting(false)
    }
  }, [assignStudentModalOpen])

  useEffect(() => {
    if (selectedCheckpoints.length === 0) {
      setActiveCheckpointTab(null)
      return
    }
    if (!activeCheckpointTab || !selectedCheckpoints.includes(activeCheckpointTab)) {
      setActiveCheckpointTab(selectedCheckpoints[0])
    }
  }, [selectedCheckpoints, activeCheckpointTab])

  const handleTabSwitch = (name: string) => {
    setActiveCheckpointTab(name)
    setActiveTab('version')
  }

  const toggleCheckpoint = (name: string) => {
    setSelectedCheckpoints((prev) => {
      if (prev.includes(name)) {
        const next = prev.filter((n) => n !== name)
        setCheckpointConfigs((m) => {
          const copy = new Map(m)
          copy.delete(name)
          return copy
        })
        return next
      }
      setCheckpointConfigs((m) => {
        if (!m.has(name)) {
          const copy = new Map(m)
          copy.set(name, makeDefaultConfig(name))
          return copy
        }
        return m
      })
      return [...prev, name]
    })
  }

  const updateConfig = (name: string, patch: Partial<CheckpointConfig>) => {
    setCheckpointConfigs((m) => {
      const copy = new Map(m)
      const existing = copy.get(name) ?? makeDefaultConfig(name)
      copy.set(name, { ...existing, ...patch })
      return copy
    })
  }

  const currentConfig = activeCheckpointTab
    ? (checkpointConfigs.get(activeCheckpointTab) ?? makeDefaultConfig(activeCheckpointTab))
    : null

  const currentLibrary: AssignmentCheckpointLibrary | null = useMemo(() => {
    if (!activeCheckpointTab) return null
    return CHECKPOINT_ASSIGNMENT_LIBRARY.find((l) => l.checkpointName === activeCheckpointTab) ?? null
  }, [activeCheckpointTab])

  const showTheory = currentConfig?.selectedVersion !== 'express' && currentConfig?.selectedVersion !== 'premium'

  const availableProvinces = DEFAULT_PROVINCES

  const knowledgeGroups = useMemo((): KnowledgeGroup[] => {
    if (!currentLibrary || !currentConfig?.selectedProvince) return []
    const filtered = currentLibrary.theoryRows.filter((r) =>
      matchesProvince(getTheoryProvinceKeys(r), currentConfig.selectedProvince),
    )
    const map = new Map<string, KnowledgeGroup>()
    filtered.forEach((r) => {
      const key = r.knowledgePoint || r.theoryTitle
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: r.knowledgePoint || r.theoryTitle,
          rows: [],
          knowledgeType: getKnowledgeType(r),
          desc: getKnowledgeDescription(r.learningStatusRaw || r.courseStatus || '', getKnowledgeType(r)),
        })
      }
      map.get(key)!.rows.push(r)
    })
    return Array.from(map.values())
  }, [currentLibrary, currentConfig?.selectedProvince])

  const filteredPractice = useMemo(() => {
    if (!currentLibrary || !currentConfig?.selectedProvince) return []
    return currentLibrary.practiceItems.filter((r) =>
      matchesProvince(getResourceProvinceKeys(r), currentConfig!.selectedProvince),
    )
  }, [currentLibrary, currentConfig?.selectedProvince])

  const filteredRemedial = useMemo(() => {
    if (!currentLibrary || !currentConfig?.selectedProvince) return []
    return currentLibrary.remedialItems.filter((r) =>
      matchesProvince(getResourceProvinceKeys(r), currentConfig!.selectedProvince),
    )
  }, [currentLibrary, currentConfig?.selectedProvince])

  const canConfirm =
    selectedCheckpoints.length > 0 &&
    selectedTeacher !== null &&
    selectedCheckpoints.every((name) => {
      const cfg = checkpointConfigs.get(name)
      if (!cfg) return false
      const lib = CHECKPOINT_ASSIGNMENT_LIBRARY.find((l) => l.checkpointName === name) ?? null
      return isConfigComplete(cfg, lib)
    })

  const handleSubmit = async () => {
    if (!canConfirm || !selectedTeacher || submitting || !assignStudentModalItemId) return
    setSubmitting(true)
    try {
      for (const name of selectedCheckpoints) {
        const cfg = checkpointConfigs.get(name)
        if (!cfg) continue
        const lib = CHECKPOINT_ASSIGNMENT_LIBRARY.find((l) => l.checkpointName === name)
        if (!lib) continue
        const versionObj = versions.find((v) => v.key === cfg.selectedVersion)
        const provinceObj = DEFAULT_PROVINCES.find((p) => p.key === cfg.selectedProvince)
        const libKnowledgeGroups: KnowledgeGroup[] = (() => {
          const filtered = lib.theoryRows.filter((r) =>
            matchesProvince(getTheoryProvinceKeys(r), cfg.selectedProvince),
          )
          const m = new Map<string, KnowledgeGroup>()
          filtered.forEach((r) => {
            const key = r.knowledgePoint || r.theoryTitle
            if (!m.has(key)) {
              m.set(key, {
                key,
                title: r.knowledgePoint || r.theoryTitle,
                rows: [],
                knowledgeType: getKnowledgeType(r),
                desc: getKnowledgeDescription(r.learningStatusRaw || r.courseStatus || '', getKnowledgeType(r)),
              })
            }
            m.get(key)!.rows.push(r)
          })
          return Array.from(m.values())
        })()
        const selectedGroups = libKnowledgeGroups.filter((g) => cfg.selectedKnowledgeIds.includes(g.key))
        const theoryLessons: Array<{
          id: string; title: string; scope: string; videoId: string
          preClassUrl: string; analysisUrl: string; noteText: string
          knowledgeId: string; knowledgeTitle: string; knowledgeType: string
        }> = []
        selectedGroups.forEach((g) => {
          g.rows.forEach((r) => {
            theoryLessons.push({
              id: buildTheoryId(r),
              title: r.theoryTitle,
              scope: r.learningStatusRaw || '',
              videoId: r.videoId || '',
              preClassUrl: r.preClassUrl || '',
              analysisUrl: r.analysisUrl || '',
              noteText: r.noteText || '',
              knowledgeId: g.key,
              knowledgeTitle: g.title,
              knowledgeType: g.knowledgeType,
            })
          })
        })
        const practiceItems = lib.practiceItems.filter((r) => cfg.selectedQuestionIds.includes(r.id))
        const examItems = lib.examItems.filter((r) => cfg.selectedExamIds.includes(r.id))
        const remedialItems = lib.remedialItems.filter((r) => cfg.selectedRemedialIds.includes(r.id))
        const knowledgeItems = selectedGroups.map((g) => ({
          id: g.key, title: g.title, type: g.knowledgeType, desc: g.desc,
        }))
        await assignStudentTask(assignStudentModalItemId, {
          checkpointName: name,
          teacher: selectedTeacher,
          version: cfg.selectedVersion!,
          versionName: versionObj?.name ?? cfg.selectedVersion!,
          province: cfg.selectedProvince!,
          provinceLabel: provinceObj?.label ?? cfg.selectedProvince!,
          knowledgeItems,
          theoryLessons,
          practiceIds: cfg.selectedQuestionIds,
          examIds: cfg.selectedExamIds,
          practiceItems,
          examItems,
          remedialItems,
          detail: '',
        })
      }
      closeAssignStudentModal()
    } finally {
      setSubmitting(false)
    }
  }

  if (!assignStudentModalOpen) return null

  const steps: Array<{ key: RightTab; label: string }> = [
    { key: 'version', label: '版本' },
    { key: 'province', label: '省份' },
    ...(showTheory ? [{ key: 'course' as RightTab, label: '知识点' }] : []),
    { key: 'question', label: '刷题' },
    { key: 'exam', label: '补考' },
  ]

  const isStepCompleted = (key: RightTab): boolean => {
    if (!currentConfig) return false
    if (key === 'version') return !!currentConfig.selectedVersion
    if (key === 'province') return !!currentConfig.selectedProvince
    if (key === 'course') return currentConfig.selectedKnowledgeIds.length > 0
    if (key === 'question') return currentConfig.selectedQuestionIds.length > 0
    if (key === 'exam') return currentConfig.selectedRemedialIds.length > 0
    return false
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative flex h-[88vh] w-[900px] max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">分配学员任务</h2>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">选择卡点（可多选）并为每个卡点配置方案，最后选择带教老师</p>
          </div>
          <button
            type="button"
            onClick={closeAssignStudentModal}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-gray-100"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left panel */}
          <div className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--color-border)] p-4">
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">选择卡点（可多选）</div>
              <div className="flex flex-col gap-2">
                {checkpointOptions.map((cp) => (
                  <CheckboxRow
                    key={cp.name}
                    checked={selectedCheckpoints.includes(cp.name)}
                    title={cp.name}
                    subtitle={cp.desc}
                    badge={cp.tag}
                    onToggle={() => toggleCheckpoint(cp.name)}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">选择带教老师</div>
              <div className="flex flex-col gap-2">
                {teachers.length === 0 ? (
                  <EmptyState text="暂无老师数据" />
                ) : (
                  teachers.map((t) => (
                    <SelectCard
                      key={t.id}
                      active={selectedTeacher?.id === t.id}
                      title={t.name}
                      subtitle={t.roleLabel ?? t.role ?? t.title}
                      onClick={() => setSelectedTeacher(t)}
                      extra={
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: t.color ?? '#e8845a' }}
                        >
                          {t.name.slice(0, 1)}
                        </div>
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {selectedCheckpoints.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
                请先在左侧选择至少一个卡点
              </div>
            ) : (
              <>
                {/* Checkpoint tab switcher */}
                {selectedCheckpoints.length > 1 && (
                  <div className="flex shrink-0 flex-wrap gap-2 border-b border-[var(--color-border)] px-5 py-3">
                    {selectedCheckpoints.map((name) => {
                      const cfg = checkpointConfigs.get(name)
                      const lib = CHECKPOINT_ASSIGNMENT_LIBRARY.find((l) => l.checkpointName === name) ?? null
                      const done = cfg ? isConfigComplete(cfg, lib) : false
                      const isActive = activeCheckpointTab === name
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleTabSwitch(name)}
                          className={[
                            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            isActive
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                              : done
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)]',
                          ].join(' ')}
                        >
                          {name}
                          {done && !isActive ? <span className="text-emerald-500">✓</span> : isActive ? <span>→</span> : null}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Step nav */}
                <div className="flex shrink-0 flex-wrap gap-2 border-b border-[var(--color-border)] px-5 py-3">
                  {steps.map((s, i) => (
                    <StepButton
                      key={s.key}
                      index={i + 1}
                      title={s.label}
                      active={activeTab === s.key}
                      completed={isStepCompleted(s.key)}
                      onClick={() => setActiveTab(s.key)}
                    />
                  ))}
                </div>

                {/* Step content */}
                <div className="flex-1 overflow-y-auto p-5">
                  {activeTab === 'version' && (
                    <div className="flex flex-col gap-3">
                      {versions.map((v) => (
                        <SelectCard
                          key={v.key}
                          active={currentConfig?.selectedVersion === v.key}
                          title={v.name}
                          subtitle={v.period + ' · ' + v.condition}
                          onClick={() => activeCheckpointTab && updateConfig(activeCheckpointTab, { selectedVersion: v.key })}
                          extra={
                            <div className="shrink-0 text-right">
                              <div className="text-xs font-semibold" style={{ color: v.color }}>¥{v.price}</div>
                            </div>
                          }
                        />
                      ))}
                    </div>
                  )}

                  {activeTab === 'province' && (
                    <div className="flex flex-wrap gap-2">
                      {availableProvinces.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            if (!activeCheckpointTab || !currentLibrary) return
                            const filtered = currentLibrary.theoryRows.filter((r) =>
                              matchesProvince(getTheoryProvinceKeys(r), p.key),
                            )
                            const map = new Map<string, KnowledgeGroup>()
                            filtered.forEach((r) => {
                              const key = r.knowledgePoint || r.theoryTitle
                              if (!map.has(key)) {
                                map.set(key, {
                                  key,
                                  title: r.knowledgePoint || r.theoryTitle,
                                  rows: [],
                                  knowledgeType: getKnowledgeType(r),
                                  desc: getKnowledgeDescription(r.learningStatusRaw || r.courseStatus || '', getKnowledgeType(r)),
                                })
                              }
                              map.get(key)!.rows.push(r)
                            })
                            const requiredIds = Array.from(map.values())
                              .filter((g) => g.knowledgeType === 'required')
                              .map((g) => g.key)
                            updateConfig(activeCheckpointTab, {
                              selectedProvince: p.key,
                              selectedKnowledgeIds: requiredIds,
                            })
                          }}
                          className={[
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                            currentConfig?.selectedProvince === p.key
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]',
                          ].join(' ')}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === 'course' && showTheory && (
                    <div className="flex flex-col gap-2">
                      {knowledgeGroups.length === 0 ? (
                        <EmptyState text="请先选择省份" />
                      ) : (
                        knowledgeGroups.map((g) => (
                          <CheckboxRow
                            key={g.key}
                            checked={currentConfig?.selectedKnowledgeIds.includes(g.key) ?? false}
                            title={g.title}
                            subtitle={g.desc + ' · ' + g.rows.length + ' 节课'}
                            badge={g.knowledgeType === 'required' ? '必学' : '选学'}
                            onToggle={() => {
                              if (!activeCheckpointTab || !currentConfig) return
                              const ids = currentConfig.selectedKnowledgeIds
                              updateConfig(activeCheckpointTab, {
                                selectedKnowledgeIds: ids.includes(g.key)
                                  ? ids.filter((id) => id !== g.key)
                                  : [...ids, g.key],
                              })
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'question' && (
                    <div className="flex flex-col gap-2">
                      {filteredPractice.length === 0 ? (
                        <EmptyState text="该卡点暂无刷题资源" />
                      ) : (
                        filteredPractice.map((item) => (
                          <CheckboxRow
                            key={item.id}
                            checked={currentConfig?.selectedQuestionIds.includes(item.id) ?? false}
                            title={renderResourceTitle(item)}
                            subtitle={item.slotKey || undefined}
                            onToggle={() => {
                              if (!activeCheckpointTab || !currentConfig) return
                              const ids = currentConfig.selectedQuestionIds
                              updateConfig(activeCheckpointTab, {
                                selectedQuestionIds: ids.includes(item.id)
                                  ? ids.filter((id) => id !== item.id)
                                  : [...ids, item.id],
                              })
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'exam' && (
                    <div className="flex flex-col gap-2">
                      {filteredRemedial.length === 0 ? (
                        <EmptyState text="该卡点暂无补考资源" />
                      ) : (
                        filteredRemedial.map((item) => (
                          <CheckboxRow
                            key={item.id}
                            checked={currentConfig?.selectedRemedialIds.includes(item.id) ?? false}
                            title={renderResourceTitle(item)}
                            subtitle={item.slotKey || undefined}
                            onToggle={() => {
                              if (!activeCheckpointTab || !currentConfig) return
                              const ids = currentConfig.selectedRemedialIds
                              updateConfig(activeCheckpointTab, {
                                selectedRemedialIds: ids.includes(item.id)
                                  ? ids.filter((id) => id !== item.id)
                                  : [...ids, item.id],
                              })
                            }}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--color-border)] px-6 py-4">
          <div className="text-xs text-[var(--color-text-muted)]">
            {selectedCheckpoints.length > 0
              ? selectedCheckpoints.length + ' 个卡点已选' + (selectedTeacher ? ' · ' + selectedTeacher.name : '')
              : '请选择卡点和老师'}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeAssignStudentModal}
              className="rounded-xl border border-[var(--color-border)] px-5 py-2 text-sm text-[var(--color-text-muted)] hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canConfirm || submitting}
              className={[
                'rounded-xl px-5 py-2 text-sm font-medium text-white transition-all',
                canConfirm && !submitting
                  ? 'bg-[var(--color-primary)] hover:opacity-90'
                  : 'cursor-not-allowed bg-gray-300',
              ].join(' ')}
            >
              {submitting ? '提交中...' : '确认分配'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
