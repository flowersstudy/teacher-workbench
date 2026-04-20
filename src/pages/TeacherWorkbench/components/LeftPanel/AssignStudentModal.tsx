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
  '鍥借€?,
  '鍖椾含',
  '澶╂触',
  '娌冲寳',
  '灞辫タ',
  '鍐呰挋鍙?,
  '杈藉畞',
  '鍚夋灄',
  '榛戦緳姹?,
  '涓婃捣',
  '姹熻嫃',
  '娴欐睙',
  '瀹夊窘',
  '绂忓缓',
  '姹熻タ',
  '灞变笢',
  '娌冲崡',
  '婀栧寳',
  '婀栧崡',
  '鍥涘窛',
  '閲嶅簡',
  '璐靛窞',
  '浜戝崡',
  '瑗胯棌',
  '闄曡タ',
  '鐢樿們',
  '闈掓捣',
  '瀹佸',
  '鏂扮枂',
  '骞胯タ',
  '娴峰崡',
  '骞夸笢',
  '娣卞湷',
  '棣欐腐',
  '婢抽棬',
  '鍙版咕',
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
    name: '鏍囧噯鐗?,
    price: '1080 / 1680',
    period: '棣栬疆绐佺牬 7 澶?路 鏈堝害鍒烽鍒拌€冨墠',
    condition: '澶囪€冩椂闂寸浉瀵瑰厖瓒筹紝浼樺厛寤鸿鏍囧噯鐗?,
    color: '#e8845a',
    benefits: ['1 鑺傚叡璇嗚', '1 鑺傜籂鍋忚', '閰嶅鐞嗚璇?, '鍒烽涓庝汉宸ユ壒鏀?, '鍗＄偣鑰冭瘯涓庢姤鍛?],
  },
  {
    key: 'express',
    name: '鏋侀€熺増',
    price: '1680 / 1980',
    period: '鑰冨墠鍐插埡 3-7 澶?,
    condition: '鏃堕棿绱с€佺悊瑙ｈ兘鍔涘己鐨勫鍛樻洿閫傚悎',
    color: '#4a90d9',
    benefits: ['2 鑺傜籂鍋忚', '3 閬撶籂鍋忎綔涓?, '1 濂楄涔夎祫鏂?, '2 娆″崱鐐硅€冭瘯'],
  },
  {
    key: 'premium',
    name: '灏婁韩鐗?,
    price: '3080',
    period: '鑰冨墠鍐插埡 3-7 澶?,
    condition: '鏃堕棿绱с€侀渶瑕佹洿寮鸿窡杩涚殑瀛﹀憳鏇撮€傚悎',
    color: '#7c3aed',
    benefits: ['4 鑺傜籂鍋忚', '6 閬撶籂鍋忎綔涓?, '3 娆″崱鐐硅€冭瘯', '鏇村浜哄伐璺熻繘'],
  },
]

