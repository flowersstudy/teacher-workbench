import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  LEARNING_PATH_STAGE_ORDER,
  type LearningPathItem,
  type LearningPathStage,
  type LearningPathItemStatus,
  type LearningPathStageKey,
  type LearningPathTimeType,
} from '../../config/studentLearningPath'
import { fetchStudentLearningPath, updateStudentLearningPathTask, uploadPdf } from '../../api/learningPath'

const statusStyles: Record<LearningPathItemStatus, { dot: string; badge: string; label: string }> = {
  done:    { dot: 'bg-green-500',                    badge: 'border-green-200 bg-green-50 text-green-600',                                                                    label: '已完成' },
  current: { dot: 'bg-[var(--color-primary)]',       badge: 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]',                     label: '进行中' },
  pending: { dot: 'bg-gray-300',                     badge: 'border-gray-200 bg-gray-50 text-gray-500',                                                                       label: '未开始' },
}

type StageDisplayEntry =
  | { kind: 'item'; item: LearningPathItem }
  | { kind: 'group'; id: string; title: string; status: LearningPathItemStatus; items: LearningPathItem[] }

type StageCardEntry =
  | { kind: 'items'; id: string; items: LearningPathItem[] }
  | Extract<StageDisplayEntry, { kind: 'group' }>

const DIAGNOSE_GROUP_BLOCKS = [
  {
    key: 'paper',
    title: '试卷',
    itemIds: ['diagnose_paper', 'diagnose_paper_upload', 'diagnose_analysis_video', 'diagnose_paper_feedback'],
  },
  {
    key: 'course',
    title: '课程',
    itemIds: ['diagnose_live', 'diagnose_feedback', 'diagnose_replay', 'diagnose_handout'],
  },
] as const

const DIAGNOSE_GROUP_MAP = DIAGNOSE_GROUP_BLOCKS.reduce<Record<string, typeof DIAGNOSE_GROUP_BLOCKS[number]>>((result, group) => {
  group.itemIds.forEach((itemId) => {
    result[itemId] = group
  })
  return result
}, {})

function getItemsSummaryStatus(items: LearningPathItem[]): LearningPathItemStatus {
  if (items.length > 0 && items.every((item) => item.status === 'done')) return 'done'
  if (items.some((item) => item.status === 'current')) return 'current'
  return 'pending'
}

function isDeprecatedTheoryHandoutItem(item: LearningPathItem): boolean {
  const itemId = String(item.id || '').trim()
  return itemId === 'theory_handout'
}

function normalizeTheoryGroup(group: LearningPathStage['groups'][number]): LearningPathStage['groups'][number] {
  const items = (Array.isArray(group.items) ? group.items : []).filter((item) => !isDeprecatedTheoryHandoutItem(item))
  const isConsensusGroup = items.some((item) => String(item.id || '').trim() === 'theory_consensus_live')

  if (!isConsensusGroup) {
    return {
      ...group,
      items,
    }
  }

  return {
    ...group,
    title: '1v1共识',
    items,
  }
}

function buildDiagnoseDisplayEntries(items: LearningPathItem[]): StageDisplayEntry[] {
  const itemMap = new Map(items.map((item) => [item.id, item]))
  const addedGroups = new Set<string>()

  return items.reduce<StageDisplayEntry[]>((result, item) => {
    const group = DIAGNOSE_GROUP_MAP[item.id]
    if (!group) {
      result.push({ kind: 'item', item })
      return result
    }

    if (addedGroups.has(group.key)) {
      return result
    }

    const groupItems = group.itemIds
      .map((itemId) => itemMap.get(itemId))
      .filter((groupItem): groupItem is LearningPathItem => !!groupItem)

    result.push({
      kind: 'group',
      id: `diagnose_group_${group.key}`,
      title: group.title,
      status: getItemsSummaryStatus(groupItems),
      items: groupItems,
    })
    addedGroups.add(group.key)
    return result
  }, [])
}

