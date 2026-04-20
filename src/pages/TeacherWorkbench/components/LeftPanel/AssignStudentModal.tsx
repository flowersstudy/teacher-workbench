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

const palette = ['#e8845a', '#4a90d9', '#7c3aed', '#16a34a', '#d79c69', '#b58f6f']

const PROVINCE_CANDIDATES = [
  '全国',
  '北京',
  '天津',
  '河北',
  '山西',
  '内蒙古',
  '辽宁',
  '吉林',
  '黑龙江',
  '上海',
  '江苏',
  '浙江',
  '安徽',
  '福建',
  '江西',
  '山东',
  '河南',
  '湖北',
  '湖南',
  '四川',
  '重庆',
  '贵州',
  '云南',
  '西藏',
  '陕西',
  '甘肃',
  '青海',
  '宁夏',
  '新疆',
  '广西',
  '海南',
  '广东',
  '深圳',
  '香港',
  '澳门',
  '台湾',
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
    desc: uniqueKnowledgePoints.slice(0, 2).join(' / ') || '已导入该卡点下的理论课、刷题和考试数据',
    color: palette[index % palette.length],
  }
})

function buildTheoryId(row: AssignmentTheoryRow) {
  return `${row.sourceSheet}_${row.sourceRow}_${row.knowledgePoint}_${row.theoryTitle}`
}

function getKnowledgeType(row: AssignmentTheoryRow): AssignmentTheoryRow['knowledgeType'] {
  const status = String(row.learningStatusRaw || '').trim()
  if (status.includes('閫夊')) return 'optional'
  return row.knowledgeType === 'optional' ? 'optional' : 'required'
}

