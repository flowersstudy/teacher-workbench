import { useEffect, useState } from 'react'
import {
  saveStudentReviewOverview,
  type ReviewOverview,
  type ReviewPointRate,
  type ReviewPointStatus,
  type ReviewPointStatusValue,
} from '../../api/reviewOverview'

const POINT_LIST = [
  { id: 1, name: '要点不全不准' },
  { id: 2, name: '提炼转述困难' },
  { id: 3, name: '分析结构不清' },
  { id: 4, name: '公文结构不清' },
  { id: 5, name: '对策推导困难' },
  { id: 6, name: '作文立意不准' },
  { id: 7, name: '作文论证不清' },
  { id: 8, name: '作文表达不畅' },
]

const STATUS_OPTIONS: { value: ReviewPointStatusValue; label: string }[] = [
  { value: 'locked', label: '未开始' },
  { value: 'pending', label: '待推进' },
  { value: 'learning', label: '学习中' },
  { value: 'completed', label: '已完成' },
]

function parseNum(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

interface PointDraft {
  currentRate: string
  targetRate: string
  status: ReviewPointStatusValue
}

interface FormState {
  targetExam: string
  entryScore: string
  currentScore: string
  targetScore: string
  points: PointDraft[]
}

function buildInitialForm(data: ReviewOverview | null): FormState {
  const points = POINT_LIST.map((point) => {
    const rate = data?.pointRates?.find((r) => r.pointName === point.name)
    const status = data?.pointStatuses?.find((s) => s.pointName === point.name)
    return {
      currentRate: rate?.currentRate != null ? String(rate.currentRate) : '',
      targetRate: rate?.targetRate != null ? String(rate.targetRate) : '',
      status: (status?.status ?? 'locked') as ReviewPointStatusValue,
    }
  })

  return {
    targetExam: data?.targetExam ?? '',
    entryScore: data?.progress?.entryScore != null ? String(data.progress.entryScore) : '',
    currentScore: data?.progress?.currentScore != null ? String(data.progress.currentScore) : '',
    targetScore: data?.progress?.targetScore != null ? String(data.progress.targetScore) : '',
    points,
  }
}

function buildPayload(form: FormState): ReviewOverview {
  const pointRates: ReviewPointRate[] = POINT_LIST.map((point, i) => ({
    pointName: point.name,
    currentRate: parseNum(form.points[i].currentRate),
    targetRate: parseNum(form.points[i].targetRate),
    sortOrder: i + 1,
    sourceType: 'monthly_review' as const,
  }))

  const pointStatuses: ReviewPointStatus[] = POINT_LIST.map((point, i) => ({
    pointId: point.id,
    pointName: point.name,
    status: form.points[i].status,
  }))

  return {
    targetExam: form.targetExam.trim() || null,
    progress: {
      entryScore: parseNum(form.entryScore),
      currentScore: parseNum(form.currentScore),
      targetScore: parseNum(form.targetScore),
    },
    pointRates,
    pointStatuses,
  }
}

export function ReviewOverviewModal({
  studentId,
  initialData,
  onClose,
  onSaved,
}: {
  studentId: string
  initialData: ReviewOverview | null
  onClose: () => void
  onSaved: (data: ReviewOverview) => void
}) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(initialData))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(buildInitialForm(initialData))
  }, [initialData])

  function setPoint(index: number, patch: Partial<PointDraft>) {
    setForm((prev) => {
      const points = prev.points.map((p, i) => (i === index ? { ...p, ...patch } : p))
      return { ...prev, points }
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = buildPayload(form)
      const result = await saveStudentReviewOverview(studentId, payload)
      onSaved(result)
      onClose()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">录入复盘数据</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 目标考试 */}
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">目标考试</div>
            <input
              type="text"
              value={form.targetExam}
              onChange={(e) => setForm((prev) => ({ ...prev, targetExam: e.target.value }))}
              placeholder="如：27年浙江省考"
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* 分数进度 */}
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">申论分数进度</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '入学诊断分', key: 'entryScore' as const },
                { label: '当前诊断分', key: 'currentScore' as const },
                { label: '进面目标分', key: 'targetScore' as const },
              ].map(({ label, key }) => (
                <div key={key} className="rounded-xl bg-[var(--color-bg-left)] px-3 py-2.5">
                  <div className="text-[10px] text-[var(--color-text-muted)]">{label}</div>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="-"
                    className="mt-1 w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 卡点掌握率 + 状态 */}
          <div>
            <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">卡点掌握情况</div>
            <div className="space-y-2">
              {POINT_LIST.map((point, i) => (
                <div
                  key={point.id}
                  className="rounded-xl border border-[var(--color-border)] px-3 py-2.5"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-bg-left)] text-[10px] font-semibold text-[var(--color-text-muted)]">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{point.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-[var(--color-bg-left)] px-2 py-1.5">
                      <div className="text-[10px] text-[var(--color-text-muted)]">当前掌握率%</div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.points[i].currentRate}
                        onChange={(e) => setPoint(i, { currentRate: e.target.value })}
                        placeholder="-"
                        className="mt-0.5 w-full bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
                      />
                    </div>
                    <div className="rounded-lg bg-[var(--color-bg-left)] px-2 py-1.5">
                      <div className="text-[10px] text-[var(--color-text-muted)]">目标掌握率%</div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.points[i].targetRate}
                        onChange={(e) => setPoint(i, { targetRate: e.target.value })}
                        placeholder="-"
                        className="mt-0.5 w-full bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
                      />
                    </div>
                    <div className="rounded-lg bg-[var(--color-bg-left)] px-2 py-1.5">
                      <div className="text-[10px] text-[var(--color-text-muted)]">状态</div>
                      <select
                        value={form.points[i].status}
                        onChange={(e) => setPoint(i, { status: e.target.value as ReviewPointStatusValue })}
                        className="mt-0.5 w-full bg-transparent text-xs text-[var(--color-text-primary)] outline-none"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2 text-xs text-red-500">{error}</div>
        )}

        <div className="flex gap-3 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex-1 rounded-xl bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