function buildTrainingDisplayEntries(items: LearningPathItem[]): StageDisplayEntry[] {
  const rounds = new Map<number, LearningPathItem[]>()
  const ungroupedItems: LearningPathItem[] = []

  items.forEach((item) => {
    const matched = /^training_round_(\d+)_/.exec(String(item.id || ''))
    if (!matched) {
      ungroupedItems.push(item)
      return
    }

    const roundNumber = Number(matched[1] || 0)
    const roundItems = rounds.get(roundNumber) || []
    roundItems.push(item)
    rounds.set(roundNumber, roundItems)
  })

  const entries: StageDisplayEntry[] = ungroupedItems.map((item) => ({ kind: 'item', item }))
  const orderedRounds = [...rounds.keys()].sort((left, right) => left - right)

  orderedRounds.forEach((roundNumber) => {
    const roundItems = rounds.get(roundNumber) || []
    if (!roundItems.length) return

    entries.push({
      kind: 'group',
      id: `training_group_round_${roundNumber}`,
      title: `第${roundNumber}轮`,
      status: getItemsSummaryStatus(roundItems),
      items: roundItems,
    })
  })

  return entries
}

function buildStageCardEntries(entries: StageDisplayEntry[]): StageCardEntry[] {
  const cards: StageCardEntry[] = []
  let pendingItems: LearningPathItem[] = []
  let itemGroupIndex = 0

  function flushPendingItems() {
    if (!pendingItems.length) return
    cards.push({
      kind: 'items',
      id: `stage_items_${itemGroupIndex += 1}`,
      items: pendingItems,
    })
    pendingItems = []
  }

  entries.forEach((entry) => {
    if (entry.kind === 'item') {
      pendingItems.push(entry.item)
      return
    }

    flushPendingItems()
    cards.push(entry)
  })

  flushPendingItems()
  return cards
}

function getDefaultTimeType(item: LearningPathItem): LearningPathTimeType {
  return ['live', 'replay', 'schedule'].includes(String(item.actionType || '').trim())
    ? 'fixed'
    : 'deadline'
}

function getResolvedTimeType(item: LearningPathItem): LearningPathTimeType {
  return item.timeType === 'fixed' || item.timeType === 'deadline'
    ? item.timeType
    : getDefaultTimeType(item)
}

