import { useMemo, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { kpointDeliveries, studentExamPlans, blockageData, studentLastActiveDays, kpointTypeStats, teacherPassRates, examCycleStats, variableCorrelations } from '../../mock/workbenchMock'
import type { StudentExamPlan } from '../../mock/workbenchMock'

// ── 色板（围绕主题暖橙 #e8845a 统一设计）─────────────────────────────────────
//  暖橙系：primary #e8845a / 砖红 #c4533a / 蜂蜜琥珀 #c87d2a
//  中性暖：暖灰 #a09890 / 暖白底 #faf8f6
//  对比色：鼠尾草绿 #4f9e72（好的状态）/ 浅靛 #5580b8（进行中）/ 烟紫 #7d6498（特殊）

const STATUS_META = {
  in_progress: { label: '交付中',  color: '#e8845a', bg: '#fff0e8', barColor: '#e8845a' },
  completed:   { label: '已完成',  color: '#4f9e72', bg: '#edf7f2', barColor: '#4f9e72' },
  not_started: { label: '未开始',  color: '#a09890', bg: '#f5f3f1', barColor: '#c8c0b8' },
} as const

const BLOCKAGE_META = {
  notStarted:        { label: '未开始',         color: '#a09890', bg: '#f5f3f1', border: '#d4ccc8' },
  inLearning:        { label: '学习中',         color: '#5580b8', bg: '#eef3fb', border: '#a8bcd8' },
  pendingTeacher:    { label: '待老师处理',      color: '#c87d2a', bg: '#fdf5e8', border: '#ecc87a' },
  pendingAssignment: { label: '作业/反馈未完成', color: '#c4533a', bg: '#fdf0ed', border: '#e8a898' },
  learnedNotPassed:  { label: '已学未过',        color: '#7d6498', bg: '#f4f1f8', border: '#c0acd8' },
  active:            { label: '正常推进',        color: '#4f9e72', bg: '#edf7f2', border: '#90d0a8' },
  completed:         { label: '已完成',          color: '#4f9e72', bg: '#edf7f2', border: '#90d0a8' },
} as const

const RISK_META = {
  high:   { label: '高风险', color: '#c4533a', bg: '#fdf0ed', border: '#e8a898' },
  medium: { label: '中风险', color: '#c87d2a', bg: '#fdf5e8', border: '#ecc87a' },
  low:    { label: '低风险', color: '#4f9e72', bg: '#edf7f2', border: '#90d0a8' },
} as const

// ── BurndownChart (SVG) ───────────────────────────────────────────────────────
function BurndownChart({ plans, today }: { plans: StudentExamPlan[]; today: Date }) {
  const W = 560; const H = 160; const PAD = { t: 12, r: 16, b: 32, l: 36 }
  const chartW = W - PAD.l - PAD.r
  const chartH = H - PAD.t - PAD.b

  // 以 4 周前为起点，最远考试日为终点
  const latestExam = plans.reduce((a, p) => p.examDate > a ? p.examDate : a, plans[0].examDate)
  const startDate    = new Date(today); startDate.setDate(startDate.getDate() - 28)
  const endDate      = parseISO(latestExam)
  const totalDays    = differenceInDays(endDate, startDate) || 1

  function xOf(date: Date) {
    return PAD.l + (differenceInDays(date, startDate) / totalDays) * chartW
  }

  // 按考试分组
  const groups: Record<string, { color: string; points: { date: Date; remaining: number }[] }> = {}

  const examTypeColors = ['#e8845a', '#5580b8', '#7d6498', '#4f9e72']
  const examGroups = [...new Set(plans.map(p => p.examType))]
  for (const examType of examGroups) {
    const group = plans.filter(p => p.examType === examType)
    const totalKpoints   = group.reduce((s, p) => s + p.totalKpoints, 0)
    const totalCompleted = group.reduce((s, p) => s + p.completedKpoints, 0)
    const remainingNow   = totalKpoints - totalCompleted

    // 从 weeklyCompleted 反推过去 4 周数据点
    const weekCompletions: number[] = [0, 0, 0, 0]
    for (const p of group) {
      for (let k = 0; k < 4; k++) weekCompletions[k] += p.weeklyCompleted[k]
    }
    // 最早到最近各周完成数；remaining 从现在往回推
    const pts: { date: Date; remaining: number }[] = []
    let r = remainingNow
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - (i + 1) * 7)
      r += weekCompletions[3 - i]
      pts.unshift({ date: d, remaining: r })
    }
    pts.push({ date: today, remaining: remainingNow })

    // 计划线：从现在到考试日线性降为 0
    const examDate = parseISO(group[0].examDate)
    pts.push({ date: examDate, remaining: 0 })

    groups[examType] = {
      color: examTypeColors[examGroups.indexOf(examType) % examTypeColors.length],
      points: pts,
    }
  }

  const maxR = Math.max(...Object.values(groups).flatMap(g => g.points.map(p => p.remaining)), 1)

  function yOf(r: number) { return PAD.t + chartH - (r / maxR) * chartH }

  const yTicks = [0, Math.round(maxR / 2), maxR]
  const xWeekTicks: Date[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
    xWeekTicks.push(new Date(d))
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={v} x1={PAD.l} x2={W - PAD.r} y1={yOf(v)} y2={yOf(v)}
          stroke="var(--color-border)" strokeWidth="1" strokeDasharray={v === 0 ? '' : '3 3'} />
      ))}
      {/* Y labels */}
      {yTicks.map(v => (
        <text key={v} x={PAD.l - 4} y={yOf(v) + 4} textAnchor="end" fontSize="9" fill="var(--color-text-muted)">{v}</text>
      ))}
      {/* Today line */}
      <line x1={xOf(today)} x2={xOf(today)} y1={PAD.t} y2={H - PAD.b}
        stroke="#aaa" strokeWidth="1" strokeDasharray="4 3" />
      <text x={xOf(today) + 3} y={PAD.t + 10} fontSize="8" fill="#aaa">今天</text>
      {/* Exam date lines */}
      {[...new Set(plans.map(p => p.examDate))].map(d => {
        const x = xOf(parseISO(d))
        const type = plans.find(p => p.examDate === d)!.examType
        return (
          <g key={d}>
            <line x1={x} x2={x} y1={PAD.t} y2={H - PAD.b} stroke="#d94f35" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <text x={x + 3} y={PAD.t + 10} fontSize="8" fill="#d94f35" opacity="0.8">{type}考试</text>
          </g>
        )
      })}
      {/* Lines per group */}
      {Object.entries(groups).map(([examType, { color, points }]) => {
        // Split into actual (to today) and planned (today to exam)
        const todayIdx = points.findIndex(p => p.date >= today)
        const actual   = points.slice(0, todayIdx >= 0 ? todayIdx + 1 : points.length)
        const planned  = points.slice(todayIdx >= 0 ? todayIdx : points.length - 1)

        const toPath = (pts: typeof points) =>
          pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.date).toFixed(1)},${yOf(p.remaining).toFixed(1)}`).join(' ')

        return (
          <g key={examType}>
            {/* Actual line (solid) */}
            {actual.length > 1 && <path d={toPath(actual)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
            {/* Planned line (dashed) */}
            {planned.length > 1 && <path d={toPath(planned)} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />}
            {/* Dots on actual */}
            {actual.map((p, i) => (
              <circle key={i} cx={xOf(p.date)} cy={yOf(p.remaining)} r="3" fill={color} />
            ))}
          </g>
        )
      })}
      {/* X week labels */}
      {xWeekTicks.filter((_, i) => i % 2 === 0).map((d, i) => (
        <text key={i} x={xOf(d)} y={H - PAD.b + 12} textAnchor="middle" fontSize="8" fill="var(--color-text-muted)">
          {`${d.getMonth()+1}/${d.getDate()}`}
        </text>
      ))}
    </svg>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-3">
      <div className="inline-flex w-fit items-end rounded-md px-2.5 py-1" style={{ backgroundColor: bg }}>
        <span className="text-2xl font-bold leading-none" style={{ color }}>{value}</span>
      </div>
      <span className="text-[11px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  )
}

// ── StudentDetailPanel ────────────────────────────────────────────────────────
function StudentDetailPanel({ plan, today }: { plan: StudentExamPlan; today: Date }) {
  const daysToExam  = differenceInDays(parseISO(plan.examDate), today)
  const remaining   = plan.totalKpoints - plan.completedKpoints
  const weeks       = Math.max(daysToExam / 7, 0.1)
  const weeklyNeeded = remaining / weeks
  const last1Week   = plan.weeklyCompleted[3]
  const last2Weeks  = plan.weeklyCompleted[2] + plan.weeklyCompleted[3]
  const avgRecent   = last2Weeks / 2
  const canFinish   = avgRecent >= weeklyNeeded && remaining > 0 || remaining === 0

  const items = [
    { label: '距离考试天数',       value: `${daysToExam} 天`,                color: daysToExam < 30 ? '#c4533a' : '#5580b8' },
    { label: '当前未完成卡点数',   value: `${remaining} 个`,                 color: remaining === 0 ? '#4f9e72' : '#c87d2a' },
    { label: '平均每周需完成',     value: `${weeklyNeeded.toFixed(1)} 个/周`, color: '#7d6498' },
    { label: '近1周/2周完成',      value: `${last1Week} / ${last2Weeks} 个`, color: '#5580b8' },
    { label: '预计是否按期完成',   value: remaining === 0 ? '已完成' : canFinish ? '预计可按期' : '存在风险',
      color: remaining === 0 ? '#4f9e72' : canFinish ? '#4f9e72' : '#c4533a' },
  ]

  return (
    <div className="mt-2 mb-1 mx-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] p-3">
      <div className="grid grid-cols-5 gap-2">
        {items.map(it => (
          <div key={it.label} className="flex flex-col gap-1 rounded-md border border-[var(--color-border)] bg-white px-2.5 py-2">
            <span className="text-sm font-bold leading-none" style={{ color: it.color }}>{it.value}</span>
            <span className="text-[10px] text-[var(--color-text-muted)] leading-tight">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── KpointQualityCard ────────────────────────────────────────────────────────
const PASS_HIGH = 80, PASS_MID = 50  // 绝对标准
const RECUR_HIGH = 25               // 复发率超过此值 = 高复发

const QUALITY_META = {
  high:   { label: '高通过率', desc: '≥80%',    color: '#4f9e72', bg: '#edf7f2', border: '#90d0a8' },
  medium: { label: '中通过率', desc: '50–79%',  color: '#c87d2a', bg: '#fdf5e8', border: '#ecc87a' },
  low:    { label: '低通过率', desc: '<50%',    color: '#c4533a', bg: '#fdf0ed', border: '#e8a898' },
  recur:  { label: '高复发',   desc: '复发>25%', color: '#7d6498', bg: '#f4f1f8', border: '#c0acd8' },
} as const

function KpointQualityCard() {
  const total = kpointTypeStats.length
  const highList   = kpointTypeStats.filter(k => k.passRate >= PASS_HIGH)
  const medList    = kpointTypeStats.filter(k => k.passRate >= PASS_MID && k.passRate < PASS_HIGH)
  const lowList    = kpointTypeStats.filter(k => k.passRate < PASS_MID)
  const recurList  = kpointTypeStats.filter(k => k.recurrenceRate > RECUR_HIGH)

  // 按通过率从高到低排序，用于条形图区间分布
  const sorted = [...kpointTypeStats].sort((a, b) => b.passRate - a.passRate)

  function tier(passRate: number) {
    if (passRate >= PASS_HIGH) return QUALITY_META.high
    if (passRate >= PASS_MID)  return QUALITY_META.medium
    return QUALITY_META.low
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">卡点质量总体分布</div>

      {/* 统计卡片 */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        {([
          { key: 'high',   count: highList.length },
          { key: 'medium', count: medList.length },
          { key: 'low',    count: lowList.length },
          { key: 'recur',  count: recurList.length },
        ] as const).map(({ key, count }) => {
          const m = QUALITY_META[key]
          return (
            <div key={key} className="flex flex-col gap-1 rounded-[var(--radius-card)] border px-3 py-2.5"
              style={{ borderColor: m.border, backgroundColor: m.bg }}>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold leading-none" style={{ color: m.color }}>{count}</span>
                <span className="mb-0.5 text-[10px]" style={{ color: m.color }}>/ {total} 类</span>
              </div>
              <span className="text-[11px] font-medium" style={{ color: m.color }}>{m.label}</span>
              <span className="text-[10px] opacity-70" style={{ color: m.color }}>{m.desc}</span>
            </div>
          )
        })}
      </div>

      {/* 堆叠比例条 */}
      <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
        <span>通过率区间分布</span>
        <span>共 {total} 类卡点</span>
      </div>
      <div className="flex h-5 w-full overflow-hidden rounded-full bg-[#ede8e3]">
        {[
          { list: highList,  meta: QUALITY_META.high },
          { list: medList,   meta: QUALITY_META.medium },
          { list: lowList,   meta: QUALITY_META.low },
        ].map(({ list, meta }) => list.length === 0 ? null : (
          <div key={meta.label}
            className="flex h-full items-center justify-center text-[10px] font-semibold text-white transition-all"
            style={{ width: `${(list.length / total) * 100}%`, backgroundColor: meta.color, opacity: 0.75 }}
            title={`${meta.label}：${list.length} 类`}
          >
            {list.length >= 2 && `${list.length}`}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-4">
        {[QUALITY_META.high, QUALITY_META.medium, QUALITY_META.low].map(m => (
          <div key={m.label} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: m.color, opacity: 0.75 }} />
            <span className="text-[10px] text-[var(--color-text-muted)]">{m.label} {m.desc}</span>
          </div>
        ))}
      </div>

      {/* 各卡点通过率区间条形图 */}
      <div className="mt-5 space-y-2">
        <div className="text-[11px] font-medium text-[var(--color-text-secondary)]">各卡点通过率排名</div>
        {sorted.map(k => {
          const m = tier(k.passRate)
          return (
            <div key={k.kpointType} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-right">
                <div className="text-[11px] text-[var(--color-text-primary)] truncate">{k.kpointType}</div>
                <div className="text-[9px] text-[var(--color-text-muted)]">{k.totalCount}人在训</div>
              </div>
              {/* 通过率条 */}
              <div className="relative flex-1 h-4 rounded-full bg-[#ede8e3] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${k.passRate}%`, backgroundColor: m.color, opacity: 0.55 }} />
                {/* 高通过率分界线 */}
                <div className="absolute top-0 h-full w-px bg-[#c8bfb8]" style={{ left: `${PASS_HIGH}%` }} />
                <div className="absolute top-0 h-full w-px bg-[#c8bfb8]" style={{ left: `${PASS_MID}%` }} />
              </div>
              <div className="w-24 shrink-0 flex items-center gap-1.5 justify-end">
                <span className="text-[11px] font-semibold" style={{ color: m.color }}>{k.passRate}%</span>
                {k.recurrenceRate > RECUR_HIGH && (
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                    style={{ backgroundColor: QUALITY_META.recur.bg, color: QUALITY_META.recur.color }}>
                    复发{k.recurrenceRate}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {/* 分界线图例 */}
        <div className="flex gap-4 pt-1">
          <div className="flex items-center gap-1">
            <div className="h-3 w-px bg-[#c8bfb8]" />
            <span className="text-[9px] text-[var(--color-text-muted)]">80% 高/中分界</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-px bg-[#c8bfb8]" />
            <span className="text-[9px] text-[var(--color-text-muted)]">50% 中/低分界</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ProgressBreakdownCard ────────────────────────────────────────────────────
const DANGER_DAYS = 3  // 超过此天数未活跃 = 危险

type BreakdownTab = 'student' | 'teacher' | 'kpoint'
type KpointSubTab = 'cycle' | 'blockage'

// accent 只用来决定圆点颜色，条形本身统一用暖灰
function HBar({ label, value, maxValue, pct, accent, badge, sub }:
  { label: string; value: string; maxValue: number; pct: number; accent: string; badge?: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-right">
        <div className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">{label}</div>
        {sub && <div className="text-[9px] text-[var(--color-text-muted)]">{sub}</div>}
      </div>
      <div className="relative flex-1 h-4 rounded-full overflow-hidden bg-[#ede8e3]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(pct / maxValue) * 100}%`, backgroundColor: accent, opacity: 0.55, minWidth: pct > 0 ? '6px' : '0' }}
        />
      </div>
      <div className="w-20 shrink-0 flex items-center justify-end gap-1.5">
        <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-[11px] font-semibold" style={{ color: accent }}>{value}</span>
        {badge}
      </div>
    </div>
  )
}

function ProgressBreakdownCard({ today: _today }: { today: Date }) {
  const [tab, setTab] = useState<BreakdownTab>('student')
  const [kpointSub, setKpointSub] = useState<KpointSubTab>('blockage')

  // ── 按用户 ────────────────────────────────────────────────────────────────
  const studentRows = useMemo(() => {
    return [...studentExamPlans]
      .map(p => {
        const pct = p.totalKpoints > 0 ? Math.round((p.completedKpoints / p.totalKpoints) * 100) : 0
        const inactive = studentLastActiveDays[p.studentId] ?? 0
        const danger = inactive > DANGER_DAYS
        return { ...p, pct, inactive, danger }
      })
      .sort((a, b) => a.pct - b.pct)  // 进度最低的排最前
  }, [])

  const dangerStudents = studentRows.filter(s => s.danger)

  // ── 按老师 ────────────────────────────────────────────────────────────────
  const teacherRows = useMemo(() => {
    const map: Record<string, { total: number; completed: number; students: number; inactive: number[] }> = {}
    for (const p of studentExamPlans) {
      if (!map[p.teacherName]) map[p.teacherName] = { total: 0, completed: 0, students: 0, inactive: [] }
      map[p.teacherName].total     += p.totalKpoints
      map[p.teacherName].completed += p.completedKpoints
      map[p.teacherName].students  += 1
      map[p.teacherName].inactive.push(studentLastActiveDays[p.studentId] ?? 0)
    }
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        pct: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
        students: d.students,
        dangerCount: d.inactive.filter(v => v > DANGER_DAYS).length,
      }))
      .sort((a, b) => a.pct - b.pct)
  }, [])

  // ── 按卡点类型 ────────────────────────────────────────────────────────────
  const kpointCycleRows = useMemo(() =>
    [...kpointTypeStats].sort((a, b) => b.avgCompletionDays - a.avgCompletionDays),
  [])
  const kpointBlockageRows = useMemo(() =>
    [...kpointTypeStats].sort((a, b) => b.blockageCount - a.blockageCount),
  [])

  const avatarBg = (color: string) =>
    ['#E6F1FB','#F0CDBB','#b5d5f5','#c8e6c9','#ffe0b2','#e1bee7','#f8bbd0'].includes(color) ? '#aaa' : color

  const tabCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-[11px] font-medium transition-all ${active ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-left)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">进度差异分析</span>
        <div className="flex gap-1.5">
          <button type="button" className={tabCls(tab === 'student')} onClick={() => setTab('student')}>按用户</button>
          <button type="button" className={tabCls(tab === 'teacher')} onClick={() => setTab('teacher')}>按老师</button>
          <button type="button" className={tabCls(tab === 'kpoint')}  onClick={() => setTab('kpoint')}>按卡点类型</button>
        </div>
      </div>

      {/* ── 按用户 ── */}
      {tab === 'student' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {studentRows.map(s => (
              <HBar
                key={s.studentId}
                label={s.studentName}
                sub={s.examType}
                value={`${s.pct}%`}
                maxValue={100}
                pct={s.pct}
                accent={s.danger ? '#c4533a' : s.pct >= 60 ? '#4f9e72' : '#c87d2a'}
                badge={s.danger
                  ? <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: '#fdf0ed', color: '#c4533a' }}>{s.inactive}天未动</span>
                  : undefined
                }
              />
            ))}
          </div>

          {/* 危险名单 */}
          {dangerStudents.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: '#e8a898', backgroundColor: '#fdf5f3' }}>
              <div className="mb-2 flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1L11.2 10H.8L6 1Z" fill="#ef4444"/><text x="5.5" y="9" textAnchor="middle" fontSize="6" fill="white" fontWeight="bold">!</text></svg>
                <span className="text-[11px] font-semibold" style={{ color: '#c4533a' }}>危险名单（超过{DANGER_DAYS}天未上课/未交作业）</span>
              </div>
              <div className="space-y-1.5">
                {dangerStudents.map(s => (
                  <div key={s.studentId} className="flex items-center gap-2 rounded-md bg-white border px-2.5 py-1.5" style={{ borderColor: '#e8a898' }}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: avatarBg(s.color) }}>{s.avatar}</div>
                    <div className="flex-1">
                      <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">{s.studentName}</span>
                      <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)]">{s.teacherName} · {s.examType}</span>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: '#c4533a' }}>{s.inactive}天未活跃</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">进度 {s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 按老师 ── */}
      {tab === 'teacher' && (
        <div className="space-y-2.5">
          {teacherRows.map(t => (
            <HBar
              key={t.name}
              label={t.name}
              sub={`${t.students}名学员`}
              value={`${t.pct}%`}
              maxValue={100}
              pct={t.pct}
              accent={t.pct >= 60 ? '#4f9e72' : t.pct >= 30 ? '#c87d2a' : '#c4533a'}
              badge={t.dangerCount > 0
                ? <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: '#fdf0ed', color: '#c4533a' }}>{t.dangerCount}人预警</span>
                : undefined
              }
            />
          ))}
          <p className="pt-1 text-[10px] text-[var(--color-text-muted)]">平均完成率 = 名下所有学员已完成卡点 ÷ 总卡点</p>
        </div>
      )}

      {/* ── 按卡点类型 ── */}
      {tab === 'kpoint' && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            <button type="button"
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium border transition-all ${kpointSub === 'blockage' ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
              onClick={() => setKpointSub('blockage')}>积压风险</button>
            <button type="button"
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium border transition-all ${kpointSub === 'cycle' ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
              onClick={() => setKpointSub('cycle')}>完成周期</button>
          </div>

          {kpointSub === 'blockage' && (
            <div className="space-y-2.5">
              {kpointBlockageRows.map(k => (
                <HBar
                  key={k.kpointType}
                  label={k.kpointType}
                  sub={`${k.totalCount}人在训`}
                  value={`${k.blockageCount}个积压`}
                  maxValue={Math.max(...kpointBlockageRows.map(r => r.blockageCount))}
                  pct={k.blockageCount}
                  accent={k.blockageCount >= 3 ? '#c4533a' : k.blockageCount >= 2 ? '#c87d2a' : '#4f9e72'}
                />
              ))}
              <p className="text-[10px] text-[var(--color-text-muted)]">积压 = 当前处于堵点状态（未开始/学习中停滞/已学未过）的卡点数</p>
            </div>
          )}

          {kpointSub === 'cycle' && (
            <div className="space-y-2.5">
              {kpointCycleRows.map(k => (
                <HBar
                  key={k.kpointType}
                  label={k.kpointType}
                  sub={`${k.totalCount}人在训`}
                  value={`${k.avgCompletionDays}天`}
                  maxValue={Math.max(...kpointCycleRows.map(r => r.avgCompletionDays))}
                  pct={k.avgCompletionDays}
                  accent={k.avgCompletionDays >= 28 ? '#c4533a' : k.avgCompletionDays >= 20 ? '#c87d2a' : '#4f9e72'}
                />
              ))}
              <p className="text-[10px] text-[var(--color-text-muted)]">平均完成周期 = 从该卡点启动到通过考试的平均天数</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ResultFactorsCard ─────────────────────────────────────────────────────────
type FactorsTab = 'comparison' | 'correlation'
type ComparisonSub = 'teacher' | 'cycle' | 'kpoint'

function corrBg(r: number): string {
  const t = Math.min(Math.abs(r), 1)
  const alpha = 0.12 + t * 0.65
  return r >= 0 ? `rgba(79,158,114,${alpha})` : `rgba(196,83,58,${alpha})`
}
function corrFg(r: number): string {
  const abs = Math.abs(r)
  if (abs >= 0.5) return r > 0 ? '#4f9e72' : '#c4533a'
  if (abs >= 0.2) return r > 0 ? '#3a8058' : '#9a4030'
  return '#a09890'
}

function ComparisonBar({ label, sub, passRate, feedbackScore, completionDays, count }:
  { label: string; sub?: string; passRate: number; feedbackScore: number; completionDays: number; count: number }) {
  const pc = passRate >= 70 ? '#4f9e72' : passRate >= 50 ? '#c87d2a' : '#c4533a'
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-right">
        <div className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">{label}</div>
        {sub && <div className="text-[9px] text-[var(--color-text-muted)]">{sub}</div>}
      </div>
      <div className="relative flex-1 h-5 rounded-full overflow-hidden bg-[#ede8e3]">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${passRate}%`, backgroundColor: pc, opacity: 0.55 }} />
      </div>
      <div className="w-9 shrink-0 text-right text-[11px] font-semibold" style={{ color: pc }}>{passRate}%</div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: '#eef3fb', color: '#5580b8' }}>
          反馈 {feedbackScore.toFixed(1)}
        </span>
        <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: '#f4f1f8', color: '#7d6498' }}>
          {completionDays}天/卡点
        </span>
        <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: '#f5f3f1', color: '#a09890' }}>
          n={count}
        </span>
      </div>
    </div>
  )
}

function ResultFactorsCard() {
  const [tab, setTab]       = useState<FactorsTab>('comparison')
  const [compSub, setCompSub] = useState<ComparisonSub>('teacher')

  const mainTabCls = (active: boolean) =>
    `px-3 py-1 rounded-full text-[11px] font-medium transition-all ${active ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-left)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`

  const subTabCls = (active: boolean) =>
    `px-2.5 py-0.5 rounded text-[10px] font-medium border transition-all ${active
      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary-light)]'
      : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`

  const kpointRows = [...kpointTypeStats].sort((a, b) => b.passRate - a.passRate)

  const outcomes = [
    { key: 'passRateCorr' as const, label: '通过率', color: '#4f9e72' },
    { key: 'feedbackCorr' as const, label: '反馈分', color: '#5580b8' },
    { key: 'cycleCorr'   as const, label: '完成周期', color: '#7d6498' },
  ]
  const categories = [...new Set(variableCorrelations.map(v => v.category))]

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      {/* 标题 + 主 tab */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">影响结果的变量因素</span>
        <div className="flex gap-1.5">
          <button type="button" className={mainTabCls(tab === 'comparison')}  onClick={() => setTab('comparison')}>分组对比</button>
          <button type="button" className={mainTabCls(tab === 'correlation')} onClick={() => setTab('correlation')}>变量相关性</button>
        </div>
      </div>

      {/* ── 分组对比 ── */}
      {tab === 'comparison' && (
        <div className="space-y-3">
          {/* 子 tab */}
          <div className="flex gap-1.5">
            <button type="button" className={subTabCls(compSub === 'teacher')} onClick={() => setCompSub('teacher')}>按老师</button>
            <button type="button" className={subTabCls(compSub === 'cycle')}   onClick={() => setCompSub('cycle')}>按考试周期</button>
            <button type="button" className={subTabCls(compSub === 'kpoint')}  onClick={() => setCompSub('kpoint')}>按卡点类型</button>
          </div>

          {/* 列头 */}
          <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-muted)]">
            <div className="w-24 shrink-0" />
            <div className="flex-1 text-center">通过率 →</div>
            <div className="w-9 shrink-0" />
            <div className="flex shrink-0 gap-1 text-center">
              <span className="w-14">反馈均分</span>
              <span className="w-16">平均周期</span>
              <span className="w-8">样本</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {compSub === 'teacher' && teacherPassRates.sort((a, b) => b.passRate - a.passRate).map(r => (
              <ComparisonBar key={r.teacherName} label={r.teacherName} sub={`${r.studentCount}名学员`}
                passRate={r.passRate} feedbackScore={r.avgFeedbackScore}
                completionDays={r.avgCompletionDays} count={r.studentCount} />
            ))}
            {compSub === 'cycle' && examCycleStats.map(r => (
              <ComparisonBar key={r.label} label={r.label} sub="距考试时间"
                passRate={r.passRate} feedbackScore={r.avgFeedbackScore}
                completionDays={r.avgCompletionDays} count={r.studentCount} />
            ))}
            {compSub === 'kpoint' && kpointRows.map(r => (
              <ComparisonBar key={r.kpointType} label={r.kpointType} sub={`${r.learningCount}人学过`}
                passRate={r.passRate} feedbackScore={r.avgFeedbackScore}
                completionDays={r.avgCompletionDays} count={r.learningCount} />
            ))}
          </div>

          <p className="text-[10px] text-[var(--color-text-muted)]">
            通过率 = 该分组内学员通过最终考核的比例；反馈均分 = 课程平均评分；完成周期 = 平均每个卡点的交付天数
          </p>
        </div>
      )}

      {/* ── 变量相关性热力图 ── */}
      {tab === 'correlation' && (
        <div>
          {/* 列头 */}
          <div className="mb-2 flex items-center gap-2">
            <div className="w-28 shrink-0" />
            {outcomes.map(o => (
              <div key={o.key} className="flex-1 text-center text-[10px] font-semibold" style={{ color: o.color }}>
                {o.label}
              </div>
            ))}
          </div>

          {/* 分类分组行 */}
          <div className="space-y-3">
            {categories.map(cat => {
              const rows = variableCorrelations.filter(v => v.category === cat)
              return (
                <div key={cat}>
                  <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{cat}</div>
                  <div className="space-y-1">
                    {rows.map(row => (
                      <div key={row.variable} className="flex items-center gap-2">
                        <div className="w-28 shrink-0 text-right text-[11px] text-[var(--color-text-primary)]">{row.variable}</div>
                        {outcomes.map(o => {
                          const val = row[o.key]
                          return (
                            <div key={o.key}
                              className="flex flex-1 items-center justify-center rounded py-1.5 text-[10px] font-semibold"
                              style={{ backgroundColor: corrBg(val), color: corrFg(val) }}>
                              {val > 0 ? '+' : ''}{val.toFixed(2)}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 图例 */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[10px] text-[var(--color-text-muted)]">相关强度：</span>
            {([
              { label: '强负相关', bg: 'rgba(196,83,58,0.7)',  fg: '#c4533a' },
              { label: '弱相关',   bg: '#e8e0da',              fg: '#a09890' },
              { label: '强正相关', bg: 'rgba(79,158,114,0.7)', fg: '#4f9e72' },
            ] as const).map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="h-3 w-5 rounded" style={{ backgroundColor: item.bg }} />
                <span className="text-[10px]" style={{ color: item.fg }}>{item.label}</span>
              </div>
            ))}
            <span className="text-[10px] text-[var(--color-text-muted)]">· 数值基于近30天样本，仅供参考</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── FeedbackPassRateMatrix ───────────────────────────────────────────────────
function FeedbackPassRateMatrix() {
  const [fbThreshold, setFbThreshold] = useState(4.0)
  const [passThreshold, setPassThreshold] = useState(80)

  const W = 520; const H = 300
  const PAD = { t: 24, r: 24, b: 44, l: 48 }
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b

  const maxCount = Math.max(...kpointTypeStats.map(k => k.learningCount))

  const xOf    = (fb: number)   => PAD.l + ((fb - 1) / 4) * cW
  const yOf    = (pass: number) => PAD.t + cH - (pass / 100) * cH
  const radius = (count: number) => 6 + (count / maxCount) * 12
  const dotColor = (recur: number) => recur <= 10 ? '#5580b8' : recur <= 30 ? '#c87d2a' : '#c4533a'

  const threshX = xOf(fbThreshold)
  const threshY = yOf(passThreshold)

  const qLabels = [
    { x: (threshX + W - PAD.r) / 2, y: PAD.t + (threshY - PAD.t) / 2,     label: '优质卡点', color: '#4f9e72' },
    { x: (PAD.l + threshX) / 2,     y: PAD.t + (threshY - PAD.t) / 2,     label: '苦学型',   color: '#c87d2a' },
    { x: (PAD.l + threshX) / 2,     y: threshY + (H - PAD.b - threshY) / 2, label: '淘汰候选', color: '#c4533a' },
    { x: (threshX + W - PAD.r) / 2, y: threshY + (H - PAD.b - threshY) / 2, label: '甜蜜陷阱', color: '#7d6498' },
  ]

  const yTicks = [0, 20, 40, 60, 80, 100]
  const xTicks = [1, 2, 3, 4, 5]

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      {/* 标题 + 阈值调节 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">用户反馈 × 通过率 卡点质量矩阵</div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
          <span>反馈分界：</span>
          <div className="flex items-center gap-1">
            <button type="button"
              className="flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-bg-left)]"
              onClick={() => setFbThreshold(v => Math.max(1.0, +(v - 0.5).toFixed(1)))}>−</button>
            <span className="w-7 text-center font-semibold text-[var(--color-text-primary)]">{fbThreshold.toFixed(1)}</span>
            <button type="button"
              className="flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-bg-left)]"
              onClick={() => setFbThreshold(v => Math.min(5.0, +(v + 0.5).toFixed(1)))}>+</button>
          </div>
          <span>通过率分界：</span>
          <div className="flex items-center gap-1">
            <button type="button"
              className="flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-bg-left)]"
              onClick={() => setPassThreshold(v => Math.max(0, v - 10))}>−</button>
            <span className="w-8 text-center font-semibold text-[var(--color-text-primary)]">{passThreshold}%</span>
            <button type="button"
              className="flex h-5 w-5 items-center justify-center rounded border border-[var(--color-border)] text-xs hover:bg-[var(--color-bg-left)]"
              onClick={() => setPassThreshold(v => Math.min(100, v + 10))}>+</button>
          </div>
        </div>
      </div>

      {/* 散点图 */}
      <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          {/* 象限背景 */}
          <rect x={threshX} y={PAD.t}  width={W - PAD.r - threshX} height={threshY - PAD.t}        fill="#4f9e72" opacity="0.07" />
          <rect x={PAD.l}   y={PAD.t}  width={threshX - PAD.l}     height={threshY - PAD.t}        fill="#c87d2a" opacity="0.07" />
          <rect x={PAD.l}   y={threshY} width={threshX - PAD.l}     height={H - PAD.b - threshY}   fill="#c4533a" opacity="0.07" />
          <rect x={threshX} y={threshY} width={W - PAD.r - threshX} height={H - PAD.b - threshY}   fill="#7d6498" opacity="0.07" />

          {/* 网格线 */}
          {yTicks.map(v => (
            <line key={`y${v}`} x1={PAD.l} x2={W - PAD.r} y1={yOf(v)} y2={yOf(v)}
              stroke="#d8d0c8" strokeWidth="0.5" strokeDasharray={v === 0 || v === 100 ? '' : '3 3'} />
          ))}
          {xTicks.map(v => (
            <line key={`x${v}`} x1={xOf(v)} x2={xOf(v)} y1={PAD.t} y2={H - PAD.b}
              stroke="#d8d0c8" strokeWidth="0.5" strokeDasharray={v === 1 || v === 5 ? '' : '3 3'} />
          ))}

          {/* 阈值分界线 */}
          <line x1={threshX} x2={threshX} y1={PAD.t} y2={H - PAD.b}
            stroke="#a09890" strokeWidth="1.5" strokeDasharray="5 3" />
          <line x1={PAD.l} x2={W - PAD.r} y1={threshY} y2={threshY}
            stroke="#a09890" strokeWidth="1.5" strokeDasharray="5 3" />

          {/* 象限标签 */}
          {qLabels.map(q => (
            <text key={q.label} x={q.x} y={q.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="11" fill={q.color} opacity="0.45" fontWeight="600">{q.label}</text>
          ))}

          {/* 坐标轴 */}
          <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#c8bfb8" strokeWidth="1" />
          <line x1={PAD.l} x2={PAD.l}     y1={PAD.t}     y2={H - PAD.b} stroke="#c8bfb8" strokeWidth="1" />

          {/* Y 轴刻度 */}
          {yTicks.map(v => (
            <g key={`yl${v}`}>
              <line x1={PAD.l - 3} x2={PAD.l} y1={yOf(v)} y2={yOf(v)} stroke="#c8bfb8" strokeWidth="1" />
              <text x={PAD.l - 5} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="#a09890">{v}%</text>
            </g>
          ))}

          {/* X 轴刻度 */}
          {xTicks.map(v => (
            <g key={`xl${v}`}>
              <line x1={xOf(v)} x2={xOf(v)} y1={H - PAD.b} y2={H - PAD.b + 3} stroke="#c8bfb8" strokeWidth="1" />
              <text x={xOf(v)} y={H - PAD.b + 13} textAnchor="middle" fontSize="8" fill="#a09890">{v}分</text>
            </g>
          ))}

          {/* 轴标签 */}
          <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#a09890">用户反馈均分（1–5分）</text>
          <text x={11} y={H / 2} textAnchor="middle" fontSize="9" fill="#a09890"
            transform={`rotate(-90, 11, ${H / 2})`}>通过率（%）</text>

          {/* 数据点 */}
          {kpointTypeStats.map(k => {
            const cx  = xOf(k.avgFeedbackScore)
            const cy  = yOf(k.passRate)
            const r   = radius(k.learningCount)
            const fill    = dotColor(k.recurrenceRate)
            const opacity = k.learningCount < 20 ? 0.22 : 0.82
            const labelY  = cy - r - 4 < PAD.t + 10 ? cy + r + 12 : cy - r - 4
            return (
              <g key={k.kpointType}>
                <circle cx={cx} cy={cy} r={r} fill={fill} opacity={opacity}
                  stroke="white" strokeWidth="1.5" />
                <text x={cx} y={labelY} textAnchor="middle" fontSize="8.5" fill={fill}
                  opacity={k.learningCount < 20 ? 0.45 : 0.88}>{k.kpointType}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* 图例 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-text-secondary)]">复发率：</span>
          {([
            { label: '≤10%（低）',   color: '#5580b8' },
            { label: '10–30%（中）', color: '#c87d2a' },
            { label: '>30%（高）',   color: '#c4533a' },
          ] as const).map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <span>·  点越大 = 学习人次越多  ·  半透明 = 样本量 &lt;20，参考价值有限</span>
      </div>
    </div>
  )
}

// ── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}

// ── OverviewView ──────────────────────────────────────────────────────────────
export function OverviewView() {
  const today = useMemo(() => new Date(), [])
  const [riskFilter, setRiskFilter] = useState<'high' | 'medium' | 'low' | null>(null)
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)

  // ── 考试风险数据 ────────────────────────────────────────────────────────────
  const examRisk = useMemo(() => {
    const sorted = [...studentExamPlans].sort((a, b) => a.examDate.localeCompare(b.examDate))

    const highCount   = sorted.filter(p => p.riskLevel === 'high').length
    const mediumCount = sorted.filter(p => p.riskLevel === 'medium').length
    const lowCount    = sorted.filter(p => p.riskLevel === 'low').length

    const daysToNearest = differenceInDays(parseISO(sorted[0].examDate), today)
    const totalUnfinished = sorted.reduce((s, p) => s + (p.totalKpoints - p.completedKpoints), 0)
    const highRiskKpoints = sorted
      .filter(p => p.riskLevel === 'high')
      .reduce((s, p) => s + (p.totalKpoints - p.completedKpoints), 0)

    // 最近 1周/2周 完成数（全部学生合计）
    const last1Week  = sorted.reduce((s, p) => s + p.weeklyCompleted[3], 0)
    const last2Weeks = sorted.reduce((s, p) => s + p.weeklyCompleted[2] + p.weeklyCompleted[3], 0)

    // 平均每周需完成（基于最近考试组）
    const nearestGroup = sorted.filter(p => p.examDate === sorted[0].examDate)
    const nearestRemaining = nearestGroup.reduce((s, p) => s + (p.totalKpoints - p.completedKpoints), 0)
    const weeksToNearest   = Math.max(daysToNearest / 7, 0.1)
    const weeklyNeeded     = nearestRemaining / weeksToNearest

    const nearestExamType = sorted[0].examType
    return { sorted, highCount, mediumCount, lowCount, daysToNearest, nearestExamType, totalUnfinished, highRiskKpoints, last1Week, last2Weeks, weeklyNeeded }
  }, [today])

  const stats = useMemo(() => {
    const total       = kpointDeliveries.length
    const inProgress  = kpointDeliveries.filter(r => r.status === 'in_progress').length
    const completed   = kpointDeliveries.filter(r => r.status === 'completed').length
    const notStarted  = kpointDeliveries.filter(r => r.status === 'not_started').length
    const started     = inProgress + completed   // 已开始 = 交付中 + 已完成
    return { total, started, inProgress, completed, notStarted }
  }, [])

  return (
    <div className="h-full overflow-auto">
      <div className="space-y-6 pb-8">

        <SectionHeader label="总交付快照" />

        {/* ── 总交付进度 ── */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">总交付进度</div>

          {/* 数字卡片 */}
          <div className="grid grid-cols-5 gap-3">
            <StatCard value={stats.total}      label="总卡点数"      color="#5580b8" bg="#eef3fb" />
            <StatCard value={stats.started}    label="已开始交付"    color="#7d6498" bg="#f4f1f8" />
            <StatCard value={stats.inProgress} label="交付中"        color={STATUS_META.in_progress.color} bg={STATUS_META.in_progress.bg} />
            <StatCard value={stats.completed}  label="已完成交付"    color={STATUS_META.completed.color}   bg={STATUS_META.completed.bg}   />
            <StatCard value={stats.notStarted} label="未开始"        color={STATUS_META.not_started.color} bg={STATUS_META.not_started.bg} />
          </div>

          {/* 堆叠进度条 */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-muted)]">整体进度</span>
              <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% 已完成
              </span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-bg-left)]">
              {stats.total > 0 && (
                <>
                  {stats.completed > 0 && (
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${(stats.completed / stats.total) * 100}%`, backgroundColor: STATUS_META.completed.barColor }}
                    />
                  )}
                  {stats.inProgress > 0 && (
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${(stats.inProgress / stats.total) * 100}%`, backgroundColor: STATUS_META.in_progress.barColor }}
                    />
                  )}
                  {stats.notStarted > 0 && (
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${(stats.notStarted / stats.total) * 100}%`, backgroundColor: STATUS_META.not_started.barColor }}
                    />
                  )}
                </>
              )}
            </div>
            {/* 图例 */}
            <div className="mt-2 flex items-center gap-4">
              {(['completed', 'in_progress', 'not_started'] as const).map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[s].barColor }} />
                  <span className="text-[10px] text-[var(--color-text-muted)]">{STATUS_META[s].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionHeader label="卡点质量分析" />
          <div className="mt-3 grid grid-cols-2 gap-4 items-start">
            <KpointQualityCard />
            <FeedbackPassRateMatrix />
          </div>
        </div>

        <div>
          <SectionHeader label="风险预警" />
          <div className="mt-3 grid grid-cols-2 gap-4 items-start">

        {/* ── 考试节点交付风险 ── */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
          <div className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">考试节点交付风险</div>

          {/* 红黄绿风险卡（可点击筛选）+ 距最近考试天数 */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {(['high', 'medium', 'low'] as const).map(level => {
              const m     = RISK_META[level]
              const count = level === 'high' ? examRisk.highCount : level === 'medium' ? examRisk.mediumCount : examRisk.lowCount
              const active = riskFilter === level
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setRiskFilter(active ? null : level)
                    setExpandedStudentId(null)
                  }}
                  className="flex flex-col gap-1 rounded-[var(--radius-card)] border px-3 py-2.5 text-left transition-all"
                  style={{
                    borderColor: active ? m.color : m.border,
                    backgroundColor: m.bg,
                    boxShadow: active ? `0 0 0 2px ${m.color}33` : undefined,
                  }}
                >
                  <span className="text-xl font-bold leading-none" style={{ color: m.color }}>{count}</span>
                  <span className="text-[10px]" style={{ color: m.color }}>{m.label}学生</span>
                  {active && <span className="text-[9px] opacity-70" style={{ color: m.color }}>点击取消筛选</span>}
                </button>
              )
            })}
            {/* 距最近考试天数 */}
            <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-3 py-2.5">
              <span className="text-xl font-bold leading-none text-[var(--color-text-primary)]">{examRisk.daysToNearest}天</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">距{examRisk.nearestExamType}</span>
            </div>
          </div>

          {/* 燃尽图 */}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">卡点燃尽趋势</span>
            <div className="flex items-center gap-3">
              {[...new Set(studentExamPlans.map(p => p.examType))].map((type, idx) => {
                const colors = ['#e8845a', '#5580b8', '#7d6498', '#4f9e72']
                const color = colors[idx % colors.length]
                return (
                  <div key={type} className="flex items-center gap-1">
                    <div className="h-2 w-4 rounded" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-[var(--color-text-muted)]">{type}</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-1">
                <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke="#aaa" strokeWidth="1.5" strokeDasharray="4 3"/></svg>
                <span className="text-[10px] text-[var(--color-text-muted)]">预测</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-left)] px-2 py-2">
            <BurndownChart plans={studentExamPlans} today={today} />
          </div>

          {/* 学生风险列表（可按风险级别筛选，可点击展开详情） */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                各学生交付风险（按考试时间排序）
                {riskFilter && (
                  <span className="ml-2 rounded-full px-2 py-0.5 text-[10px]"
                    style={{ backgroundColor: RISK_META[riskFilter].bg, color: RISK_META[riskFilter].color }}>
                    仅显示{RISK_META[riskFilter].label}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)]">点击查看详细分析</span>
            </div>
            <div className="space-y-1">
              {examRisk.sorted
                .filter(p => riskFilter === null || p.riskLevel === riskFilter)
                .map(p => {
                  const remaining  = p.totalKpoints - p.completedKpoints
                  const days       = differenceInDays(parseISO(p.examDate), today)
                  const m          = RISK_META[p.riskLevel]
                  const pct        = p.totalKpoints > 0 ? Math.round((p.completedKpoints / p.totalKpoints) * 100) : 0
                  const isExpanded = expandedStudentId === p.studentId
                  const avatarBg   = ['#E6F1FB','#F0CDBB','#b5d5f5','#c8e6c9','#ffe0b2','#e1bee7','#f8bbd0'].includes(p.color) ? '#aaa' : p.color

                  return (
                    <div key={p.studentId}>
                      <button
                        type="button"
                        onClick={() => setExpandedStudentId(isExpanded ? null : p.studentId)}
                        className="flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2 text-left transition-all hover:bg-[var(--color-bg-left)]"
                        style={isExpanded
                          ? { borderColor: m.color, boxShadow: `0 0 0 1px ${m.color}33` }
                          : { borderColor: 'var(--color-border)' }}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: avatarBg }}>
                          {p.avatar}
                        </div>
                        <div className="w-24 shrink-0">
                          <div className="text-xs font-semibold text-[var(--color-text-primary)]">{p.studentName}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)]">{p.examType} · {days >= 0 ? `${days}天后` : `已过${-days}天`}</div>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ color: m.color, backgroundColor: m.bg, border: `1px solid ${m.border}` }}>
                          {m.label}
                        </span>
                        <div className="flex-1">
                          <div className="mb-0.5 flex justify-between text-[10px] text-[var(--color-text-muted)]">
                            <span>{p.completedKpoints}/{p.totalKpoints} 卡点</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-left)]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: m.color }} />
                          </div>
                        </div>
                        <div className="w-10 shrink-0 text-right">
                          <div className="text-[10px] font-medium" style={{ color: m.color }}>{remaining} 剩余</div>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : '' }}>
                          <path d="M2 4 L6 8 L10 4" stroke="var(--color-text-muted)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {isExpanded && <StudentDetailPanel plan={p} today={today} />}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* ── 交付堵点分布 ── */}
        {(() => {
          const stages = [
            { key: 'notStarted'        as const, count: blockageData.notStarted.length },
            { key: 'pendingTeacher'    as const, count: blockageData.pendingTeacher.length },
            { key: 'pendingAssignment' as const, count: blockageData.pendingAssignment.length },
            { key: 'learnedNotPassed'  as const, count: blockageData.learnedNotPassed.length },
            { key: 'active'            as const, count: blockageData.activeCount },
            { key: 'completed'         as const, count: blockageData.completedCount },
          ]
          const total = stages.reduce((s, x) => s + x.count, 0) || 1
          const blockedCount = blockageData.notStarted.length + blockageData.pendingTeacher.length
            + blockageData.pendingAssignment.length + blockageData.learnedNotPassed.length

          const inProgressCount = blockageData.pendingTeacher.length + blockageData.pendingAssignment.length

          // 三个顶级分类（用于条形图基准）
          const topLevelRows = [
            { label: '未开始',   count: blockageData.notStarted.length,       metaKey: 'notStarted'    as const },
            { label: '学习中',   count: inProgressCount,                       metaKey: 'inLearning'    as const },
            { label: '已学未过', count: blockageData.learnedNotPassed.length,  metaKey: 'learnedNotPassed' as const },
          ]
          const maxCount = Math.max(...topLevelRows.map(r => r.count), 1)

          function ItemPills({ items, metaKey }: { items: typeof blockageData.notStarted; metaKey: keyof typeof BLOCKAGE_META }) {
            const m = BLOCKAGE_META[metaKey]
            if (items.length === 0) return null
            return (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-full border px-2 py-0.5"
                    style={{ borderColor: m.border, backgroundColor: m.bg }}>
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: m.color }}>
                      {item.avatar}
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: m.color }}>{item.studentName}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">· {item.kpoint}</span>
                  </div>
                ))}
              </div>
            )
          }

          return (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
              <div className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">交付堵点分布</div>
              <div className="mb-5 text-[11px] text-[var(--color-text-muted)]">
                当前共 <span className="font-semibold text-red-500">{blockedCount}</span> 个卡点存在堵点，共 {total} 个卡点
              </div>

              <div className="space-y-4">
                {topLevelRows.map(row => {
                  const m   = BLOCKAGE_META[row.metaKey]
                  const pct = (row.count / maxCount) * 100
                  const isInProgress = row.label === '学习中'
                  return (
                    <div key={row.label}>
                      {/* 标签 + 数量 */}
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: m.color }} />
                          <span className="text-[11px] font-semibold" style={{ color: m.color }}>{row.label}</span>
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: m.color }}>{row.count} 个</span>
                      </div>
                      {/* 横向条形 */}
                      <div className="h-5 w-full overflow-hidden rounded-full bg-[#ede8e3]">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: m.color, opacity: 0.5, minWidth: row.count > 0 ? '6px' : '0' }} />
                      </div>
                      {/* 子项（仅学习中展开两个子类）*/}
                      {isInProgress ? (
                        <div className="mt-2 space-y-2 border-l-2 pl-3" style={{ borderColor: m.color + '55' }}>
                          {/* 待老师处理 */}
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: BLOCKAGE_META.pendingTeacher.color }} />
                                <span className="text-[10px] font-medium" style={{ color: BLOCKAGE_META.pendingTeacher.color }}>待老师处理</span>
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: BLOCKAGE_META.pendingTeacher.color }}>{blockageData.pendingTeacher.length} 个</span>
                            </div>
                            <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#ede8e3]">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${(blockageData.pendingTeacher.length / Math.max(inProgressCount, 1)) * 100}%`, backgroundColor: BLOCKAGE_META.pendingTeacher.color, opacity: 0.5 }} />
                            </div>
                            <ItemPills items={blockageData.pendingTeacher} metaKey="pendingTeacher" />
                          </div>
                          {/* 作业/反馈未完成 */}
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: BLOCKAGE_META.pendingAssignment.color }} />
                                <span className="text-[10px] font-medium" style={{ color: BLOCKAGE_META.pendingAssignment.color }}>作业/反馈未完成</span>
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: BLOCKAGE_META.pendingAssignment.color }}>{blockageData.pendingAssignment.length} 个</span>
                            </div>
                            <div className="h-3.5 w-full overflow-hidden rounded-full bg-[#ede8e3]">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${(blockageData.pendingAssignment.length / Math.max(inProgressCount, 1)) * 100}%`, backgroundColor: BLOCKAGE_META.pendingAssignment.color, opacity: 0.5 }} />
                            </div>
                            <ItemPills items={blockageData.pendingAssignment} metaKey="pendingAssignment" />
                          </div>
                        </div>
                      ) : (
                        /* 未开始 / 已学未过 直接展示学生 */
                        <ItemPills
                          items={row.label === '未开始' ? blockageData.notStarted : blockageData.learnedNotPassed}
                          metaKey={row.metaKey}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

          </div>
        </div>

        <div>
          <SectionHeader label="维度分析" />
          <div className="mt-3 grid grid-cols-2 gap-4 items-start">
            <ProgressBreakdownCard today={today} />
            <ResultFactorsCard />
          </div>
        </div>

      </div>
    </div>
  )
}
