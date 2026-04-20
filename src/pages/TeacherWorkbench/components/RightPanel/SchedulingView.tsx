import { addDays, addWeeks, format, isToday, startOfWeek, subDays, subWeeks } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useWorkbenchStore } from '../../store/workbenchStore'
import type { CalEvent, StudentItem } from '../../types'

type ViewMode = 'week' | 'day'

type EditorState =
  | { mode: 'create'; date: string }
  | { mode: 'edit'; event: CalEvent }

type OperationRecord = {
  id: string
  type: '新增排课' | '修改日程' | '删除日程'
  title: string
  date: string
  timeRange: string
  createdAt: string
}

const statusStyle: Record<StudentItem['status'], { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-[#eef7f1] text-[#4d8b63]' },
  warning: { label: '异常', className: 'bg-[#fff1ee] text-[#d96b4d]' },
  new: { label: '新生', className: 'bg-[#eef4ff] text-[#5c7fd6]' },
  leave: { label: '请假', className: 'bg-[#f3f4f6] text-[#6b7280]' },
  completed: { label: '结课', className: 'bg-[#f3f4f6] text-[#6b7280]' },
}

const typeStyle: Record<CalEvent['type'], { label: string; className: string }> = {
  class: { label: '课程', className: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
  meeting: { label: '会议', className: 'bg-[#eef4ff] text-[#5c7fd6]' },
}

function compareEvent(a: CalEvent, b: CalEvent) {
  const left = `${a.date} ${a.startTime}`
  const right = `${b.date} ${b.startTime}`
  return left.localeCompare(right)
}

function buildDefaultTitle(student: StudentItem | null) {
  return student ? `课程 · ${student.name}` : '新建课程'
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-3">
      <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-xl font-semibold text-[var(--color-text-primary)]">{value}</div>
      <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{hint}</div>
    </div>
  )
}

function EventEditorModal({
  state,
  selectedStudent,
  onClose,
  onSubmit,
  onDelete,
}: {
  state: EditorState
  selectedStudent: StudentItem | null
  onClose: () => void
  onSubmit: (payload: Omit<CalEvent, 'id'>) => void
  onDelete: (eventId: string) => void
}) {
  const editing = state.mode === 'edit'
  const current = editing ? state.event : null
  const [title, setTitle] = useState(current?.title ?? buildDefaultTitle(selectedStudent))
  const [date, setDate] = useState(current?.date ?? (state.mode === 'create' ? state.date : ''))
  const [startTime, setStartTime] = useState(current?.startTime ?? '19:00')
  const [endTime, setEndTime] = useState(current?.endTime ?? '20:30')
  const [type, setType] = useState<CalEvent['type']>(current?.type ?? 'class')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!title.trim()) {
      setError('请填写日程标题')
      return
    }

    if (endTime <= startTime) {
      setError('结束时间需要晚于开始时间')
      return
    }

    setError('')
    onSubmit({
      title: title.trim(),
      date,
      startTime,
      endTime,
      type,
      link: current?.link,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25" />
      <div
        className="relative w-[420px] rounded-[var(--radius-card)] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <div className="text-base font-semibold text-[var(--color-text-primary)]">
              {editing ? '编辑排课' : '新增排课'}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
              {selectedStudent ? `当前选中学生：${selectedStudent.name}` : '未选择学生也可以直接创建日程'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-left)]"
          >
            关闭
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {current?.link && (
            <a
              href={current.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#5c7fd6]"
            >
              已关联课堂链接
            </a>
          )}

          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">标题</div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              placeholder="请输入课程或会议标题"
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">类型</div>
            <div className="flex gap-2">
              {(['class', 'meeting'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={[
                    'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    type === value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]',
                  ].join(' ')}
                >
                  {value === 'class' ? '课程' : '会议'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-[var(--color-text-secondary)]">日期</div>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-[var(--color-text-secondary)]">开始时间</div>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-[var(--color-text-secondary)]">结束时间</div>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-[#fff1ee] px-3 py-2 text-xs text-[#d96b4d]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-5 py-4">
          {editing && current ? (
            <button
              type="button"
              onClick={() => onDelete(current.id)}
              className="rounded-lg border border-[#f1c0b2] px-3 py-2 text-sm font-medium text-[#d96b4d] hover:bg-[#fff1ee]"
            >
              删除日程
            </button>
          ) : <div className="flex-1" />}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {editing ? '保存修改' : '确认排课'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduleDayCard({
  date,
  events,
  onCreate,
  onEdit,
}: {
  date: Date
  events: CalEvent[]
  onCreate: (date: string) => void
  onEdit: (event: CalEvent) => void
}) {
  const dayKey = format(date, 'yyyy-MM-dd')

  return (
    <div className="min-h-[280px] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
            {format(date, 'M月d日', { locale: zhCN })}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            {format(date, 'EEEE', { locale: zhCN })}
            {isToday(date) ? ' · 今天' : ''}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCreate(dayKey)}
          className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:opacity-90"
        >
          新增
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        {events.length === 0 ? (
          <button
            type="button"
            onClick={() => onCreate(dayKey)}
            className="flex w-full items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] px-3 py-8 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            暂无日程，点击新增
          </button>
        ) : (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onEdit(event)}
              className="block w-full rounded-xl border border-[var(--color-border)] px-3 py-3 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeStyle[event.type].className}`}>
                  {typeStyle[event.type].label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {event.startTime} - {event.endTime}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{event.title}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <span>{event.date}</span>
                {event.link && (
                  <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[#5c7fd6]">已挂链接</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export function SchedulingView() {
  const calendarEvents = useWorkbenchStore((state) => state.calendarEvents)
  const students = useWorkbenchStore((state) => state.students)
  const teacherName = useWorkbenchStore((state) => state.teacherName)
  const addCalendarEvent = useWorkbenchStore((state) => state.addCalendarEvent)
  const updateCalendarEvent = useWorkbenchStore((state) => state.updateCalendarEvent)
  const deleteCalendarEvent = useWorkbenchStore((state) => state.deleteCalendarEvent)

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [cursorDate, setCursorDate] = useState(() => new Date())
  const [keyword, setKeyword] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [records, setRecords] = useState<OperationRecord[]>([])

  const selectedStudent = students.find((item) => item.id === selectedStudentId) ?? null

  const visibleDates = useMemo(() => {
    if (viewMode === 'day') {
      return [cursorDate]
    }

    const start = startOfWeek(cursorDate, { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [cursorDate, viewMode])

  const visibleDateKeys = useMemo(
    () => new Set(visibleDates.map((item) => format(item, 'yyyy-MM-dd'))),
    [visibleDates],
  )

  const visibleEvents = useMemo(
    () => calendarEvents.filter((event) => visibleDateKeys.has(event.date)).sort(compareEvent),
    [calendarEvents, visibleDateKeys],
  )

  const filteredStudents = useMemo(() => {
    const query = keyword.trim()
    if (!query) return students

    return students.filter((item) =>
      item.name.includes(query) || item.grade.includes(query) || item.subject.includes(query),
    )
  }, [keyword, students])

  const visibleClasses = visibleEvents.filter((event) => event.type === 'class').length
  const visibleMeetings = visibleEvents.filter((event) => event.type === 'meeting').length

  const dateLabel = useMemo(() => {
    if (viewMode === 'day') {
      return format(cursorDate, 'yyyy年M月d日 EEEE', { locale: zhCN })
    }

    const start = visibleDates[0]
    const end = visibleDates[visibleDates.length - 1]
    return `${format(start, 'M月d日', { locale: zhCN })} - ${format(end, 'M月d日', { locale: zhCN })}`
  }, [cursorDate, viewMode, visibleDates])

  function moveCursor(direction: 'prev' | 'next') {
    if (viewMode === 'day') {
      setCursorDate((value) => direction === 'prev' ? subDays(value, 1) : addDays(value, 1))
      return
    }

    setCursorDate((value) => direction === 'prev' ? subWeeks(value, 1) : addWeeks(value, 1))
  }

  function pushRecord(type: OperationRecord['type'], event: Pick<CalEvent, 'title' | 'date' | 'startTime' | 'endTime'>) {
    setRecords((current) => [
      {
        id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        title: event.title,
        date: event.date,
        timeRange: `${event.startTime} - ${event.endTime}`,
        createdAt: format(new Date(), 'HH:mm'),
      },
      ...current,
    ].slice(0, 12))
  }

  function handleSubmit(payload: Omit<CalEvent, 'id'>) {
    if (!editorState) return

    if (editorState.mode === 'create') {
      const newEvent: CalEvent = {
        id: `local_${Date.now()}`,
        ...payload,
      }
      void addCalendarEvent(newEvent)
      pushRecord('新增排课', newEvent)
    } else {
      const nextEvent: CalEvent = {
        ...editorState.event,
        ...payload,
      }
      updateCalendarEvent(nextEvent)
      pushRecord('修改日程', nextEvent)
    }

    setEditorState(null)
  }

  function handleDelete(eventId: string) {
    const target = calendarEvents.find((item) => item.id === eventId)
    if (!target) return

    deleteCalendarEvent(eventId)
    pushRecord('删除日程', target)
    setEditorState(null)
  }

  return (
    <div className="flex h-full min-h-0 gap-4 overflow-hidden">
      <div className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
        <div className="border-b border-[var(--color-border)] px-4 py-4">
          <div className="text-base font-semibold text-[var(--color-text-primary)]">学生列表</div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            选择学生后，新增排课时会自动带出学生名称
          </div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索学生姓名 / 年级 / 学科"
            className="mt-3 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="flex-1 overflow-auto">
          {filteredStudents.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">暂无匹配学生</div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => setSelectedStudentId(student.id)}
                className={[
                  'flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors',
                  selectedStudentId === student.id ? 'bg-[var(--color-primary-light)]' : 'hover:bg-[var(--color-bg-left)]',
                ].join(' ')}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: student.color }}
                >
                  {student.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{student.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle[student.status].className}`}>
                      {statusStyle[student.status].label}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {student.grade || '未填写年级'} · {student.subject || '未填写学科'}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    最近上课：{student.lastSession || '暂无'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="grid shrink-0 grid-cols-4 gap-3">
          <SummaryCard label="当前老师" value={teacherName || '未登录老师'} hint="排课写入当前老师名下" />
          <SummaryCard label={viewMode === 'week' ? '本周课程' : '当日课程'} value={visibleClasses} hint="真实读取 calendar_events" />
          <SummaryCard label={viewMode === 'week' ? '本周会议' : '当日会议'} value={visibleMeetings} hint="支持编辑和删除" />
          <SummaryCard label="学生总数" value={students.length} hint="真实读取老师名下学生" />
        </div>

        <div className="mt-4 flex min-h-0 gap-4 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-left)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] bg-white px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">去排课</div>
                <div className="mt-1 text-xs text-[var(--color-text-muted)]">{dateLabel}</div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {selectedStudent && (
                  <span className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                    当前学生：{selectedStudent.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCursorDate(new Date())}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => moveCursor('prev')}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
                >
                  上一个
                </button>
                <button
                  type="button"
                  onClick={() => moveCursor('next')}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]"
                >
                  下一个
                </button>
                <div className="flex items-center rounded-lg bg-[var(--color-bg-left)] p-1">
                  {(['week', 'day'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setViewMode(item)}
                      className={[
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        viewMode === item
                          ? 'bg-white text-[var(--color-primary)] shadow-sm'
                          : 'text-[var(--color-text-secondary)]',
                      ].join(' ')}
                    >
                      {item === 'week' ? '周视图' : '日视图'}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEditorState({ mode: 'create', date: format(cursorDate, 'yyyy-MM-dd') })}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  新增排课
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className={viewMode === 'week' ? 'grid grid-cols-2 gap-4 xl:grid-cols-4 2xl:grid-cols-7' : 'grid grid-cols-1 gap-4'}>
                {visibleDates.map((date) => (
                  <ScheduleDayCard
                    key={format(date, 'yyyy-MM-dd')}
                    date={date}
                    events={visibleEvents.filter((event) => event.date === format(date, 'yyyy-MM-dd'))}
                    onCreate={(value) => setEditorState({ mode: 'create', date: value })}
                    onEdit={(event) => setEditorState({ mode: 'edit', event })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
            <div className="border-b border-[var(--color-border)] px-4 py-4">
              <div className="text-base font-semibold text-[var(--color-text-primary)]">最近操作</div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                这里记录本次登录后新增、修改、删除的排课动作
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {records.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">还没有排课操作记录</div>
              ) : (
                records.map((record) => (
                  <div key={record.id} className="border-b border-[var(--color-border)] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                        {record.type}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">{record.createdAt}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{record.title}</div>
                    <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {record.date} · {record.timeRange}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[var(--color-border)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--color-text-primary)]">当前时段清单</div>
              <div className="mt-3 space-y-2">
                {visibleEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
                    当前时段还没有任何排课数据
                  </div>
                ) : (
                  visibleEvents.slice(0, 8).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setEditorState({ mode: 'edit', event })}
                      className="flex w-full items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left hover:border-[var(--color-primary)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">{event.title}</div>
                        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {event.date} · {event.startTime} - {event.endTime}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeStyle[event.type].className}`}>
                        {typeStyle[event.type].label}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editorState && (
        <EventEditorModal
          state={editorState}
          selectedStudent={selectedStudent}
          onClose={() => setEditorState(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