function buildTimeDisplayLabel(timeType: LearningPathTimeType, timeLabel: string): string {
  const safeTimeLabel = String(timeLabel || '').trim()
  if (!safeTimeLabel) return ''
  return `${timeType === 'deadline' ? '截止时间' : '固定时间'}：${safeTimeLabel}`
}
// ── ResourceEditor ────────────────────────────────────────────────────────────
function ResourceEditor({
  item,
  studentId,
  pointName,
  stageKey,
  onSaved,
}: {
  item: LearningPathItem
  studentId: string
  pointName: string
  stageKey: LearningPathStageKey
  onSaved: (taskId: string, url: string, videoId: string) => void
}) {
  const isPdf    = item.actionType === 'document'
  const isVideo  = item.actionType === 'video'
  const isLive   = item.actionType === 'live'
  const isReplay = item.actionType === 'replay'
  if (!isPdf && !isVideo && !isLive && !isReplay) return null

  const currentUrl     = isLive ? (item.resource?.liveUrl ?? item.resource?.url ?? '')
                       : isReplay ? (item.resource?.replayUrl ?? item.resource?.url ?? '')
                       : (item.resource?.url ?? '')
  const currentVideoId = item.resource?.videoId ?? ''

  const [open, setOpen]         = useState(false)
  const [url, setUrl]           = useState(currentUrl)
  const [videoId, setVideoId]   = useState(currentVideoId)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')
  const [uploading, setUploading] = useState(false)
  const [popupStyle, setPopupStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 点外部关闭
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)
        && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  // 打开时重置为当前值，并计算弹出位置
  function handleOpen() {
    const initUrl = isLive
      ? (item.resource?.liveUrl ?? item.resource?.url ?? '')
      : isReplay
        ? (item.resource?.replayUrl ?? item.resource?.url ?? '')
        : (item.resource?.url ?? '')
    setUrl(initUrl)
    setVideoId(item.resource?.videoId ?? '')
    setError('')
    setSaved(false)
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupStyle({ top: rect.bottom + 4, left: rect.left })
    }
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const resource = {
        resourceType: isPdf ? 'pdf' : isVideo ? 'video' : isLive ? 'live' : 'replay',
        title: item.title,
        url: url.trim(),
        videoId: videoId.trim(),
        ...(isLive   ? { liveUrl:   url.trim() } : {}),
        ...(isReplay ? { replayUrl: url.trim() } : {}),
      }
      await updateStudentLearningPathTask(studentId, item.id, {
        pointName,
        stageKey,
        status: item.status,
        resource,
      })
      onSaved(item.id, url.trim(), videoId.trim())
      setSaved(true)
      setTimeout(() => { setSaved(false); setOpen(false) }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const hasValue = (isLive || isReplay) ? !!currentUrl : isPdf ? !!currentUrl : !!currentVideoId

  const buttonLabel = hasValue
    ? (isPdf ? '已设置链接' : isVideo ? '已设置视频' : isLive ? '已设置上课链接' : '已设置回放链接')
    : (isPdf ? '设置链接'   : isVideo ? '设置视频'   : isLive ? '设置上课链接'   : '设置回放链接')

  return (
    <div className="min-w-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={[
          'flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] transition-colors',
          hasValue
            ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:border-[var(--color-primary)]'
            : 'border-dashed border-gray-300 bg-white text-gray-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
        ].join(' ')}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {hasValue
            ? <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>
            : <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>
          }
        </svg>
        {buttonLabel}
      </button>

      {open && createPortal(
        <div ref={wrapRef} style={{ position: 'fixed', top: popupStyle.top, left: popupStyle.left, zIndex: 9999 }} className="w-72 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-lg">
          <div className="mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
            {isPdf ? '设置文件链接' : isVideo ? '设置视频资源' : isLive ? '设置腾讯会议上课链接' : '设置腾讯会议回放链接'}
          </div>

          {isPdf && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] text-[var(--color-text-muted)]">文件 URL（PDF 直链）</div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploading(true)
                  setError('')
                  try {
                    const uploadedUrl = await uploadPdf(file)
                    setUrl(uploadedUrl)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '上传失败')
                  } finally {
                    setUploading(false)
                    e.target.value = ''
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border)] py-1.5 text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50"
              >
                {uploading ? '上传中…' : '或点击上传 PDF 文件'}
              </button>
            </div>
          )}

          {isVideo && (
            <>
              <div className="mb-2">
                <div className="mb-1 text-[10px] text-[var(--color-text-muted)]">视频 ID（保利威 videoId）</div>
                <input
                  type="text"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="vid_xxxxxxxx"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="mb-2">
                <div className="mb-1 text-[10px] text-[var(--color-text-muted)]">或直接填视频链接</div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </>
          )}

          {(isLive || isReplay) && (
            <div className="mb-2">
              <div className="mb-1 text-[10px] text-[var(--color-text-muted)]">
                {isLive ? '腾讯会议入会链接' : '腾讯会议回放链接'}
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="可填写腾讯会议链接、整段邀请文案或会议号"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          )}

          {!!error && <div className="mb-1.5 text-[10px] text-red-500">{error}</div>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]">
              取消
            </button>
            <button type="button" onClick={handleSave} disabled={saving || saved}
              className={[
                'flex-1 rounded-lg py-1 text-xs font-semibold transition-colors',
                saved ? 'bg-green-500 text-white' : 'bg-[var(--color-primary)] text-white hover:opacity-80 disabled:opacity-50',
              ].join(' ')}>
              {saved ? '已保存 ✓' : saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}