function renderResourceTitle(item: AssignmentResourceItem) {
  return item.displayTitle || item.questionTitle || item.rawTitle || '未命名资源'
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : completed
            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
            : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
          active
            ? 'bg-[var(--color-primary)] text-white'
            : completed
              ? 'bg-emerald-500 text-white'
              : 'bg-[var(--color-bg-left)] text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        {completed && !active ? '✓' : index}
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
  const item = useWorkbenchStore((state) => state.assignStudentItem)
  const close = useWorkbenchStore((state) => state.closeAssignStudent)
  const assignStudentTask = useWorkbenchStore((state) => state.assignStudentTask)

  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<VersionKey | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<string[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])
  const [rightTab, setRightTab] = useState<RightTab>('version')
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([])
  const [teacherLoading, setTeacherLoading] = useState(false)
  const [teacherLoadError, setTeacherLoadError] = useState('')

  useEffect(() => {
    let active = true
    setTeacherLoading(true)
    setTeacherLoadError('')

    api.get<TeacherOption[]>('/api/teacher/assignable-teachers')
      .then((rows) => {
        if (active) {
          setTeacherOptions(Array.isArray(rows) ? rows : [])
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setTeacherOptions([])
          setTeacherLoadError(error instanceof Error ? error.message : '老师列表加载失败')
        }
      })
      .finally(() => {
        if (active) {
          setTeacherLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!item) return
    setSelectedCheckpoint(null)
    setSelectedTeacherId(null)
    setSelectedVersion(null)
    setSelectedProvince(null)
    setSelectedKnowledgeIds([])
    setSelectedQuestionIds([])
    setSelectedExamIds([])
    setRightTab('version')
    setShowConfirm(false)
    setConfirmed(false)
  }, [item?.id])

  const library = useMemo<AssignmentCheckpointLibrary | null>(
    () => CHECKPOINT_ASSIGNMENT_LIBRARY.find((entry) => entry.checkpointName === selectedCheckpoint) ?? null,
    [selectedCheckpoint],
  )

  const theoryItems = library?.theoryRows ?? []
  const questionItems = library?.practiceItems ?? []
  const examItems = library?.examItems ?? []
  const selectedTeacher = teacherOptions.find((teacher) => teacher.id === selectedTeacherId) ?? null
  const selectedVersionOption = versions.find((version) => version.key === selectedVersion) ?? null
  const showTheoryStep = selectedVersion !== 'express' && selectedVersion !== 'premium'

  const provinceOptions = DEFAULT_PROVINCES

  const selectedProvinceOption = provinceOptions.find((option) => option.key === selectedProvince) ?? null

  const filteredTheoryItems = useMemo(
    () => theoryItems.filter((row) => matchesProvince(getTheoryProvinceKeys(row), selectedProvince)),
    [selectedProvince, theoryItems],
  )
  const filteredQuestionItems = useMemo(
    () => questionItems.filter((resource) => matchesProvince(getResourceProvinceKeys(resource), selectedProvince)),
    [questionItems, selectedProvince],
  )
  const filteredExamItems = useMemo(
    () => examItems.filter((resource) => matchesProvince(getResourceProvinceKeys(resource), selectedProvince)),
    [examItems, selectedProvince],
  )

  const knowledgeGroups = useMemo(() => {
    const map = new Map<string, KnowledgeGroup>()

    filteredTheoryItems.forEach((row) => {
      const key = row.knowledgePoint || buildTheoryId(row)
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: row.knowledgePoint || '未命名知识点',
          rows: [],
          knowledgeType: getKnowledgeType(row),
          desc: row.learningStatusRaw || row.courseStatus || '',
        })
      }
      const group = map.get(key)
      if (group && getKnowledgeType(row) === 'required') {
        group.knowledgeType = 'required'
        group.desc = row.learningStatusRaw || row.courseStatus || group.desc
      }
      group?.rows.push(row)
    })

    return Array.from(map.values())
  }, [filteredTheoryItems])

  const knowledgeIds = useMemo(() => knowledgeGroups.map((group) => group.key), [knowledgeGroups])
  const questionIds = useMemo(() => filteredQuestionItems.map((resource) => resource.id), [filteredQuestionItems])
  const examIds = useMemo(() => filteredExamItems.map((resource) => resource.id), [filteredExamItems])

  useEffect(() => {
    setSelectedProvince(null)
    setSelectedKnowledgeIds([])
    setSelectedQuestionIds([])
    setSelectedExamIds([])
    setRightTab('version')
  }, [selectedCheckpoint])

  useEffect(() => {
    if (!showTheoryStep) {
      setSelectedKnowledgeIds([])
      if (rightTab === 'course') {
        setRightTab('question')
      }
    }
  }, [rightTab, showTheoryStep])

  useEffect(() => {
    if (!selectedProvince) return
    if (!provinceOptions.some((option) => option.key === selectedProvince)) {
      setSelectedProvince(null)
    }
  }, [provinceOptions, selectedProvince])

  useEffect(() => {
    setSelectedKnowledgeIds((current) => {
      const defaults = showTheoryStep
        ? knowledgeGroups
          .filter((group) => group.knowledgeType === 'required')
          .map((group) => group.key)
        : []

      const validIds = new Set(knowledgeIds)
      const next = defaults.filter((id) => validIds.has(id))

      return sameStringArray(current, next) ? current : next
    })
  }, [knowledgeGroups, knowledgeIds, selectedProvince, showTheoryStep])

  useEffect(() => {
    setSelectedQuestionIds((current) => {
      const validIds = new Set(questionIds)
      const next = current.filter((id) => validIds.has(id))
      return sameStringArray(current, next) ? current : next
    })
  }, [questionIds])

  useEffect(() => {
    setSelectedExamIds((current) => {
      const validIds = new Set(examIds)
      const next = current.filter((id) => validIds.has(id))
      return sameStringArray(current, next) ? current : next
    })
  }, [examIds])

  if (!item) return null
  const activeItem = item

  function toggle(list: string[], setList: (ids: string[]) => void, id: string) {
    setList(list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id])
  }

  const selectedKnowledgeGroups = knowledgeGroups.filter((group) => selectedKnowledgeIds.includes(group.key))
  const selectedTheoryRows = theoryItems.filter((row) => {
    const knowledgeKey = row.knowledgePoint || buildTheoryId(row)
    return selectedKnowledgeIds.includes(knowledgeKey)
  })
  const selectedPracticeItems = questionItems.filter((row) => selectedQuestionIds.includes(row.id))
  const selectedExamItems = examItems.filter((row) => selectedExamIds.includes(row.id))

  const knowledgeItems = selectedKnowledgeGroups.map((group) => ({
    id: group.key,
    title: group.title,
    type: group.knowledgeType,
    desc: group.desc,
  }))

  const selectedKnowledgeNames = selectedKnowledgeGroups.map((group) => group.title)
  const requiresTheorySelection = showTheoryStep && knowledgeGroups.length > 0
  const requiresQuestionSelection = filteredQuestionItems.length > 0
  const requiresExamSelection = filteredExamItems.length > 0

  const canConfirm = Boolean(
    selectedCheckpoint
    && selectedTeacher
    && selectedVersionOption
    && selectedProvinceOption
    && (!requiresTheorySelection || selectedKnowledgeIds.length > 0)
    && (!requiresQuestionSelection || selectedQuestionIds.length > 0)
    && (!requiresExamSelection || selectedExamIds.length > 0),
  )

  const rightTabs: Array<{ key: RightTab; label: string; completed: boolean }> = [
    { key: 'version', label: '选择版本', completed: Boolean(selectedVersionOption) },
    { key: 'province', label: '选择省份', completed: Boolean(selectedProvinceOption) },
    ...(showTheoryStep
      ? [{ key: 'course' as RightTab, label: '选择知识点/理论课', completed: !requiresTheorySelection || selectedKnowledgeIds.length > 0 }]
      : []),
    { key: 'question', label: '选择刷题', completed: !requiresQuestionSelection || selectedQuestionIds.length > 0 },
    { key: 'exam', label: '选择考试', completed: !requiresExamSelection || selectedExamIds.length > 0 },
  ]

  const stepSummary = [
    selectedVersionOption ? `版本：${selectedVersionOption.name}` : null,
    selectedProvinceOption ? `省份：${selectedProvinceOption.label}` : null,
    showTheoryStep ? `知识点：${selectedKnowledgeIds.length}` : '知识点：已跳过',
    `刷题：${selectedQuestionIds.length}`,
    `考试：${selectedExamIds.length}`,
  ].filter(Boolean).join(' 路 ')

  const footerHint = !selectedCheckpoint
    ? '请先选择左侧卡点类型'
    : teacherLoading
      ? '带教老师列表加载中...'
      : teacherLoadError
        ? teacherLoadError
        : teacherOptions.length === 0
          ? '当前没有可分配的带教老师'
          : !selectedTeacher
      ? '请先选择左侧带教老师'
      : !selectedVersionOption
        ? '请选择版本'
        : !selectedProvinceOption
          ? '请选择省份'
          : requiresTheorySelection && selectedKnowledgeIds.length === 0
            ? '请选择知识点'
            : requiresQuestionSelection && selectedQuestionIds.length === 0
              ? '请选择刷题'
              : requiresExamSelection && selectedExamIds.length === 0
                ? '请选择考试'
                : `${selectedCheckpoint} 路 ${selectedTeacher.name} 路 ${stepSummary}`

  async function handleConfirm() {
    if (!selectedCheckpoint || !selectedTeacher || !selectedVersionOption || !selectedProvinceOption) return

    const theoryLessons = showTheoryStep
      ? selectedTheoryRows.map((row) => ({
          id: buildTheoryId(row),
          title: row.theoryTitle,
          scope: row.learningStatusRaw || row.courseStatus || '',
          videoId: row.videoId,
          preClassUrl: row.preClassUrl,
          analysisUrl: row.analysisUrl,
          noteText: row.noteText,
          knowledgeId: row.knowledgePoint,
          knowledgeTitle: row.knowledgePoint,
          knowledgeType: getKnowledgeType(row),
        }))
      : []

    await assignStudentTask(activeItem.id, {
      checkpointName: selectedCheckpoint,
      teacher: selectedTeacher,
      version: selectedVersionOption.key,
      versionName: selectedVersionOption.name,
      province: selectedProvinceOption.key,
      provinceLabel: selectedProvinceOption.label,
      knowledgeItems: showTheoryStep ? knowledgeItems : [],
      theoryLessons,
      practiceIds: selectedQuestionIds,
      examIds: selectedExamIds,
      practiceItems: selectedPracticeItems,
      examItems: selectedExamItems,
      detail: [
        selectedCheckpoint,
        selectedTeacher.name,
        selectedVersionOption.name,
        selectedProvinceOption.label,
        showTheoryStep ? `知识点：${selectedKnowledgeNames.join('、') || '无'}` : '知识点：已跳过',
        `刷题 ${selectedPracticeItems.length} 道`,
        `考试 ${selectedExamItems.length} 场`,
      ].join(' 路 '),
    })

    setConfirmed(true)
    window.setTimeout(() => {
      setConfirmed(false)
      setShowConfirm(false)
      close()
    }, 1200)
  }

  function renderRightContent() {
    if (rightTab === 'version') {
      return (
        <div className="grid gap-3 xl:grid-cols-2">
          {versions.map((version) => {
            const active = selectedVersion === version.key

            return (
              <button
                key={version.key}
                type="button"
                onClick={() => setSelectedVersion(version.key)}
                className={[
                  'rounded-2xl border p-5 text-left transition-all',
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={['text-base font-semibold', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                      {version.name}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)]">{version.price}</div>
                  </div>
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: version.color }} />
                </div>
                <div className="mt-4 space-y-2 text-xs text-[var(--color-text-secondary)]">
                  <div>{version.period}</div>
                  <div>{version.condition}</div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {version.benefits.map((benefit) => (
                      <span key={benefit} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] text-[var(--color-text-muted)]">
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )
    }

    if (rightTab === 'province') {
      return (
        <div className="space-y-4">
          <div className="text-xs text-[var(--color-text-muted)]">
            省份会影响知识点、刷题和考试内容的筛选。
          </div>
          <div className="flex flex-wrap gap-3">
            {provinceOptions.map((province) => {
              const active = selectedProvince === province.key
              return (
                <button
                  key={province.key}
                  type="button"
                  onClick={() => setSelectedProvince(province.key)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm transition-all',
                    active
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] font-semibold text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  {province.label}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (!library) {
      return <EmptyState text="请先在左侧选择卡点类型" />
    }

    if (!selectedProvinceOption) {
      return <EmptyState text="请先完成“选择省份”步骤" />
    }

    if (rightTab === 'course') {
      if (!showTheoryStep) {
        return <EmptyState text="当前版本不涉及“知识点/理论课”配置" />
      }

      if (knowledgeGroups.length === 0) {
        return <EmptyState text="当前省份下暂无可选知识点" />
      }

      return (
        <div className="space-y-4">
          <div className="text-xs text-[var(--color-text-muted)]">
            这里只选择知识点，系统会自动关联该知识点下的全部录播课。
          </div>
          <div className="space-y-2">
            {knowledgeGroups.map((group) => {
              const active = selectedKnowledgeIds.includes(group.key)
              const lessonCount = group.rows.length
              const provinceTags = uniqueStrings(group.rows.flatMap(getTheoryProvinceKeys))
              const subtitle = [
                group.desc || (group.knowledgeType === 'required' ? '必学知识点' : '选学知识点'),
                `关联 ${lessonCount} 节录播课`,
                provinceTags.length > 0 ? `适用：${provinceTags.join(' / ')}` : '通用内容',
              ].join(' 路 ')

              return (
                <CheckboxRow
                  key={group.key}
                  checked={active}
                  title={group.title}
                  subtitle={subtitle}
                  badge={group.knowledgeType === 'required' ? '必学' : '选学'}
                  onToggle={() => toggle(selectedKnowledgeIds, setSelectedKnowledgeIds, group.key)}
                />
              )
            })}
          </div>
        </div>
      )
    }

    if (rightTab === 'question') {
      if (filteredQuestionItems.length === 0) {
        return <EmptyState text="当前省份下暂无可选刷题" />
      }

      return (
        <div className="space-y-2">
          <div className="text-xs text-[var(--color-text-muted)]">
            已选 {selectedQuestionIds.length} / {filteredQuestionItems.length} 道刷题
          </div>
          {filteredQuestionItems.map((resource) => {
            const provinceKeys = getResourceProvinceKeys(resource)
            return (
              <CheckboxRow
                key={resource.id}
                checked={selectedQuestionIds.includes(resource.id)}
                title={renderResourceTitle(resource)}
                subtitle={[resource.slotKey, provinceKeys.length > 0 ? `适用：${provinceKeys.join(' / ')}` : '通用内容'].filter(Boolean).join(' 路 ')}
                onToggle={() => toggle(selectedQuestionIds, setSelectedQuestionIds, resource.id)}
              />
            )
          })}
        </div>
      )
    }

    if (filteredExamItems.length === 0) {
      return <EmptyState text="当前省份下暂无可选考试" />
    }

    return (
      <div className="space-y-2">
        <div className="text-xs text-[var(--color-text-muted)]">
          已选 {selectedExamIds.length} / {filteredExamItems.length} 场考试
        </div>
        {filteredExamItems.map((resource) => {
          const provinceKeys = getResourceProvinceKeys(resource)
          return (
            <CheckboxRow
              key={resource.id}
              checked={selectedExamIds.includes(resource.id)}
              title={renderResourceTitle(resource)}
              subtitle={[resource.slotKey, provinceKeys.length > 0 ? `适用：${provinceKeys.join(' / ')}` : '通用内容'].filter(Boolean).join(' 路 ')}
              onToggle={() => toggle(selectedExamIds, setSelectedExamIds, resource.id)}
            />
          )
        })}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" onClick={close}>
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative flex w-[min(1480px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ height: 'min(94vh,980px)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--color-border)] px-6 py-4">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">分配学员</div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            {activeItem.name}{activeItem.subtitle ? ` 路 ${activeItem.subtitle}` : ''}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[360px] shrink-0 flex-col overflow-auto border-r border-[var(--color-border)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">选择卡点类型</div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">这里展示的是已导入题库的卡点配置</div>
            </div>
            <div className="space-y-2 border-b border-[var(--color-border)] px-4 py-3">
              {checkpointOptions.map((checkpoint) => (
                <SelectCard
                  key={checkpoint.name}
                  active={selectedCheckpoint === checkpoint.name}
                  title={checkpoint.name}
                  subtitle={checkpoint.desc}
                  extra={<span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">{checkpoint.tag}</span>}
                  onClick={() => setSelectedCheckpoint(checkpoint.name)}
                />
              ))}
            </div>

            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">选择带教老师</div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">老师列表来自后端接口</div>
            </div>
            <div className="space-y-2 px-4 py-3">
              {teacherLoading && (
                <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">加载老师列表中...</div>
              )}
              {!teacherLoading && teacherLoadError && (
                <div className="py-6 text-center text-xs text-red-500">{teacherLoadError}</div>
              )}
              {!teacherLoading && !teacherLoadError && teacherOptions.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">暂无可用带教老师</div>
              )}
              {teacherOptions.map((teacher, index) => {
                const active = selectedTeacherId === teacher.id
                const color = teacher.color || palette[index % palette.length]

                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
                    ].join(' ')}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {teacher.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={['text-sm font-semibold', active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'].join(' ')}>
                        {teacher.name}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                        {teacher.roleLabel || teacher.role || teacher.title || '带教老师'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-[var(--color-border)] bg-white px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {rightTabs.map((tab, index) => (
                  <StepButton
                    key={tab.key}
                    index={index + 1}
                    title={tab.label}
                    active={rightTab === tab.key}
                    completed={tab.completed}
                    onClick={() => setRightTab(tab.key)}
                  />
                ))}
              </div>
              <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                {stepSummary || '请按上方步骤完成分配配置'}
              </div>
            </div>

            <div className="flex-1 overflow-auto px-5 py-4">
              {renderRightContent()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-3">
          <div className="text-[11px] text-[var(--color-text-muted)]">{footerHint}</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-left)]"
            >
              取消
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => setShowConfirm(true)}
              className={[
                'rounded-lg px-5 py-1.5 text-xs font-semibold text-white transition-all',
                canConfirm ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]' : 'cursor-not-allowed bg-[var(--color-primary)] opacity-40',
              ].join(' ')}
            >
              确认分配
            </button>
          </div>
        </div>

        {showConfirm ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30" onClick={() => setShowConfirm(false)}>
            <div className="w-[460px] rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">确认分配信息</div>
              <div className="mb-4 text-[11px] text-[var(--color-text-muted)]">请确认以下内容后提交</div>

              <div className="space-y-2.5 rounded-xl bg-[var(--color-bg-left)] px-4 py-3 text-xs">
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">学员</span><span className="text-right font-medium text-[var(--color-text-primary)]">{activeItem.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">卡点</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedCheckpoint}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">老师</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedTeacher?.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">版本</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedVersionOption?.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">省份</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedProvinceOption?.label}</span></div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[var(--color-text-muted)]">知识点</span>
                  <span className="text-right font-medium text-[var(--color-text-primary)]">
                    {showTheoryStep ? (selectedKnowledgeNames.join('、') || '未选择') : '当前版本不涉及'}
                  </span>
                </div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">自动关联录播课</span><span className="text-right font-medium text-[var(--color-text-primary)]">{showTheoryStep ? `${selectedTheoryRows.length} 节` : '0 节'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">刷题</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedQuestionIds.length} 道</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">考试</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedExamIds.length} 场</span></div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-left)]"
                >
                  返回修改
                </button>
                <button
                  type="button"
                  disabled={confirmed}
                  onClick={() => void handleConfirm()}
                  className={[
                    'rounded-lg px-5 py-1.5 text-xs font-semibold text-white transition-all',
                    confirmed ? 'bg-green-500' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]',
                  ].join(' ')}
                >
                  {confirmed ? '✓ 分配成功' : '确认提交'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

