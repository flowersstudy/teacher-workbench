import { useEffect, useMemo, useState } from 'react'
import {
  buildTeacherLearningPathStage,
  getRecommendedLearningPathStage,
  LEARNING_PATH_STAGE_ORDER,
  type LearningPathStage,
  type LearningPathItemStatus,
  type LearningPathStageKey,
} from '../../config/studentLearningPath'
import { fetchStudentLearningPath } from '../../api/learningPath'

const statusStyles: Record<LearningPathItemStatus, { dot: string; badge: string; label: string }> = {
  done: { dot: 'bg-green-500', badge: 'border-green-200 bg-green-50 text-green-600', label: '已完成' },
  current: { dot: 'bg-[var(--color-primary)]', badge: 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]', label: '进行中' },
  pending: { dot: 'bg-gray-300', badge: 'border-gray-200 bg-gray-50 text-gray-500', label: '未开始' },
}

function ActionPill({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'secondary' }) {
  return (
    <span
      className={[
        'rounded-full border px-2 py-0.5 text-[10px] font-medium',
        tone === 'primary'
          ? 'border-[var(--color-primary)]/20 bg-[var(--color-primary-light)] text-[var(--color-primary)]'
          : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]',
      ].join(' ')}
    >
      {label}
    </span>
  )
}

export function LearningPathPanel({ studentId, pointName }: { studentId: string; pointName: string }) {
  const [activeStage, setActiveStage] = useState<LearningPathStageKey>(() => getRecommendedLearningPathStage(studentId))
  const [remoteStages, setRemoteStages] = useState<LearningPathStage[] | null>(null)

  useEffect(() => {
    setActiveStage(getRecommendedLearningPathStage(studentId))
  }, [studentId])

  useEffect(() => {
    let active = true

    fetchStudentLearningPath(studentId, pointName)
      .then((payload) => {
        if (!active) return
        const stages = Array.isArray(payload?.stages) ? payload.stages : []
        setRemoteStages(stages)
        const preferredStage = stages.find((stage) => stage.groups.flatMap((group) => group.items || []).some((item) => item.status === 'current'))
          || stages.find((stage) => stage.groups.flatMap((group) => group.items || []).some((item) => item.status !== 'done'))
          || stages[0]
        if (preferredStage) {
          setActiveStage(preferredStage.stageKey)
        }
      })
      .catch(() => {
        if (!active) return
        setRemoteStages(null)
      })

    return () => {
      active = false
    }
  }, [pointName, studentId])

  const resolvedStages = useMemo(() => {
    if (Array.isArray(remoteStages) && remoteStages.length > 0) {
      return remoteStages
    }
    return LEARNING_PATH_STAGE_ORDER.map((stageKey) => buildTeacherLearningPathStage(studentId, stageKey, pointName))
  }, [pointName, remoteStages, studentId])

  const getStageStatus = (stage: LearningPathStage): LearningPathItemStatus => {
    const items = stage.groups.flatMap((group) => group.items || [])
    if (items.length > 0 && items.every((item) => item.status === 'done')) return 'done'
    if (items.some((item) => item.status === 'current')) return 'current'
    return 'pending'
  }

  const stageTabs = useMemo(() => (
    resolvedStages.map((stage) => ({
      key: stage.stageKey,
      label: stage.stageName,
      status: getStageStatus(stage),
    }))
  ), [resolvedStages])

  const stage = useMemo(
    () => resolvedStages.find((item) => item.stageKey === activeStage)
      || resolvedStages[0]
      || buildTeacherLearningPathStage(studentId, activeStage, pointName),
    [activeStage, pointName, resolvedStages, studentId],
  )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {stageTabs.map((tab) => {
            const status = statusStyles[tab.status]
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStage(tab.key)}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  activeStage === tab.key
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                ].join(' ')}
              >
                <span className={['h-1.5 w-1.5 rounded-full', status.dot].join(' ')} />
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

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{stage.sectionTitle}</span>
            <span className="rounded-full border border-[var(--color-border)] bg-white px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              {stage.stageIndex}
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{pointName || stage.pointName || '当前卡点'}</div>
          <div className="mt-1 text-[11px] leading-5 text-[var(--color-text-muted)]">{stage.stageSubtitle}</div>
        </div>

        <div className="space-y-3 p-3">
          {stage.groups.map((group) => (
            <div key={group.title} className="rounded-xl border border-[var(--color-border)]">
              <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                {group.title}
              </div>
              <div className="px-3 py-1">
                {group.items.map((item, index) => {
                  const status = statusStyles[item.status]
                  return (
                    <div key={item.id} className="flex gap-3 py-3">
                      <div className="flex w-4 shrink-0 flex-col items-center">
                        <span className={['h-2.5 w-2.5 rounded-full', status.dot].join(' ')} />
                        {index < group.items.length - 1 && <span className="mt-1 min-h-6 w-px flex-1 bg-[var(--color-border)]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.title}</span>
                          <span className={['rounded-full border px-2 py-0.5 text-[10px] font-medium', status.badge].join(' ')}>
                            {status.label}
                          </span>
                          {item.actionText && <ActionPill label={item.actionText} />}
                          {item.secondaryActionText && <ActionPill label={item.secondaryActionText} tone="secondary" />}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{item.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