const checkpointOptions = CHECKPOINT_ASSIGNMENT_LIBRARY.map((item, index) => {
  const uniqueKnowledgePoints = Array.from(new Set(item.theoryRows.map((row) => row.knowledgePoint))).filter(Boolean)

  return {
    name: item.checkpointName,
    tag: item.theoryRows.some((row) => getKnowledgeType(row) === 'required') ? '蹇呭' : '鍗＄偣',
    desc: uniqueKnowledgePoints.slice(0, 2).join(' / ') || '宸插鍏ヨ鍗＄偣涓嬬殑鐞嗚璇俱€佸埛棰樺拰鑰冭瘯鏁版嵁',
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
  return item.displayTitle || item.questionTitle || item.rawTitle || '鏈懡鍚嶈祫婧?
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
        {completed && !active ? '鉁? : index}
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
          title: row.knowledgePoint || '鏈懡鍚嶇煡璇嗙偣',
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
    { key: 'version', label: '閫夋嫨鐗堟湰', completed: Boolean(selectedVersionOption) },
    { key: 'province', label: '閫夋嫨鐪佷唤', completed: Boolean(selectedProvinceOption) },
    ...(showTheoryStep
      ? [{ key: 'course' as RightTab, label: '閫夋嫨鐭ヨ瘑鐐?鐞嗚璇?, completed: !requiresTheorySelection || selectedKnowledgeIds.length > 0 }]
      : []),
    { key: 'question', label: '閫夋嫨鍒烽', completed: !requiresQuestionSelection || selectedQuestionIds.length > 0 },
    { key: 'exam', label: '閫夋嫨鑰冭瘯', completed: !requiresExamSelection || selectedExamIds.length > 0 },
  ]

  const stepSummary = [
    selectedVersionOption ? `鐗堟湰锛?{selectedVersionOption.name}` : null,
    selectedProvinceOption ? `鐪佷唤锛?{selectedProvinceOption.label}` : null,
    showTheoryStep ? `鐭ヨ瘑鐐癸細${selectedKnowledgeIds.length}` : '鐭ヨ瘑鐐癸細宸茶烦杩?,
    `鍒烽锛?{selectedQuestionIds.length}`,
    `鑰冭瘯锛?{selectedExamIds.length}`,
  ].filter(Boolean).join(' 路 ')

  const footerHint = !selectedCheckpoint
    ? '璇峰厛閫夋嫨宸︿晶鍗＄偣绫诲瀷'
    : teacherLoading
      ? '甯︽暀鑰佸笀鍒楄〃鍔犺浇涓?'
      : teacherLoadError
        ? teacherLoadError
        : teacherOptions.length === 0
          ? '褰撳墠娌℃湁鍙垎閰嶇殑甯︽暀鑰佸笀'
    : !selectedTeacher
      ? '璇峰厛閫夋嫨宸︿晶甯︽暀鑰佸笀'
      : !selectedVersionOption
        ? '璇烽€夋嫨鐗堟湰'
        : !selectedProvinceOption
          ? '璇烽€夋嫨鐪佷唤'
          : requiresTheorySelection && selectedKnowledgeIds.length === 0
            ? '璇烽€夋嫨鐭ヨ瘑鐐?
            : requiresQuestionSelection && selectedQuestionIds.length === 0
              ? '璇烽€夋嫨鍒烽'
              : requiresExamSelection && selectedExamIds.length === 0
                ? '璇烽€夋嫨鑰冭瘯'
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
        showTheoryStep ? `鐭ヨ瘑鐐?${selectedKnowledgeNames.join('銆?) || '鏃?}` : '鐭ヨ瘑鐐硅烦杩?,
        `鍒烽 ${selectedPracticeItems.length} 閬揱,
        `鑰冭瘯 ${selectedExamItems.length} 鍦篳,
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
            鐪佷唤浼氬奖鍝嶇煡璇嗙偣銆佸埛棰樺拰鑰冭瘯鍐呭鐨勭瓫閫夈€?          </div>
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
      return <EmptyState text="璇峰厛鍦ㄥ乏渚ч€夋嫨鍗＄偣绫诲瀷" />
    }

    if (!selectedProvinceOption) {
      return <EmptyState text="璇峰厛瀹屾垚鈥滈€夋嫨鐪佷唤鈥濇楠? />
    }

    if (rightTab === 'course') {
      if (!showTheoryStep) {
        return <EmptyState text="褰撳墠鐗堟湰涓嶆秹鍙娾€滅煡璇嗙偣-鐞嗚璇锯€濋厤缃? />
      }

      if (knowledgeGroups.length === 0) {
        return <EmptyState text="褰撳墠鐪佷唤涓嬫殏鏃犲彲閫夌煡璇嗙偣" />
      }

      return (
        <div className="space-y-4">
          <div className="text-xs text-[var(--color-text-muted)]">
            杩欓噷鍙€夋嫨鐭ヨ瘑鐐癸紝绯荤粺浼氳嚜鍔ㄥ甫涓婅鐭ヨ瘑鐐瑰叧鑱旂殑鍏ㄩ儴褰曟挱璇俱€?          </div>
          <div className="space-y-2">
            {knowledgeGroups.map((group) => {
              const active = selectedKnowledgeIds.includes(group.key)
              const lessonCount = group.rows.length
              const provinceTags = uniqueStrings(group.rows.flatMap(getTheoryProvinceKeys))
              const subtitle = [
                group.desc || (group.knowledgeType === 'required' ? '蹇呭鐭ヨ瘑鐐? : '閫夊鐭ヨ瘑鐐?),
                `鍏宠仈 ${lessonCount} 鑺傚綍鎾`,
                provinceTags.length > 0 ? `閫傜敤锛?{provinceTags.join(' / ')}` : '閫氱敤鍐呭',
              ].join(' 路 ')

              return (
                <CheckboxRow
                  key={group.key}
                  checked={active}
                  title={group.title}
                  subtitle={subtitle}
                  badge={group.knowledgeType === 'required' ? '蹇呭' : '閫夊'}
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
        return <EmptyState text="褰撳墠鐪佷唤涓嬫殏鏃犲彲閫夊埛棰? />
      }

      return (
        <div className="space-y-2">
          <div className="text-xs text-[var(--color-text-muted)]">
            宸查€?{selectedQuestionIds.length} / {filteredQuestionItems.length} 閬撳埛棰?          </div>
          {filteredQuestionItems.map((resource) => {
            const provinceKeys = getResourceProvinceKeys(resource)
            return (
              <CheckboxRow
                key={resource.id}
                checked={selectedQuestionIds.includes(resource.id)}
                title={renderResourceTitle(resource)}
                subtitle={[resource.slotKey, provinceKeys.length > 0 ? `閫傜敤锛?{provinceKeys.join(' / ')}` : '閫氱敤鍐呭'].filter(Boolean).join(' 路 ')}
                onToggle={() => toggle(selectedQuestionIds, setSelectedQuestionIds, resource.id)}
              />
            )
          })}
        </div>
      )
    }

    if (filteredExamItems.length === 0) {
      return <EmptyState text="褰撳墠鐪佷唤涓嬫殏鏃犲彲閫夎€冭瘯" />
    }

    return (
      <div className="space-y-2">
        <div className="text-xs text-[var(--color-text-muted)]">
          宸查€?{selectedExamIds.length} / {filteredExamItems.length} 鍦鸿€冭瘯
        </div>
        {filteredExamItems.map((resource) => {
          const provinceKeys = getResourceProvinceKeys(resource)
          return (
            <CheckboxRow
              key={resource.id}
              checked={selectedExamIds.includes(resource.id)}
              title={renderResourceTitle(resource)}
              subtitle={[resource.slotKey, provinceKeys.length > 0 ? `閫傜敤锛?{provinceKeys.join(' / ')}` : '閫氱敤鍐呭'].filter(Boolean).join(' 路 ')}
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
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">鍒嗛厤瀛﹀憳</div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            {activeItem.name}{activeItem.subtitle ? ` 路 ${activeItem.subtitle}` : ''}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-[360px] shrink-0 flex-col overflow-auto border-r border-[var(--color-border)]">
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">閫夋嫨鍗＄偣绫诲瀷</div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">杩欓噷灞曠ず鐨勬槸宸插鍏ラ搴撶殑鍗＄偣閰嶇疆</div>
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
              <div className="text-xs font-semibold text-[var(--color-text-secondary)]">閫夋嫨甯︽暀鑰佸笀</div>
              <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">鑰佸笀鍒楄〃鏉ヨ嚜鍚庣鎺ュ彛</div>
            </div>
            <div className="space-y-2 px-4 py-3">
              {teacherLoading && (
                <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">鍔犺浇鑰佸笀鍒楄〃涓?...</div>
              )}
              {!teacherLoading && teacherLoadError && (
                <div className="py-6 text-center text-xs text-red-500">{teacherLoadError}</div>
              )}
              {!teacherLoading && !teacherLoadError && teacherOptions.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">鏆傛棤鍙敤甯︽暀鑰佸笀</div>
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
                        {teacher.roleLabel || teacher.role || teacher.title || '甯︽暀鑰佸笀'}
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
                {stepSummary || '璇锋寜涓婃柟姝ラ瀹屾垚鍒嗛厤閰嶇疆'}
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
              鍙栨秷
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
              纭鍒嗛厤
            </button>
          </div>
        </div>

        {showConfirm ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30" onClick={() => setShowConfirm(false)}>
            <div className="w-[460px] rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">纭鍒嗛厤淇℃伅</div>
              <div className="mb-4 text-[11px] text-[var(--color-text-muted)]">璇风‘璁や互涓嬪唴瀹瑰悗鎻愪氦</div>

              <div className="space-y-2.5 rounded-xl bg-[var(--color-bg-left)] px-4 py-3 text-xs">
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">瀛﹀憳</span><span className="text-right font-medium text-[var(--color-text-primary)]">{activeItem.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鍗＄偣</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedCheckpoint}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鑰佸笀</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedTeacher?.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鐗堟湰</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedVersionOption?.name}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鐪佷唤</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedProvinceOption?.label}</span></div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[var(--color-text-muted)]">鐭ヨ瘑鐐?/span>
                  <span className="text-right font-medium text-[var(--color-text-primary)]">
                    {showTheoryStep ? (selectedKnowledgeNames.join('銆?) || '鏈€夋嫨') : '褰撳墠鐗堟湰涓嶆秹鍙?}
                  </span>
                </div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鑷姩鍏宠仈褰曟挱璇?/span><span className="text-right font-medium text-[var(--color-text-primary)]">{showTheoryStep ? `${selectedTheoryRows.length} 鑺俙 : '0 鑺?}</span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鍒烽</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedQuestionIds.length} 閬?/span></div>
                <div className="flex justify-between gap-4"><span className="text-[var(--color-text-muted)]">鑰冭瘯</span><span className="text-right font-medium text-[var(--color-text-primary)]">{selectedExamIds.length} 鍦?/span></div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-left)]"
                >
                  杩斿洖淇敼
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
                  {confirmed ? '鉁?鍒嗛厤鎴愬姛' : '纭鎻愪氦'}
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