function TaskTimeEditor({
  item,
  studentId,
  pointName,
  stageKey,
  onSaved,
}: {
  item: LearningPathItem
  studentId: string
  pointName: string
  stageKey: LearningPathStageKey
  onSaved: (taskId: string, timeLabel: string, timeType: LearningPathTimeType) => void
}) {
  const [open, setOpen] = useState(false)
  const [timeLabel, setTimeLabel] = useState(item.timeLabel ?? '')
  const [timeType, setTimeType] = useState<LearningPathTimeType>(getResolvedTimeType(item))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setTimeLabel(item.timeLabel ?? '')
    setTimeType(getResolvedTimeType(item))
    setError('')
    setSaved(false)
  }, [item.id, item.timeLabel, item.timeType])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const nextTimeLabel = timeLabel.trim()
      await updateStudentLearningPathTask(studentId, item.id, {
        pointName,
        stageKey,
        status: item.status,
        timeLabel: nextTimeLabel,
        timeType,
      })
      onSaved(item.id, nextTimeLabel, timeType)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setOpen(false)
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const hasValue = !!String(item.timeLabel || '').trim()
  const buttonLabel = hasValue
    ? (getResolvedTimeType(item) === 'deadline' ? '已设置截止时间' : '已设置固定时间')
    : '设置时间'

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          setTimeLabel(item.timeLabel ?? '')
          setTimeType(getResolvedTimeType(item))
          setError('')
          setSaved(false)
        }}
        className={[
          'flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] transition-colors',
          hasValue
            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300'
            : 'border-dashed border-gray-300 bg-white text-gray-400 hover:border-amber-300 hover:text-amber-700',
        ].join(' ')}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
        {buttonLabel}
      </button>

      {open && (
        <div className="mt-2 w-64 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
          <div className="mb-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">阶段时间</div>
          <div className="mb-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">时间类型</div>
          <select
            value={timeType}
            onChange={(e) => setTimeType(e.target.value as LearningPathTimeType)}
            className="mb-2 w-full rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-amber-300"
          >
            <option value="fixed">固定时间</option>
            <option value="deadline">截止时间</option>
          </select>
          <input
            type="text"
            value={timeLabel}
            onChange={(e) => setTimeLabel(e.target.value)}
            placeholder="例如：周三 19:00-20:30"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2.5 py-1.5 text-xs outline-none focus:border-amber-300"
          />
          <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">支持日期、时间段或任意简短说明。</div>
          {!!error && <div className="mt-1.5 text-[10px] text-red-500">{error}</div>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setTimeLabel(item.timeLabel ?? '')
                setError('')
              }}
              className="flex-1 rounded-lg border border-[var(--color-border)] py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saved}
              className={[
                'flex-1 rounded-lg py-1 text-xs font-semibold transition-colors',
                saved ? 'bg-green-500 text-white' : 'bg-amber-500 text-white hover:opacity-80 disabled:opacity-50',
              ].join(' ')}
            >
              {saved ? '已保存' : saving ? '保存中' : '保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── LearningPathPanel ─────────────────────────────────────────────────────────
export function LearningPathPanel({ studentId, pointName }: { studentId: string; pointName: string }) {
  const [activeStage, setActiveStage] = useState<LearningPathStageKey>('diagnose')
  const [remoteStages, setRemoteStages] = useState<LearningPathStage[]>([])
  const [localOverrides, setLocalOverrides] = useState<Record<string, {
    url?: string
    videoId?: string
    timeLabel?: string
    timeType?: LearningPathTimeType
    timeDisplayLabel?: string
  }>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLocalOverrides({})
    setCollapsedGroups({})
  }, [studentId])

  useEffect(() => {
    let active = true
    setLocalOverrides({})
    setCollapsedGroups({})
    fetchStudentLearningPath(studentId, pointName)
      .then((payload) => {
        if (!active) return
        const stages = Array.isArray(payload?.stages) ? payload.stages : []
        setRemoteStages(stages)
        const preferred = stages.find((s) => s.groups.flatMap((g) => g.items || []).some((i) => i.status === 'current'))
          || stages.find((s) => s.groups.flatMap((g) => g.items || []).some((i) => i.status !== 'done'))
          || stages[0]
        if (preferred) setActiveStage(preferred.stageKey)
      })
      .catch(() => { if (!active) return; setRemoteStages([]) })
    return () => { active = false }
  }, [pointName, studentId])

  const resolvedStages = useMemo(() => {
    return LEARNING_PATH_STAGE_ORDER
      .map((stageKey) => remoteStages.find((stage) => stage.stageKey === stageKey) ?? null)
      .filter((stage): stage is LearningPathStage => !!stage)
  }, [remoteStages])

  const getStageStatus = (stage: LearningPathStage): LearningPathItemStatus => {
    const items = stage.groups.flatMap((g) => g.items || [])
    if (items.length > 0 && items.every((i) => i.status === 'done')) return 'done'
    if (items.some((i) => i.status === 'current')) return 'current'
    return 'pending'
  }

  const stageTabs = useMemo(() => (
    resolvedStages.map((s) => ({ key: s.stageKey, label: s.stageName, status: getStageStatus(s) }))
  ), [resolvedStages])

  const stage = useMemo(
    () => resolvedStages.find((s) => s.stageKey === activeStage) || resolvedStages[0],
    [activeStage, resolvedStages],
  )

  if (!stage || stageTabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        暂无后端学习路径数据
      </div>
    )
  }

  function handleResourceSaved(taskId: string, url: string, videoId: string) {
    setLocalOverrides((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        url,
        videoId,
      },
    }))
  }

  function handleTimeSaved(taskId: string, timeLabel: string, timeType: LearningPathTimeType) {
    setLocalOverrides((prev) => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || {}),
        timeLabel,
        timeType,
        timeDisplayLabel: buildTimeDisplayLabel(timeType, timeLabel),
      },
    }))
  }

  function toggleGroup(groupTitle: string) {
    setCollapsedGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }))
  }

  function isGroupCollapsible(groupTitle: string) {
    return activeStage === 'training' && !!groupTitle && groupTitle !== '实训路径'
  }

  function isGroupCollapsed(group: LearningPathStage['groups'][number]) {
    if (collapsedGroups[group.title] !== undefined) return collapsedGroups[group.title]
    // 默认：有 current 的展开，其余折叠
    const hasCurrent = (group.items || []).some((i) => i.status === 'current')
    return !hasCurrent
  }

  // 把本地覆盖合并进 item.resource
  function resolveItem(item: LearningPathItem): LearningPathItem {
    const ov = localOverrides[item.id]
    if (!ov) return item
    const isLiveOrReplay = item.actionType === 'live' || item.actionType === 'replay'
    return {
      ...item,
      timeLabel: ov.timeLabel ?? item.timeLabel,
      timeType: ov.timeType ?? item.timeType ?? getDefaultTimeType(item),
      timeDisplayLabel: ov.timeDisplayLabel ?? item.timeDisplayLabel ?? buildTimeDisplayLabel(
        (ov.timeType ?? item.timeType ?? getDefaultTimeType(item)) as LearningPathTimeType,
        ov.timeLabel ?? item.timeLabel ?? '',
      ),
      resource: {
        resourceType: item.actionType === 'document' ? 'pdf' : item.actionType === 'video' ? 'video' : item.actionType,
        title: item.title,
        url: isLiveOrReplay ? (item.resource?.url ?? '') : (ov.url ?? item.resource?.url ?? ''),
        videoId: ov.videoId ?? item.resource?.videoId,
        liveUrl: item.actionType === 'live' ? (ov.url ?? item.resource?.liveUrl ?? '') : (item.resource?.liveUrl ?? ''),
        replayUrl: item.actionType === 'replay' ? (ov.url ?? item.resource?.replayUrl ?? '') : (item.resource?.replayUrl ?? ''),
      },
    }
  }

  function renderItemContent(item: LearningPathItem) {
    const status = statusStyles[item.status]
    const isPdf = item.actionType === 'document'
    const isVideo = item.actionType === 'video'
    const isLive = item.actionType === 'live'
    const isReplay = item.actionType === 'replay'
    const hasResource = (isLive || isReplay) ? !!item.resource?.url : isPdf ? !!item.resource?.url : !!item.resource?.videoId

    return (
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.title}</span>
          <span className={['rounded-full border px-2 py-0.5 text-[10px] font-medium', status.badge].join(' ')}>
            {status.label}
          </span>
          {item.actionText && (
            <span className="rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
              {item.actionText}
            </span>
          )}
          {item.secondaryActionText && (
            <span className="rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
              {item.secondaryActionText}
            </span>
          )}
        </div>
        {(item.timeDisplayLabel || item.timeLabel) && (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 15" />
            </svg>
            <span>{item.timeDisplayLabel || item.timeLabel}</span>
          </div>
        )}
        {(isPdf || isVideo || isLive || isReplay) && (
          <div className="mt-1.5">
            {hasResource && (
              <div className="mb-1 flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2.5 py-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-primary)]">
                  {isPdf
                    ? <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>
                    : <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>
                  }
                </svg>
                <span className="min-w-0 flex-1 truncate text-[10px] text-[var(--color-text-secondary)]">
                  {isLive
                    ? (item.resource?.liveUrl ?? item.resource?.url ?? '')
                    : isReplay
                      ? (item.resource?.replayUrl ?? item.resource?.url ?? '')
                      : isPdf
                        ? (item.resource?.url ?? '')
                        : (item.resource?.videoId ? `videoId: ${item.resource.videoId}` : item.resource?.url ?? '')}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-2">
          <TaskTimeEditor
            item={item}
            studentId={studentId}
            pointName={pointName}
            stageKey={stage.stageKey}
            onSaved={handleTimeSaved}
          />
          {(isPdf || isVideo || isLive || isReplay) && (
            <ResourceEditor
              item={item}
              studentId={studentId}
              pointName={pointName}
              stageKey={stage.stageKey}
              onSaved={handleResourceSaved}
            />
          )}
        </div>
      </div>
    )
  }

  function renderTimelineItem(item: LearningPathItem, index: number, total: number) {
    const status = statusStyles[item.status]
    return (
      <div key={item.id} className="flex gap-3 py-3">
        <div className="flex w-4 shrink-0 flex-col items-center">
          <span className={['h-2.5 w-2.5 rounded-full', status.dot].join(' ')} />
          {index < total - 1 && <span className="mt-1 min-h-6 w-px flex-1 bg-[var(--color-border)]" />}
        </div>
        {renderItemContent(item)}
      </div>
    )
  }

  function renderGroupedTimeline(entry: Extract<StageDisplayEntry, { kind: 'group' }>, index: number, total: number) {
    const groupStatus = statusStyles[entry.status]

    return (
      <div key={entry.id} className="flex gap-3 py-3">
        <div className="flex w-4 shrink-0 flex-col items-center">
          <span className={['h-2.5 w-2.5 rounded-full', groupStatus.dot].join(' ')} />
          {index < total - 1 && <span className="mt-1 min-h-6 w-px flex-1 bg-[var(--color-border)]" />}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{entry.title}</span>
            </div>
            <div className="px-3">
              {entry.items.map((rawItem, groupIndex) => {
                const item = resolveItem(rawItem)
                return (
                  <div
                    key={item.id}
                    className={[
                      'py-3',
                      groupIndex < entry.items.length - 1 ? 'border-b border-[var(--color-border)]' : '',
                    ].join(' ')}
                  >
                    {renderItemContent(item)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderItemsCard(items: LearningPathItem[], key: string) {
    return (
      <div key={key} className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-1">
        {items.map((item, index) => renderTimelineItem(resolveItem(item), index, items.length))}
      </div>
    )
  }

  function renderTopLevelGroupedCard(entry: Extract<StageCardEntry, { kind: 'group' }>) {
    const doneCount = entry.items.filter((item) => item.status === 'done').length
    const allDone = entry.items.length > 0 && doneCount === entry.items.length

    return (
      <div key={entry.id} className="rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{entry.title}</span>
            {allDone && (
              <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">已完成</span>
            )}
            {!allDone && doneCount > 0 && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{doneCount}/{entry.items.length}</span>
            )}
          </div>
        </div>
        <div className="px-3 py-1">
          {entry.items.map((item, index) => renderTimelineItem(resolveItem(item), index, entry.items.length))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Stage tabs */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {stageTabs.map((tab) => {
            const s = statusStyles[tab.status]
            return (
              <button key={tab.key} type="button" onClick={() => setActiveStage(tab.key)}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  activeStage === tab.key
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                ].join(' ')}>
                <span className={['h-1.5 w-1.5 rounded-full', s.dot].join(' ')} />
                {tab.label}
              </button>
            )
          })}
        </div>
        <span className="flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[9px] text-green-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          已同步学生端
        </span>
      </div>

      {/* Stage content */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">

        <div className="space-y-3 p-3">
          {stage.groups.map((group) => {
            const displayGroup = stage.stageKey === 'theory' ? normalizeTheoryGroup(group) : group
            const collapsible = isGroupCollapsible(displayGroup.title)
            const collapsed   = collapsible && isGroupCollapsed(displayGroup)
            const items       = displayGroup.items || []
            const doneCount   = items.filter((i) => i.status === 'done').length
            const allDone     = items.length > 0 && doneCount === items.length
            const shouldPromoteGroupedCards = stage.stageKey === 'diagnose' || stage.stageKey === 'training'
            const displayEntries = stage.stageKey === 'diagnose'
              ? buildDiagnoseDisplayEntries(items)
              : stage.stageKey === 'training'
                ? buildTrainingDisplayEntries(items)
                : items.map((item) => ({ kind: 'item', item } as StageDisplayEntry))
            const cardEntries = buildStageCardEntries(displayEntries)

            if (shouldPromoteGroupedCards) {
              return (
                <div key={displayGroup.title} className="space-y-3">
                  {cardEntries.map((entry) => {
                    if (entry.kind === 'group') {
                      return renderTopLevelGroupedCard(entry)
                    }

                    return renderItemsCard(entry.items, entry.id)
                  })}
                </div>
              )
            }

            return (
              <div key={displayGroup.title} className="rounded-xl border border-[var(--color-border)]">
                <div
                  className={[
                    'flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2',
                    collapsible ? 'cursor-pointer select-none hover:bg-[var(--color-bg-hover,#f8fafc)]' : '',
                  ].join(' ')}
                  onClick={collapsible ? () => toggleGroup(displayGroup.title) : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{displayGroup.title}</span>
                    {collapsible && allDone && (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">已完成</span>
                    )}
                    {collapsible && !allDone && doneCount > 0 && (
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">{doneCount}/{items.length}</span>
                    )}
                  </div>
                  {collapsible && (
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      className={['text-[var(--color-text-muted)] transition-transform', collapsed ? '' : 'rotate-180'].join(' ')}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </div>
                {!collapsed && (
                  <div className="px-3 py-1">
                    {displayEntries.map((entry, index, displayEntriesList) => {
                      if (entry.kind === 'group') {
                        return renderGroupedTimeline(entry, index, displayEntriesList.length)
                      }

                      return renderTimelineItem(resolveItem(entry.item), index, displayEntriesList.length)
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
