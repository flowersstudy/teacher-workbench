import { createPortal } from 'react-dom'
import { addMonths, eachDayOfInterval, endOfMonth, format, isToday, parseISO, startOfMonth, subMonths } from 'date-fns'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  contactIdToStudentId,
  contactSubtitleById,
  contactsByTab,
  groupMembersByContactId,
  messagesByContactId,
  myDiagnosisStudents,
  myTeachingStudents,
  teacher,
} from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import type { CalEvent, ChatMessage, ContactItem } from '../../types'
import { ManageMembersModal } from './ManageMembersModal'
import { NotesModal } from './NotesModal'

// ── student status ────────────────────────────────────────────────────────────
const studentStatusConfig = {
  normal:    { label: '正常',   cls: 'bg-green-100 text-green-600' },
  warning:   { label: '异常',   cls: 'bg-red-100 text-red-500' },
  new:       { label: '新学员', cls: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' },
  leave:     { label: '已请假', cls: 'bg-gray-100 text-gray-500' },
  completed: { label: '已完成', cls: 'bg-teal-50 text-teal-700' },
}

const allStudentsById = Object.fromEntries(
  [...myTeachingStudents, ...myDiagnosisStudents].map((s) => [s.id, s]),
)

// ── helpers ───────────────────────────────────────────────────────────────────
function findContact(contactId: string): ContactItem | null {
  const all = [
    ...contactsByTab.todayMessages,
    ...contactsByTab.yesterdayUnreplied,
    ...contactsByTab.complaints,
    ...contactsByTab.colleagues,
  ]
  return all.find((c) => c.id === contactId) ?? null
}

// ── style maps ────────────────────────────────────────────────────────────────
const roleBubbleStyle: Record<string, string> = {
  带教老师: 'bg-[var(--color-primary)] text-white',
  学生:     'bg-gray-100 text-[var(--color-text-primary)]',
  诊断老师: 'bg-[#e6f1fb] text-[#185fa5]',
  学管:     'bg-[#e8f5e2] text-[#2d6a2d]',
  校长:     'bg-[#f3e8ff] text-[#6b21a8]',
}
const roleAvatarColor: Record<string, string> = {
  带教老师: '#e8845a',
  学生:     '#888888',
  诊断老师: '#4a90d9',
  学管:     '#4caf74',
  校长:     '#9c6fcc',
}

// ── date helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']
function formatDateLabel(date: string): string {
  if (!date || date === '更早') return '更早'
  try {
    const d = parseISO(date)
    return `${format(d, 'M月d日')} 星期${DAY_NAMES[d.getDay()]}`
  } catch {
    return date
  }
}

// ── DatePickerCalendar ────────────────────────────────────────────────────────
const WEEK_HEADERS = ['日', '一', '二', '三', '四', '五', '六']

function DatePickerCalendar({
  activeDates,
  selected,
  onSelect,
}: {
  activeDates: Set<string>
  selected: string | null
  onSelect: (date: string | null) => void
}) {
  const [viewDate, setViewDate] = useState(() => {
    // Start on the month of the latest active date, or today
    const sorted = [...activeDates].sort()
    return sorted.length ? startOfMonth(parseISO(sorted[sorted.length - 1])) : startOfMonth(new Date())
  })

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) })
  // leading empty cells so the first day aligns on the correct weekday
  const leadingBlanks = days[0].getDay() // 0=Sun … 6=Sat

  return (
    <div className="w-56 select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => setViewDate((d) => subMonths(d, 1))}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bg-left)] text-[var(--color-text-muted)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          {format(viewDate, 'yyyy年M月')}
        </span>
        <button
          type="button"
          onClick={() => setViewDate((d) => addMonths(d, 1))}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--color-bg-left)] text-[var(--color-text-muted)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_HEADERS.map((h) => (
          <div key={h} className="text-center text-[10px] text-[var(--color-text-muted)]">{h}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank_${i}`} />
        ))}
        {days.map((day) => {
          const key   = format(day, 'yyyy-MM-dd')
          const hasMsg = activeDates.has(key)
          const isSel  = selected === key
          const todayDot = isToday(day)

          return (
            <button
              key={key}
              type="button"
              disabled={!hasMsg}
              onClick={() => onSelect(isSel ? null : key)}
              className={[
                'relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors',
                isSel
                  ? 'bg-[var(--color-primary)] font-semibold text-white'
                  : hasMsg
                    ? 'font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-primary-light)]'
                    : 'cursor-default text-[var(--color-text-muted)] opacity-40',
              ].join(' ')}
            >
              {format(day, 'd')}
              {/* today indicator dot (only when not selected) */}
              {todayDot && !isSel && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-primary)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function Bubble({
  msg,
  onContextMenu,
}: {
  msg: ChatMessage
  onContextMenu: (e: React.MouseEvent) => void
}) {
  if (msg.recalled) {
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-[10px] text-[var(--color-text-muted)]">该消息已撤回</span>
      </div>
    )
  }

  const isSelf     = msg.sender === '带教老师'
  const bubbleCls  = roleBubbleStyle[msg.sender] ?? 'bg-gray-100 text-[var(--color-text-primary)]'
  const avatarColor = roleAvatarColor[msg.sender] ?? '#888'

  return (
    <div
      className={['flex items-end gap-2', isSelf ? 'flex-row-reverse' : ''].join(' ')}
      onContextMenu={onContextMenu}
    >
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
      >
        {msg.senderName.slice(0, 1)}
      </div>

      {/* Content */}
      <div className={['flex max-w-[65%] flex-col', isSelf ? 'items-end' : 'items-start'].join(' ')}>
        {!isSelf && (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">{msg.senderName}</span>
            <span className="rounded-full bg-[var(--color-bg-left)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-muted)]">
              {msg.sender}
            </span>
          </div>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div className="mb-1 max-w-full rounded border-l-2 border-[var(--color-primary)] bg-[var(--color-bg-left)] px-2 py-1">
            <div className="text-[10px] font-semibold text-[var(--color-primary)]">{msg.replyTo.senderName}</div>
            <div className="truncate text-[10px] text-[var(--color-text-secondary)]">{msg.replyTo.text}</div>
          </div>
        )}

        {msg.msgType === 'image' && msg.fileUrl ? (
          <img src={msg.fileUrl} alt={msg.fileName ?? '图片'} className="max-w-[200px] rounded-lg object-cover shadow-sm" />
        ) : msg.msgType === 'file' && msg.fileUrl ? (
          <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-[var(--radius-bubble)] border border-[var(--color-border)] bg-white px-3 py-2 hover:bg-[var(--color-primary-light)] transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            <div>
              <div className="max-w-[140px] truncate text-xs font-medium text-[var(--color-text-primary)]">{msg.fileName}</div>
              {msg.fileSize && <div className="text-[10px] text-[var(--color-text-muted)]">{msg.fileSize}</div>}
            </div>
          </a>
        ) : msg.msgType === 'audio' && msg.fileUrl ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-bubble)] bg-[var(--color-primary-light)] px-3 py-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-primary)" stroke="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="19" x2="12" y2="23" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/></svg>
            <audio src={msg.fileUrl} controls className="h-7 w-36 accent-[var(--color-primary)]" />
            {msg.audioDuration !== undefined && (
              <span className="text-[10px] text-[var(--color-primary)]">{msg.audioDuration}″</span>
            )}
          </div>
        ) : (
          <div className={['whitespace-pre-wrap rounded-[var(--radius-bubble)] px-3 py-2 text-sm', bubbleCls].join(' ')}>
            {msg.text}
          </div>
        )}
        <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">{msg.time}</div>
      </div>
    </div>
  )
}

// ── AddEventModal ─────────────────────────────────────────────────────────────
function AddEventModal({
  initialText,
  onAdd,
  onClose,
}: {
  initialText: string
  onAdd: (e: CalEvent) => void
  onClose: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [title, setTitle]         = useState(initialText.slice(0, 30))
  const [date, setDate]           = useState(today)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime]     = useState('11:00')
  const [type, setType]           = useState<CalEvent['type']>('meeting')

  function submit() {
    if (!title.trim() || !date || !startTime || !endTime) return
    onAdd({ id: `ev_${Date.now()}`, title: title.trim(), date, startTime, endTime, type })
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-72 rounded-[var(--radius-card)] bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">新增日程</div>
        <div className="space-y-2.5">
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--color-text-secondary)]">标题</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--color-text-secondary)]">日期</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="mb-0.5 text-[10px] text-[var(--color-text-secondary)]">开始</div>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
            </div>
            <div className="flex-1">
              <div className="mb-0.5 text-[10px] text-[var(--color-text-secondary)]">结束</div>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]" />
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] text-[var(--color-text-secondary)]">类型</div>
            <select value={type} onChange={(e) => setType(e.target.value as CalEvent['type'])}
              className="w-full rounded border border-[var(--color-border)] px-2 py-1.5 text-sm outline-none focus:border-[var(--color-primary)]">
              <option value="meeting">会议</option>
              <option value="class">课程</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]">
            取消
          </button>
          <button type="button" onClick={submit}
            className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-dark)]">
            确认
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── EmojiPicker ───────────────────────────────────────────────────────────────
const EMOJIS = [
  '😀','😂','🥹','😊','😍','🥰','😎','🤩','😅','😭','😤','😡','🥺','😴','🤔',
  '👍','👎','👏','🙏','🤝','✌️','👋','💪','🫡','❤️','🔥','✨','🎉','💯','👀',
  '🍎','🍕','☕','🎵','📚','💡','🏆','📝','⏰','🚀','🌟','💬','📌','🎯','🤓',
]

interface StickerItem { id: string; url: string; name: string }

function EmojiPicker({
  onPickEmoji,
  onPickSticker,
}: {
  onPickEmoji: (e: string) => void
  onPickSticker: (url: string, name: string) => void
}) {
  const [tab, setTab]           = useState<'emoji' | 'sticker'>('emoji')
  const [stickers, setStickers] = useState<StickerItem[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  // TODO: 贴纸功能待接入文件上传接口
  useEffect(() => { setStickers([]) }, [])

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    try {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      if (imageFiles.length === 0) return
      const nextStickers = imageFiles.map((file) => ({
        id: `sticker_${Date.now()}_${file.name}`,
        url: URL.createObjectURL(file),
        name: file.name,
      }))
      setStickers((prev) => [...nextStickers, ...prev])
    } finally {
      setUploading(false)
    }
  }

  async function deleteSticker(id: string, _url: string) {
    URL.revokeObjectURL(_url)
    setStickers((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="w-72 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)]">
        {(['emoji', 'sticker'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={[
              'flex-1 py-1.5 text-xs font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            ].join(' ')}>
            {t === 'emoji' ? '😊 表情' : '🖼 表情包'}
          </button>
        ))}
      </div>

      {tab === 'emoji' ? (
        <div className="grid grid-cols-8 gap-0.5 p-2">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => onPickEmoji(e)}
              className="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-[var(--color-primary-light)] transition-colors">
              {e}
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2">
          {/* Drop zone / upload */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragging(false)
              void uploadFiles(Array.from(e.dataTransfer.files))
            }}
            onClick={() => !uploading && uploadRef.current?.click()}
            className={[
              'mb-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-3 transition-colors',
              uploading
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] cursor-wait'
                : dragging
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
            ].join(' ')}
          >
            {uploading ? (
              <span className="text-[10px] text-[var(--color-primary)]">上传中…</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-text-muted)]">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="mt-1 text-[10px] text-[var(--color-text-muted)]">点击或拖拽上传图片</span>
              </>
            )}
          </div>
          <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { void uploadFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />

          {stickers.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">暂无表情包，上传图片即可使用</div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-auto">
              {stickers.map((s) => (
                <div key={s.id} className="group relative">
                  <button type="button" onClick={() => onPickSticker(s.url, s.name)}
                    className="h-14 w-full overflow-hidden rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors">
                    <img src={s.url} alt={s.name} className="h-full w-full object-cover" />
                  </button>
                  <button type="button" onClick={() => void deleteSticker(s.id, s.url)}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] text-white group-hover:flex">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ChatView ──────────────────────────────────────────────────────────────────
export function ChatView() {
  const selectedContactId = useWorkbenchStore((s) => s.selectedContactId)
  const groupMembersMap = useWorkbenchStore((s) => s.groupMembersMap)
  const openManageMembers = useWorkbenchStore((s) => s.openManageMembers)
  const selectContact     = useWorkbenchStore((s) => s.selectContact)
  const addCalendarEvent  = useWorkbenchStore((s) => s.addCalendarEvent)
  const openNotes          = useWorkbenchStore((s) => s.openNotes)
  const notesMap           = useWorkbenchStore((s) => s.notesMap)
  const loadNotes          = useWorkbenchStore((s) => s.loadNotes)
  const openStudentProfile   = useWorkbenchStore((s) => s.openStudentProfile)
  const openTeacherProfile   = useWorkbenchStore((s) => s.openTeacherProfile)

  const contact = useMemo(
    () => (selectedContactId ? findContact(selectedContactId) : null),
    [selectedContactId],
  )

  const [messageMap, setMessageMap] = useState<Record<string, ChatMessage[]>>(
    () => messagesByContactId,
  )
  const messages = useMemo(
    () => (contact ? (messageMap[contact.id] ?? []) : []),
    [contact, messageMap],
  )

  const allContacts = useMemo(() => {
    const map = new Map<string, ContactItem>()
    ;[
      ...contactsByTab.todayMessages,
      ...contactsByTab.yesterdayUnreplied,
      ...contactsByTab.complaints,
    ].forEach((c) => map.set(c.id, c))
    return [...map.values()]
  }, [])

  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
    setFilterDate(null)
    setShowDatePicker(false)
  }, [contact?.id])

  // 切换联系人时自动加载备注
  useEffect(() => {
    if (contact?.id) void loadNotes(contact.id)
  }, [contact?.id, loadNotes])

  const [draft, setDraft]             = useState('')
  const [loadingHistory, setLoading]  = useState(false)
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null)
  const [addEventMsg, setAddEventMsg] = useState<ChatMessage | null>(null)
  const [ctxMenu, setCtxMenu]         = useState<{
    msgId: string; x: number; y: number; isSelf: boolean
  } | null>(null)
  const [showEmoji, setShowEmoji]     = useState(false)
  const [recording, setRecording]     = useState(false)
  const [recSecs, setRecSecs]         = useState(0)
  const mediaRecRef  = useRef<MediaRecorder | null>(null)
  const audioChunks  = useRef<Blob[]>([])
  const recTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const emojiRef          = useRef<HTMLDivElement>(null)
  const [filterDate, setFilterDate]         = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [overviewTab, setOverviewTab]       = useState<'today' | 'yesterday' | 'complaints'>('today')
  const [showFilePanel, setShowFilePanel]   = useState(false)
  const [fileQuery, setFileQuery]           = useState('')
  const datePicker = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showDatePicker) return
    const fn = (e: MouseEvent) => {
      if (datePicker.current && !datePicker.current.contains(e.target as Node)) setShowDatePicker(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showDatePicker])

  useEffect(() => {
    if (!showEmoji) return
    const fn = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [showEmoji])

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  function pushMsg(partial: Omit<ChatMessage, 'id' | 'contactId' | 'sender' | 'senderName' | 'time' | 'date'>) {
    if (!contact) return
    const now = new Date()
    const next: ChatMessage = {
      id: `s_${Date.now()}`,
      contactId: contact.id,
      sender: '带教老师',
      senderName: teacher.name,
      time: format(now, 'HH:mm'),
      date: format(now, 'yyyy-MM-dd'),
      ...partial,
    }
    setMessageMap((m) => ({ ...m, [contact.id]: [...(m[contact.id] ?? []), next] }))
    window.setTimeout(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight }, 0)
  }

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach((f) => {
      const url = URL.createObjectURL(f)
      pushMsg({ text: '[图片]', msgType: 'image', fileUrl: url, fileName: f.name })
    })
    e.target.value = ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach((f) => {
      const url = URL.createObjectURL(f)
      pushMsg({ text: '[文件]', msgType: 'file', fileUrl: url, fileName: f.name, fileSize: formatFileSize(f.size) })
    })
    e.target.value = ''
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      audioChunks.current = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const url  = URL.createObjectURL(blob)
        const dur  = recSecs
        stream.getTracks().forEach((t) => t.stop())
        pushMsg({ text: '[语音]', msgType: 'audio', fileUrl: url, audioDuration: dur })
        setRecSecs(0)
      }
      rec.start()
      mediaRecRef.current = rec
      setRecording(true)
      recTimerRef.current = setInterval(() => setRecSecs((s) => s + 1), 1000)
    } catch {
      alert('无法访问麦克风，请检查浏览器权限。')
    }
  }

  function stopRecording() {
    mediaRecRef.current?.stop()
    if (recTimerRef.current) clearInterval(recTimerRef.current)
    setRecording(false)
  }

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const fn = () => setCtxMenu(null)
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [ctxMenu])

  function findMsg(id: string) {
    return (contact ? (messageMap[contact.id] ?? []) : []).find((m) => m.id === id) ?? null
  }

  function recallMsg(id: string) {
    if (!contact) return
    setMessageMap((m) => ({
      ...m,
      [contact.id]: (m[contact.id] ?? []).map((msg) =>
        msg.id === id ? { ...msg, recalled: true } : msg,
      ),
    }))
  }

  function deleteMsg(id: string) {
    if (!contact) return
    setMessageMap((m) => ({
      ...m,
      [contact.id]: (m[contact.id] ?? []).filter((msg) => msg.id !== id),
    }))
  }

  function prependHistory(contactId: string) {
    const c = findContact(contactId)
    setMessageMap((m) => ({
      ...m,
      [contactId]: [
        { id: `h_${Date.now()}`, contactId, sender: '学生', senderName: c?.name ?? '学生', text: '（历史消息）老师我上次也遇到类似问题…', time: '更早' },
        ...(m[contactId] ?? []),
      ],
    }))
  }

  function buildLines(contacts: ContactItem[]) {
    const lines: string[] = [
      '=== 带教老师工作台 · 聊天记录导出 ===',
      `导出时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      '',
    ]
    for (const c of contacts) {
      const msgs = (messageMap[c.id] ?? []).filter((m) => !m.recalled)
      if (msgs.length === 0) continue
      const divider = '─'.repeat(36)
      lines.push(divider)
      lines.push(`【${c.name}】${contactSubtitleById[c.id] ?? ''}`)
      lines.push(divider)
      for (const msg of msgs) {
        const replyPart = msg.replyTo ? ` （引用 ${msg.replyTo.senderName}：${msg.replyTo.text.slice(0, 20)}…）` : ''
        lines.push(`[${msg.time}] ${msg.senderName}（${msg.sender}）：${msg.text}${replyPart}`)
      }
      lines.push('')
    }
    return lines
  }

  function downloadTxt(lines: string[], filename: string) {
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function exportChats() {
    downloadTxt(buildLines(allContacts), `全部聊天记录_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`)
  }

  function exportCurrentChat() {
    if (!contact) return
    downloadTxt(buildLines([contact]), `${contact.name}_聊天记录_${format(new Date(), 'yyyyMMdd_HHmmss')}.txt`)
  }

  function sendMessage() {
    const text = draft.trim()
    if (!text || !contact) return
    pushMsg({
      text,
      msgType: 'text',
      ...(replyTarget ? { replyTo: { id: replyTarget.id, senderName: replyTarget.senderName, text: replyTarget.text } } : {}),
    })
    setDraft('')
    setReplyTarget(null)
  }

  // ── Private chat view ──
  // ── No contact: overview ──
  if (!contact) {
    const overviewTabs = [
      { key: 'today' as const,      label: '今日消息',  contacts: contactsByTab.todayMessages },
      { key: 'yesterday' as const,  label: '昨日未回',  contacts: contactsByTab.yesterdayUnreplied },
      { key: 'complaints' as const, label: '投诉',      contacts: contactsByTab.complaints },
    ]
    const activeContacts = overviewTabs.find((t) => t.key === overviewTab)?.contacts ?? []

    // 异常用户：全部 warning 学生，按卡点课/诊断课分组
    const warningTeaching   = myTeachingStudents.filter((s) => s.status === 'warning')
    const warningDiagnosis  = myDiagnosisStudents.filter((s) => s.status === 'warning')

    function ContactRow({ c }: { c: ContactItem }) {
      const recent    = [...(messageMap[c.id] ?? [])].reverse().find((m) => !m.recalled)
      const members   = groupMembersByContactId[c.id] ?? []
      const studentId = contactIdToStudentId[c.id]
      const student   = studentId ? allStudentsById[studentId] : null
      const statusCfg = student ? studentStatusConfig[student.status] : null
      return (
        <button key={c.id} type="button" onClick={() => selectContact(c.id)}
          className="flex w-full items-center gap-3 rounded-[var(--radius-card)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-primary-light)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: c.color }}>
            {c.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{c.name}</span>
              {c.contactType === 'colleague' && (
                <span className="shrink-0 rounded-full bg-[#e6f1fb] px-1.5 py-0.5 text-[9px] text-[#185fa5]">同事</span>
              )}
              {statusCfg && (
                <span className={['shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium', statusCfg.cls].join(' ')}>
                  {statusCfg.label}
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
              {c.contactType === 'colleague'
                ? (recent?.text ?? c.preview)
                : members.length > 0
                  ? members.map((m) => `${m.role}:${m.name}`).join(' · ')
                  : (recent?.text ?? c.preview)}
            </div>
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)]">{recent?.time ?? c.time}</div>
        </button>
      )
    }

    return (
      <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">聊天总览</span>
          <button
            type="button"
            onClick={exportChats}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
          >
            导出记录
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--color-border)] px-3 py-2">
          {overviewTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setOverviewTab(t.key)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                overviewTab === t.key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-light)]',
              ].join(' ')}
            >
              {t.label}
              {t.contacts.length > 0 && (
                <span className={['ml-1 rounded-full px-1 text-[10px]', overviewTab === t.key ? 'bg-white/30' : 'bg-[var(--color-bg-left)]'].join(' ')}>
                  {t.contacts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {/* 昨日未回 — 异常用户区块 */}
          {overviewTab === 'yesterday' && (warningTeaching.length > 0 || warningDiagnosis.length > 0) && (
            <div className="mb-3 rounded-[var(--radius-card)] border border-red-100 bg-red-50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-red-600">异常用户</span>
                <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-500">
                  {warningTeaching.length + warningDiagnosis.length} 人
                </span>
              </div>
              <div className="space-y-3">
                {warningTeaching.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold text-[var(--color-text-muted)]">卡点课</div>
                    <div className="space-y-1">
                      {warningTeaching.map((s) => {
                        const c = s.contactId ? allContacts.find((ct) => ct.id === s.contactId) : null
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => c && selectContact(c.id)}
                            disabled={!c}
                            className="flex w-full items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-left hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: s.color }}>
                              {s.avatar}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">{s.grade} · {s.subject}</div>
                            </div>
                            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-500">异常</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {warningDiagnosis.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold text-[var(--color-text-muted)]">诊断课</div>
                    <div className="space-y-1">
                      {warningDiagnosis.map((s) => {
                        const c = s.contactId ? allContacts.find((ct) => ct.id === s.contactId) : null
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => c && selectContact(c.id)}
                            disabled={!c}
                            className="flex w-full items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-left hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: s.color }}>
                              {s.avatar}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-[var(--color-text-primary)]">{s.name}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">{s.grade} · {s.subject}</div>
                            </div>
                            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-500">异常</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact list */}
          <div className="space-y-1">
            {activeContacts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--color-text-muted)]">暂无消息</div>
            ) : (
              activeContacts.map((c) => <ContactRow key={c.id} c={c} />)
            )}
          </div>
        </div>
      </div>
    )
  }

  const members     = groupMembersMap[contact.id] ?? groupMembersByContactId[contact.id] ?? []
  const isColleague = contact.contactType === 'colleague'

  return (
    <>
      <div className="relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <button
            type="button"
            title="查看资料"
            onClick={() => {
              if (isColleague) {
                openTeacherProfile(contact.name)
              } else {
                const studentId = contactIdToStudentId[contact.id]
                if (studentId) openStudentProfile(studentId)
              }
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white hover:opacity-80 hover:ring-2 hover:ring-offset-1 hover:ring-[var(--color-primary)] transition-opacity"
            style={{ backgroundColor: contact.color }}
          >
            {contact.avatar}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{contact.name}</div>
              {(() => {
                const sid = contactIdToStudentId[contact.id]
                const s   = sid ? allStudentsById[sid] : null
                const cfg = s ? studentStatusConfig[s.status] : null
                if (!cfg) return null
                return (
                  <span className={['shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium', cfg.cls].join(' ')}>
                    {cfg.label}
                  </span>
                )
              })()}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-[var(--color-text-secondary)]">
              <span>
                {isColleague
                  ? (contactSubtitleById[contact.id] ?? '同事')
                  : `${contactSubtitleById[contact.id] ?? '课程信息'} · ${members.length} 个角色`}
              </span>
              {(notesMap[contact.id] ?? []).map((n) => (
                <span key={n.id} className="flex items-center gap-0.5">
                  <span className="text-[var(--color-text-muted)]">·</span>
                  <span className="text-[var(--color-text-secondary)]">{n.text}</span>
                </span>
              ))}
              <button type="button" onClick={() => openNotes(contact.id)}
                className="text-[var(--color-primary)] hover:underline">+ 备注</button>
            </div>
          </div>
          {/* Date filter button */}
          <div ref={datePicker} className="relative shrink-0">
            <button
              type="button"
              title="按日期查记录"
              onClick={() => setShowDatePicker((v) => !v)}
              className={[
                'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                filterDate
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
              ].join(' ')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full z-20 mt-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-3 shadow-lg">
                <DatePickerCalendar
                  activeDates={new Set(messages.map((m) => m.date).filter(Boolean) as string[])}
                  selected={filterDate}
                  onSelect={(d) => { setFilterDate(d); setShowDatePicker(false) }}
                />
              </div>
            )}
          </div>

          {/* File search button */}
          <button
            type="button"
            title="查找文件"
            onClick={() => { setShowFilePanel((v) => !v); setFileQuery('') }}
            className={[
              'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
              showFilePanel
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
            ].join(' ')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={exportCurrentChat}
            title="导出本对话聊天记录"
            className="shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            导出
          </button>
        </div>

        {/* Date filter active banner */}
        {filterDate && (
          <div className="flex items-center justify-between border-b border-[var(--color-primary-light)] bg-[var(--color-primary-light)] px-4 py-1.5">
            <span className="text-[11px] text-[var(--color-primary)]">
              正在查看 {formatDateLabel(filterDate)} 的消息
            </span>
            <button
              type="button"
              onClick={() => setFilterDate(null)}
              className="text-[10px] text-[var(--color-primary)] hover:underline"
            >
              清除
            </button>
          </div>
        )}

        {/* Group member tags (student chats only) */}
        {!isColleague && (
          <div className="border-b border-[var(--color-border)] px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span key={`${contact.id}-${m.role}`}
                  className="rounded-full bg-[var(--color-bg-left)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)]">
                  {m.role}：{m.name}
                </span>
              ))}
              <button
                type="button"
                onClick={() => openManageMembers(contact.id)}
                className="ml-auto rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                管理成员
              </button>
            </div>
          </div>
        )}

        {/* ── File search panel ── */}
        {showFilePanel && (() => {
          const q = fileQuery.trim().toLowerCase()
          const allFileMsgs = allContacts.flatMap((c) =>
            (messageMap[c.id] ?? [])
              .filter((m) => m.msgType === 'file' && m.fileName)
              .map((m) => ({ msg: m, contact: c }))
          ).sort((a, b) => {
            const da = `${a.msg.date ?? ''} ${a.msg.time ?? ''}`
            const db = `${b.msg.date ?? ''} ${b.msg.time ?? ''}`
            return db.localeCompare(da)
          })
          const filtered = q
            ? allFileMsgs.filter((f) => f.msg.fileName!.toLowerCase().includes(q))
            : allFileMsgs

          const extIcon = (name: string) => {
            const ext = name.split('.').pop()?.toLowerCase() ?? ''
            if (ext === 'pdf') return 'text-red-500'
            if (['doc', 'docx'].includes(ext)) return 'text-blue-500'
            if (['ppt', 'pptx'].includes(ext)) return 'text-orange-500'
            if (['xls', 'xlsx'].includes(ext)) return 'text-green-600'
            return 'text-[var(--color-text-muted)]'
          }

          return (
            <div className="flex flex-col border-b border-[var(--color-border)] bg-[var(--color-bg-left)]" style={{ maxHeight: '45%' }}>
              {/* Search input */}
              <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--color-text-muted)]">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={fileQuery}
                  onChange={(e) => setFileQuery(e.target.value)}
                  placeholder="搜索文件名…"
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--color-text-muted)]"
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">共 {filtered.length} 个文件</span>
              </div>

              {/* File list */}
              <div className="flex-1 overflow-auto">
                {filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--color-text-muted)]">未找到相关文件</div>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {filtered.map(({ msg, contact: c }) => (
                      <button
                        key={msg.id}
                        type="button"
                        onClick={() => {
                          selectContact(c.id)
                          if (msg.date) setFilterDate(msg.date)
                          setShowFilePanel(false)
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white transition-colors"
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                          className={['shrink-0', extIcon(msg.fileName!)].join(' ')}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-[var(--color-text-primary)]">{msg.fileName}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                            <span>{msg.fileSize}</span>
                            <span>·</span>
                            <span>{msg.senderName}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-[10px] text-[var(--color-text-muted)]">{msg.date}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Message list */}
        {(() => {
          const displayMsgs = filterDate
            ? messages.filter((m) => m.date === filterDate)
            : messages

          // Build items: date dividers + messages
          type ListItem = { type: 'divider'; date: string } | { type: 'msg'; msg: typeof messages[0] }
          const items: ListItem[] = []
          let lastDate = ''
          for (const m of displayMsgs) {
            const d = m.date ?? ''
            if (d !== lastDate) {
              items.push({ type: 'divider', date: d })
              lastDate = d
            }
            items.push({ type: 'msg', msg: m })
          }

          return (
            <div
              ref={listRef}
              className="flex-1 overflow-auto px-4 py-3"
              onScroll={(e) => {
                const el = e.currentTarget
                if (el.scrollTop <= 0 && !loadingHistory && !filterDate) {
                  setLoading(true)
                  window.setTimeout(() => { prependHistory(contact.id); setLoading(false) }, 250)
                }
              }}
            >
              {loadingHistory && (
                <div className="mb-3 text-center text-[10px] text-[var(--color-text-muted)]">加载历史…</div>
              )}
              {displayMsgs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className="text-xs">该日期暂无聊天记录</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, i) =>
                    item.type === 'divider' ? (
                      <div key={`div_${item.date}_${i}`} className="flex items-center gap-2 py-1">
                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                        <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">
                          {formatDateLabel(item.date)}
                        </span>
                        <div className="h-px flex-1 bg-[var(--color-border)]" />
                      </div>
                    ) : (
                      <Bubble
                        key={item.msg.id}
                        msg={item.msg}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          const x = Math.min(e.clientX, window.innerWidth - 160)
                          const y = Math.min(e.clientY, window.innerHeight - 180)
                          setCtxMenu({ msgId: item.msg.id, x, y, isSelf: item.msg.sender === '带教老师' })
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* Reply preview bar */}
        {replyTarget && (
          <div className="flex items-start gap-2 border-t border-[var(--color-border)] bg-[var(--color-bg-left)] px-3 py-2">
            <div className="min-w-0 flex-1 border-l-2 border-[var(--color-primary)] pl-2">
              <div className="text-[10px] font-semibold text-[var(--color-primary)]">{replyTarget.senderName}</div>
              <div className="truncate text-[10px] text-[var(--color-text-secondary)]">{replyTarget.text}</div>
            </div>
            <button type="button" onClick={() => setReplyTarget(null)}
              className="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
              ✕
            </button>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[var(--color-border)] px-3 pt-2 pb-3 space-y-2">
          {/* Toolbar */}
          <div className="flex items-center gap-1">
            {/* Emoji */}
            <div ref={emojiRef} className="relative">
              <button type="button" title="表情"
                onClick={() => setShowEmoji((v) => !v)}
                className={['flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-primary-light)]', showEmoji ? 'bg-[var(--color-primary-light)]' : ''].join(' ')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </button>
              {showEmoji && createPortal(
                <div
                  className="fixed z-50 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-lg overflow-hidden"
                  style={{ bottom: 80, left: 16 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                onPickEmoji={(e) => { setDraft((d) => d + e); setShowEmoji(false) }}
                onPickSticker={(dataUrl, name) => {
                  pushMsg({ text: '[表情包]', msgType: 'image', fileUrl: dataUrl, fileName: name })
                  setShowEmoji(false)
                }}
              />
                </div>,
                document.body,
              )}
            </div>

            {/* Photo */}
            <button type="button" title="图片"
              onClick={() => photoInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-primary-light)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />

            {/* File */}
            <button type="button" title="文件"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-primary-light)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />

            {/* Voice */}
            {recording ? (
              <button type="button" title="停止录音" onClick={stopRecording}
                className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-100 transition-colors animate-pulse">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                {recSecs}″ 停止
              </button>
            ) : (
              <button type="button" title="语音"
                onClick={startRecording}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-primary-light)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}
          </div>

          {/* Text row */}
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="输入消息…"
              className="h-9 flex-1 rounded-[var(--radius-card)] bg-gray-100 px-3 text-sm outline-none placeholder:text-[var(--color-text-muted)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
            />
            <button type="button" onClick={sendMessage}
              className="h-9 shrink-0 rounded-[var(--radius-card)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-dark)]">
              发送
            </button>
          </div>
        </div>

      </div>

      {/* Context menu */}
      {ctxMenu && createPortal(
        <div
          style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 200 }}
          className="min-w-[128px] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {[
            {
              label: '↩ 回复', show: true, danger: false,
              action: () => { const m = findMsg(ctxMenu.msgId); if (m && !m.recalled) setReplyTarget(m); setCtxMenu(null) },
            },
            {
              label: '📅 新增日程', show: true, danger: false,
              action: () => { const m = findMsg(ctxMenu.msgId); if (m && !m.recalled) setAddEventMsg(m); setCtxMenu(null) },
            },
          ].map((item) => item.show && (
            <button key={item.label} type="button" onClick={item.action}
              className="flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-[var(--color-primary-light)]">
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-border)]" />
          {ctxMenu.isSelf && (
            <button type="button"
              onClick={() => { recallMsg(ctxMenu.msgId); setCtxMenu(null) }}
              className="flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-[var(--color-primary-light)]">
              ↺ 撤回
            </button>
          )}
          <button type="button"
            onClick={() => { deleteMsg(ctxMenu.msgId); setCtxMenu(null) }}
            className="flex w-full items-center px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50">
            🗑 删除
          </button>
        </div>,
        document.body,
      )}

      <ManageMembersModal />
      <NotesModal contactName={contact.name} />
      {/* Add event modal */}
      {addEventMsg && (
        <AddEventModal
          initialText={addEventMsg.text}
          onAdd={addCalendarEvent}
          onClose={() => setAddEventMsg(null)}
        />
      )}
    </>
  )
}
