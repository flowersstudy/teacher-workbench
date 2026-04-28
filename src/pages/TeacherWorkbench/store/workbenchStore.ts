import { create } from 'zustand'
import type { AbnormalStudent, CalEvent, ChatMessage, ComplaintRecord, ContactNote, GroupMember, MessageTabKey, PrivateChatSession, QuestionAnswer, RightTabKey, StudentDetailMeta, StudentInfoItem, StudentItem, TaskKey, TaskListItem } from '../types'
import { api } from '../../../lib/api'
import { addChatMember, buildChatSocketUrl, fetchChatMembers, fetchChatMessages, fetchChatRooms, mapSocketChatMessage, postChatMessage, removeChatMember } from '../api/chat'

function getTeacherNameFromToken(): string {
  try {
    const token = localStorage.getItem('teacher_token')
    if (!token) return ''
    const payload = JSON.parse(atob(token.split('.')[1])) as { name?: string }
    return payload.name ?? ''
  } catch {
    return ''
  }
}

const STUDENT_COLORS = ['#e8845a', '#d79c69', '#c48b7a', '#b58f6f', '#c8755c', '#9f7d69', '#d3a57c', '#b88d77']
const MESSAGE_ACK_TIMEOUT = 5000

let activeChatSocket: WebSocket | null = null
let activeChatRoomId: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let shouldReconnect = false
const pendingAckTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearReconnectTimer() {
  if (!reconnectTimer) return
  clearTimeout(reconnectTimer)
  reconnectTimer = null
}

function clearPendingAckTimer(clientId?: string | null) {
  if (!clientId) return
  const timer = pendingAckTimers.get(clientId)
  if (!timer) return
  clearTimeout(timer)
  pendingAckTimers.delete(clientId)
}

function mapComplaintRecord(item: Record<string, unknown>): ComplaintRecord {
  return {
    id: String(item.id),
    studentId: String(item.studentId ?? item.student_id ?? ''),
    studentName: String(item.studentName ?? item.student_name ?? ''),
    demand: String(item.demand ?? ''),
    reason: String(item.reason ?? ''),
    suggestion: String(item.suggestion ?? ''),
    resolvers: Array.isArray(item.resolvers) ? item.resolvers.map((entry) => String(entry)) : [],
    deadline: String(item.deadline ?? ''),
    extraNote: String(item.extraNote ?? item.extra_note ?? ''),
    attachments: Array.isArray(item.attachments)
      ? item.attachments.map((entry) => ({
        id: String((entry as Record<string, unknown>).id ?? ''),
        name: String((entry as Record<string, unknown>).name ?? ''),
        dataUrl: String((entry as Record<string, unknown>).dataUrl ?? ''),
      }))
      : [],
    submittedBy: String(item.submittedBy ?? item.submitted_by ?? ''),
    submittedAt: String(item.submittedAt ?? item.created_at ?? ''),
    status: item.status === 'resolved' ? 'resolved' : 'pending',
    resolvedAt: item.resolvedAt ? String(item.resolvedAt) : undefined,
    resolvedNote: item.resolvedNote ? String(item.resolvedNote) : undefined,
  }
}

function findMessageIndex(messages: ChatMessage[], target: ChatMessage): number {
  return messages.findIndex((item) =>
    item.id === target.id
    || (Boolean(item.clientId) && item.clientId === target.id)
    || (Boolean(target.clientId) && item.id === target.clientId)
    || (Boolean(item.clientId) && Boolean(target.clientId) && item.clientId === target.clientId),
  )
}

function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[], prepend: boolean): ChatMessage[] {
  const result = [...existing]
  const orderedIncoming = prepend ? [...incoming].reverse() : incoming

  orderedIncoming.forEach((item) => {
    const index = findMessageIndex(result, item)
    if (index >= 0) {
      const current = result[index]
      result[index] = {
        ...current,
        ...item,
        replyTo: item.replyTo ?? current.replyTo,
        pending: item.pending ?? current.pending,
      }
      return
    }

    if (prepend) {
      result.unshift(item)
    } else {
      result.push(item)
    }
  })

  return result
}

function findReplyTarget(messages: ChatMessage[], replyToId?: string | null): ChatMessage | null {
  if (!replyToId) return null
  return messages.find((item) => item.id === replyToId || item.clientId === replyToId) ?? null
}

function buildReplyPreview(messages: ChatMessage[], replyToId?: string | null): ChatMessage['replyTo'] {
  const replyTarget = findReplyTarget(messages, replyToId)
  return replyTarget
    ? { id: replyTarget.id, senderName: replyTarget.senderName, text: replyTarget.text }
    : undefined
}

function findPendingMessage(messages: ChatMessage[], clientId: string): ChatMessage | null {
  return messages.find((item) => item.clientId === clientId || item.id === clientId) ?? null
}

function messageTimestamp(message: ChatMessage): string | null {
  return message.date ? `${message.date}T${message.time}:00` : null
}

function updateChatContactPreview(
  contacts: import('../types').ContactItem[],
  contactId: string,
  message: ChatMessage,
  senderType: 'teacher' | 'student',
  isSelectedRoom: boolean,
): import('../types').ContactItem[] {
  return contacts.map((item) =>
    item.id === contactId
      ? {
          ...item,
          preview: message.text,
          time: message.time,
          lastSenderType: senderType,
          lastMessageAt: messageTimestamp(message) ?? item.lastMessageAt,
          unreadCount: senderType === 'student' && !isSelectedRoom ? (item.unreadCount ?? 0) + 1 : 0,
        }
      : item,
  )
}

function contactIdByStudentId(contacts: import('../types').ContactItem[]): Record<string, string> {
  return contacts.reduce<Record<string, string>>((acc, item) => {
    if (item.studentId) acc[item.studentId] = item.id
    return acc
  }, {})
}

function mapTeamRole(role: string | null | undefined): string {
  switch (role) {
    case 'coach':
      return '\u5e26\u6559\u8001\u5e08'
    case 'diagnosis':
      return '\u8bca\u65ad\u8001\u5e08'
    case 'manager':
      return '\u5b66\u7ba1'
    case 'principal':
      return '\u6821\u957f'
    default:
      return role || '\u8001\u5e08'
  }
}

function mapSubmissionReviewType(reviewType: string | null | undefined): QuestionAnswer['questionType'] {
  switch (reviewType) {
    case '\u5165\u5b66\u8bca\u65ad':
      return '\u5165\u5b66\u8bca\u65ad'
    case '\u5361\u70b9\u7ec3\u4e60\u9898':
      return '\u5361\u70b9\u7ec3\u4e60\u9898'
    case '\u5361\u70b9\u8003\u8bd5':
      return '\u5361\u70b9\u8003\u8bd5'
    case '\u6574\u5377\u6279\u6539':
      return '\u6574\u5377\u6279\u6539'
    default:
      return '\u6574\u5377\u6279\u6539'
  }
}

function buildSubmissionTitle(reviewType: unknown, checkpoint: unknown, fileName: unknown): string {
  const fileTitle = typeof fileName === 'string' ? fileName.replace(/\.[^.]+$/, '') : ''
  if (fileTitle) return fileTitle

  const parts = [reviewType, checkpoint].filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return parts.join(' · ') || '\u4f5c\u7b54\u8bb0\u5f55'
}

function normalizeCalendarDate(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoMatch) return isoMatch[1]
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const fallback = String(value ?? '').trim()
  const fallbackMatch = fallback.match(/^(\d{4}-\d{2}-\d{2})/)
  return fallbackMatch ? fallbackMatch[1] : fallback
}

interface WorkbenchState {
  leftMessageTab: MessageTabKey
  rightTab: RightTabKey
  selectedContactId: string | null
  lastContactId: string | null
  openTaskKey: TaskKey | null
  calendarEvents: CalEvent[]
  teacherName: string
  taskCounts: Record<TaskKey, number>
  loadTaskCounts: () => Promise<void>
  taskItemsMap: Record<TaskKey, TaskListItem[]>
  loadTaskItems: () => Promise<void>
  students: StudentItem[]
  loadStudents: () => Promise<void>
  abnormalStudents: AbnormalStudent[]
  loadAbnormalStudents: () => Promise<void>
  chatContacts: import('../types').ContactItem[]
  loadChatContacts: () => Promise<void>
  chatMessagesMap: Record<string, ChatMessage[]>
  loadChatMessages: (contactId: string, before?: string) => Promise<number>
  sendChatMessage: (contactId: string, text: string, replyToId?: string | null) => Promise<ChatMessage | null>
  connectChatRoom: (contactId: string) => void
  disconnectChatRoom: () => void

  setLeftMessageTab: (tab: MessageTabKey) => void
  setRightTab: (tab: RightTabKey) => void
  selectContact: (contactId: string) => void
  clearSelectedContact: () => void
  restoreLastChat: () => void
  openTaskModal: (taskKey: TaskKey) => void
  closeTaskModal: () => void
  studentFeedbackOpen: boolean
  openStudentFeedbackModal: () => void
  closeStudentFeedbackModal: () => void
  addCalendarEvent: (event: CalEvent) => void
  updateCalendarEvent: (event: CalEvent) => void
  deleteCalendarEvent: (id: string) => void
  setEventLink: (studentId: string, courseType: string, linkType: 'live' | 'replay', link: string, pointName: string) => Promise<void>
  loadCalendarEvents: () => Promise<void>
  linkUploadItem: TaskListItem | null
  openLinkUpload: (item: TaskListItem) => void
  closeLinkUpload: () => void
  uploadReplayMaterial: (eventId: string, category: string, link: string) => Promise<void>
  uploadHandoutMaterial: (taskRowId: string, file: File) => Promise<void>
  handoutUploadItem: TaskListItem | null
  openHandoutUpload: (item: TaskListItem) => void
  closeHandoutUpload: () => void
  replayUploadItem: TaskListItem | null
  openReplayUpload: (item: TaskListItem) => void
  closeReplayUpload: () => void
  targetStudentId: string | null
  openStudentProfile: (studentId: string) => void
  clearTargetStudent: () => void
  targetTeacherName: string | null
  openTeacherProfile: (name: string) => void
  clearTargetTeacher: () => void
  groupMembersMap: Record<string, GroupMember[]>
  addGroupMember: (contactId: string, member: GroupMember) => Promise<void>
  removeGroupMember: (contactId: string, member: GroupMember) => Promise<void>
  manageMembersContactId: string | null
  openManageMembers: (contactId: string) => void
  closeManageMembers: () => void
  loadGroupMembers: (contactId: string) => Promise<void>
  assignStudentItem: TaskListItem | null
  openAssignStudent: (item: TaskListItem) => void
  closeAssignStudent: () => void
  assignStudentTask: (taskId: string, payload: Record<string, unknown>) => Promise<void>
  completeAssignTask: (taskId: string) => Promise<void>
  studentInfoMap: Record<string, StudentInfoItem[]>
  studentDetailMetaMap: Record<string, StudentDetailMeta>
  studentAnswersMap: Record<string, QuestionAnswer[]>
  addStudentInfo: (studentId: string, authorName: string, authorRole: string, content: string) => Promise<void>
  deleteStudentInfo: (studentId: string, infoId: string) => Promise<void>
  loadStudentInfo: (studentId: string) => Promise<void>
  flaggedMap: Record<string, boolean>
  setStudentFlag: (studentId: string, flagged: boolean) => Promise<void>
  loadStudentFlag: (studentId: string) => Promise<void>
  notesMap: Record<string, ContactNote[]>
  notesContactId: string | null
  openNotes: (contactId: string) => void
  closeNotes: () => void
  addNote: (contactId: string, text: string, authorName: string) => Promise<void>
  deleteNote: (contactId: string, noteId: string) => Promise<void>
  loadNotes: (contactId: string) => Promise<void>
  studentPracticeAssignments: Record<string, Record<string, string[]>>
  setStudentPracticeAssignment: (studentId: string, checkpointId: string, questionIds: string[]) => void
  studentDayNotes: Record<string, Record<number, string>>
  setStudentDayNote: (studentId: string, day: number, note: string) => void
  complaintsMap: Record<string, ComplaintRecord[]>   // studentId 闂?records
  loadComplaints: () => Promise<void>
  addComplaint: (record: Omit<ComplaintRecord, 'id' | 'submittedAt' | 'status'>) => Promise<void>
  resolveComplaint: (studentId: string, complaintId: string, resolvedNote: string) => Promise<void>
  privateSessions: PrivateChatSession[]
  privateMsgMap: Record<string, ChatMessage[]>
  selectedPmId: string | null
  openPrivateChat: (session: Omit<PrivateChatSession, 'lastMsg' | 'lastTime'>) => void
  closePrivateChatNav: () => void
  sendPrivateChatMsg: (pmId: string, msg: ChatMessage) => void
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  leftMessageTab: 'todayMessages',
  rightTab: 'schedule',
  selectedContactId: null,
  lastContactId: null,
  openTaskKey: null,
  studentFeedbackOpen: false,
  calendarEvents: [],
  teacherName: getTeacherNameFromToken(),
  taskCounts: { pendingClass: 0, pendingReply: 0, abnormalUser: 0, pendingReview: 0, pendingLeave: 0, pendingAssign: 0, pendingLink: 0, liveDrill: 0, pendingHandout: 0, pendingFeedback: 0 },
  loadTaskCounts: async () => {
    const data = await api.get<{
      pendingClass?: number
      pendingGrade?: number
      pendingLeave?: number
      newStudents?: number
      abnormal?: number
      pendingReply?: number
      pendingAssign?: number
      pendingLink?: number
      pendingHandout?: number
      pendingFeedback?: number
    }>('/api/teacher/tasks/count')
    if (data) {
      set({
        taskCounts: {
          pendingClass:   data.pendingClass  ?? 0,
          pendingReply:   data.pendingReply  ?? 0,
          abnormalUser:   data.abnormal      ?? 0,
          pendingReview:  data.pendingGrade  ?? 0,
          pendingLeave:   data.pendingLeave  ?? 0,
          liveDrill:      0,
          pendingAssign:  data.pendingAssign ?? 0,
          pendingLink:    data.pendingLink   ?? 0,
          pendingHandout: data.pendingHandout ?? 0,
          pendingFeedback: data.pendingFeedback ?? 0,
        },
      })
    }
  },
  taskItemsMap: {
    pendingClass: [],
    pendingReply: [],
    abnormalUser: [],
    pendingReview: [],
    pendingLeave: [],
    pendingAssign: [],
    pendingLink: [],
    liveDrill: [],
    pendingHandout: [],
    pendingFeedback: [],
  },
  loadTaskItems: async () => {
    const data = await api.get<Partial<Record<TaskKey, TaskListItem[]>>>('/api/teacher/tasks/items')
    if (!data) return
    set({
      taskItemsMap: {
        pendingClass: Array.isArray(data.pendingClass) ? data.pendingClass : [],
        pendingReply: Array.isArray(data.pendingReply) ? data.pendingReply : [],
        abnormalUser: Array.isArray(data.abnormalUser) ? data.abnormalUser : [],
        pendingReview: Array.isArray(data.pendingReview) ? data.pendingReview : [],
        pendingLeave: Array.isArray(data.pendingLeave) ? data.pendingLeave : [],
        pendingAssign: Array.isArray(data.pendingAssign) ? data.pendingAssign : [],
        pendingLink: Array.isArray(data.pendingLink) ? data.pendingLink : [],
        liveDrill: [],
        pendingHandout: Array.isArray(data.pendingHandout) ? data.pendingHandout : [],
        pendingFeedback: Array.isArray(data.pendingFeedback) ? data.pendingFeedback : [],
      },
    })
  },
  students: [],
  loadStudents: async () => {
    const data = await api.get<Array<Record<string, unknown>>>('/api/teacher/students')
    if (Array.isArray(data)) {
      const contactMap = contactIdByStudentId(get().chatContacts)
      const students: StudentItem[] = data.map((r, i) => ({
        id:          String(r.id),
        name:        String(r.name),
        status:      (r.status as StudentItem['status']) ?? 'normal',
        subject:     String(r.subject ?? ''),
        grade:       String(r.grade ?? ''),
        lastSession: r.last_session_date ? String(r.last_session_date).slice(0, 10) : '\u6682\u65e0',
        avatar:      String(r.name).slice(0, 1),
        color:       STUDENT_COLORS[i % STUDENT_COLORS.length],
        contactId:   contactMap[String(r.id)],
      }))
      set({ students })
    }
  },
  abnormalStudents: [],
  loadAbnormalStudents: async () => {
    const data = await api.get<Array<Record<string, unknown>>>('/api/teacher/students/abnormal')
    if (!Array.isArray(data)) return

    const abnormalStudents: AbnormalStudent[] = data.map((item) => ({
      id: String(item.id),
      name: String(item.name ?? ''),
      status: ((item.status as AbnormalStudent['status']) ?? 'warning'),
      reason: String(item.reason ?? ''),
      severity: ((item.severity as AbnormalStudent['severity']) ?? 'medium'),
      updatedAt: String(item.updated_at ?? ''),
    }))

    set({ abnormalStudents })
  },
  chatContacts: [],
  loadChatContacts: async () => {
    const contacts = await fetchChatRooms()
    set((s) => ({
      chatContacts: contacts,
      taskCounts: {
        ...s.taskCounts,
        pendingReply: contacts.filter((item) =>
          item.contactType === 'student' && (item.lastSenderType === 'student' || (item.unreadCount ?? 0) > 0),
        ).length,
      },
      students: s.students.map((student) => ({
        ...student,
        contactId: contacts.find((item) => item.studentId === student.id)?.id ?? student.contactId,
      })),
      selectedContactId: s.selectedContactId && contacts.some((item) => item.id === s.selectedContactId) ? s.selectedContactId : null,
      lastContactId: s.lastContactId && contacts.some((item) => item.id === s.lastContactId) ? s.lastContactId : null,
    }))
  },
  chatMessagesMap: {},
  loadChatMessages: async (contactId, before) => {
    const messages = await fetchChatMessages(contactId, before)
    set((s) => ({
      chatMessagesMap: {
        ...s.chatMessagesMap,
        [contactId]: before
          ? mergeMessages(s.chatMessagesMap[contactId] ?? [], messages, true)
          : mergeMessages(
              messages,
              (s.chatMessagesMap[contactId] ?? []).filter((item) => item.pending),
              false,
            ),
      },
    }))
    return messages.length
  },
  sendChatMessage: async (contactId, text, replyToId) => {
    if (
      activeChatRoomId === contactId
      && activeChatSocket
      && activeChatSocket.readyState === WebSocket.OPEN
    ) {
      const currentMessages = get().chatMessagesMap[contactId] ?? []
      const replyPreview = buildReplyPreview(currentMessages, replyToId)
      const now = new Date()
      const clientId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const optimisticMessage: ChatMessage = {
        id: clientId,
        clientId,
        contactId,
        sender: '\u5e26\u6559\u8001\u5e08',
        senderName: get().teacherName || '\u8001\u5e08',
        text,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        pending: true,
        msgType: 'text',
        replyTo: replyPreview,
      }

      set((s) => ({
        chatMessagesMap: {
          ...s.chatMessagesMap,
          [contactId]: mergeMessages(s.chatMessagesMap[contactId] ?? [], [optimisticMessage], false),
        },
        chatContacts: updateChatContactPreview(s.chatContacts, contactId, optimisticMessage, 'teacher', true),
      }))

      try {
        activeChatSocket.send(JSON.stringify({
          type: 'chat_message',
          roomId: contactId,
          clientId,
          content: text,
          messageType: 'text',
          replyToId: replyToId ?? null,
        }))

        pendingAckTimers.set(clientId, setTimeout(() => {
          pendingAckTimers.delete(clientId)
          void (async () => {
            const current = findPendingMessage(get().chatMessagesMap[contactId] ?? [], clientId)
            if (!current?.pending) {
              return
            }

            const fallbackMessage = await postChatMessage(contactId, text, replyToId)
            if (!fallbackMessage) {
              return
            }

            const latestReplyTarget = findReplyTarget(get().chatMessagesMap[contactId] ?? [], replyToId)
            const nextMessage = latestReplyTarget
              ? {
                  ...fallbackMessage,
                  clientId,
                  pending: false,
                  replyTo: {
                    id: latestReplyTarget.id,
                    senderName: latestReplyTarget.senderName,
                    text: latestReplyTarget.text,
                  },
                }
              : {
                  ...fallbackMessage,
                  clientId,
                  pending: false,
                }

            set((s) => ({
              chatMessagesMap: {
                ...s.chatMessagesMap,
                [contactId]: mergeMessages(s.chatMessagesMap[contactId] ?? [], [nextMessage], false),
              },
              chatContacts: updateChatContactPreview(s.chatContacts, contactId, nextMessage, 'teacher', true),
            }))
          })().catch(() => {
            set((s) => ({
              chatMessagesMap: {
                ...s.chatMessagesMap,
                [contactId]: (s.chatMessagesMap[contactId] ?? []).map((item) =>
                  item.clientId === clientId || item.id === clientId
                    ? { ...item, pending: false }
                    : item,
                ),
              },
            }))
          })
        }, MESSAGE_ACK_TIMEOUT))
        return optimisticMessage
      } catch {
        clearPendingAckTimer(clientId)
        set((s) => ({
          chatMessagesMap: {
            ...s.chatMessagesMap,
            [contactId]: (s.chatMessagesMap[contactId] ?? []).filter((item) => item.id !== clientId),
          },
        }))
      }
    }

    const message = await postChatMessage(contactId, text, replyToId)
    if (!message) return null

    const replyTarget = findReplyTarget(get().chatMessagesMap[contactId] ?? [], replyToId)

    const nextMessage = replyTarget
      ? { ...message, replyTo: { id: replyTarget.id, senderName: replyTarget.senderName, text: replyTarget.text } }
      : message

    set((s) => ({
      chatMessagesMap: {
        ...s.chatMessagesMap,
        [contactId]: mergeMessages(s.chatMessagesMap[contactId] ?? [], [nextMessage], false),
      },
      chatContacts: updateChatContactPreview(s.chatContacts, contactId, nextMessage, 'teacher', true),
    }))

    return nextMessage
  },
  connectChatRoom: (contactId) => {
    const socketIsReusable = (
      activeChatRoomId === contactId
      && activeChatSocket
      && (activeChatSocket.readyState === WebSocket.OPEN || activeChatSocket.readyState === WebSocket.CONNECTING)
    )
    if (socketIsReusable) return

    shouldReconnect = false
    clearReconnectTimer()

    if (activeChatSocket) {
      activeChatSocket.close()
      activeChatSocket = null
    }

    activeChatRoomId = contactId
    shouldReconnect = true

    const socket = new WebSocket(buildChatSocketUrl(contactId))
    activeChatSocket = socket

    socket.onopen = () => {
      reconnectAttempts = 0
    }

    socket.onmessage = (event) => {
      let payload: Record<string, unknown>

      try {
        payload = JSON.parse(String(event.data)) as Record<string, unknown>
      } catch {
        return
      }

      if (payload.type === 'connected' || payload.type === 'pong') {
        reconnectAttempts = 0
        return
      }

      if (payload.type !== 'ack' && payload.type !== 'chat_message') {
        return
      }

      const rawMessage = payload.message
      if (!rawMessage || typeof rawMessage !== 'object') {
        return
      }

      if (payload.type === 'ack' && typeof payload.clientId === 'string') {
        clearPendingAckTimer(payload.clientId)
      }

      const currentMessages = get().chatMessagesMap[contactId] ?? []
      const mapped = mapSocketChatMessage(
        contactId,
        rawMessage as Parameters<typeof mapSocketChatMessage>[1],
        typeof payload.clientId === 'string' && payload.clientId ? payload.clientId : undefined,
      )
      const nextMessage: ChatMessage = {
        ...mapped.message,
        pending: false,
        replyTo: buildReplyPreview(currentMessages, mapped.replyToId),
      }
      const senderType = nextMessage.sender === '\u5e26\u6559\u8001\u5e08' ? 'teacher' : 'student'

      set((s) => ({
        chatMessagesMap: {
          ...s.chatMessagesMap,
          [contactId]: mergeMessages(s.chatMessagesMap[contactId] ?? [], [nextMessage], false),
        },
        chatContacts: updateChatContactPreview(
          s.chatContacts,
          contactId,
          nextMessage,
          senderType,
          s.selectedContactId === contactId,
        ),
      }))
    }

    socket.onclose = () => {
      if (activeChatSocket === socket) {
        activeChatSocket = null
      }

      if (!shouldReconnect || activeChatRoomId !== contactId) {
        return
      }

      clearReconnectTimer()
      const delay = Math.min(5000, 500 * (2 ** reconnectAttempts))
      reconnectAttempts += 1
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        if (shouldReconnect && activeChatRoomId === contactId) {
          get().connectChatRoom(contactId)
        }
      }, delay)
    }
  },
  disconnectChatRoom: () => {
    shouldReconnect = false
    activeChatRoomId = null
    reconnectAttempts = 0
    clearReconnectTimer()
    pendingAckTimers.forEach((timer) => clearTimeout(timer))
    pendingAckTimers.clear()

    if (activeChatSocket) {
      const socket = activeChatSocket
      activeChatSocket = null
      socket.close()
    }
  },

  setLeftMessageTab: (tab) => set({ leftMessageTab: tab }),
  setRightTab: (tab) => set({ rightTab: tab }),
  selectContact: (contactId) =>
    set((s) => ({
      selectedContactId: contactId,
      lastContactId: contactId,
      rightTab: 'chat',
      chatContacts: s.chatContacts.map((item) =>
        item.id === contactId ? { ...item, unreadCount: 0 } : item,
      ),
    })),
  clearSelectedContact: () => set({ selectedContactId: null, rightTab: 'chat' }),
  restoreLastChat: () => {
    const { lastContactId } = get()
    if (lastContactId) {
      set({ selectedContactId: lastContactId, rightTab: 'chat' })
    } else {
      set({ rightTab: 'chat' })
    }
  },
  openTaskModal: (taskKey) => set(
    taskKey === 'pendingFeedback'
      ? { openTaskKey: null, studentFeedbackOpen: true }
      : { openTaskKey: taskKey, studentFeedbackOpen: false },
  ),
  closeTaskModal: () => set({ openTaskKey: null }),
  openStudentFeedbackModal: () => set({ studentFeedbackOpen: true, openTaskKey: null }),
  closeStudentFeedbackModal: () => set({ studentFeedbackOpen: false }),
  addCalendarEvent: async (event) => {
    set((s) => ({ calendarEvents: [...s.calendarEvents, event] }))
    try {
      const data = await api.post<{ id: number }>('/api/teacher/calendar', {
        title: event.title, date: event.date,
        start_time: event.startTime, end_time: event.endTime, type: event.type,
      })
      if (data?.id) {
        set((s) => ({
          calendarEvents: s.calendarEvents.map((e) => e.id === event.id ? { ...e, id: String(data.id) } : e),
        }))
      }
    } catch {
      set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== event.id) }))
    }
  },
  updateCalendarEvent: (event) => {
    set((s) => ({ calendarEvents: s.calendarEvents.map((e) => e.id === event.id ? event : e) }))
    void api.put(`/api/teacher/calendar/${event.id}`, {
      title: event.title, date: event.date,
      start_time: event.startTime, end_time: event.endTime, type: event.type,
    })
  },
  deleteCalendarEvent: (id) => {
    set((s) => ({ calendarEvents: s.calendarEvents.filter((e) => e.id !== id) }))
    void api.delete(`/api/teacher/calendar/${id}`)
  },
  setEventLink: async (studentId, courseType, linkType, link, pointName) => {
    await api.post('/api/teacher/live-link', { studentId, courseType, linkType, link, pointName })
    await get().loadTaskCounts()
    await get().loadTaskItems()
    await get().loadStudentInfo(studentId)
  },
  loadCalendarEvents: async () => {
    const data = await api.get<Array<Record<string, unknown>>>('/api/teacher/calendar')
    if (!Array.isArray(data)) return
    const events: CalEvent[] = data.map((r) => ({
      id: String(r.id),
      date: normalizeCalendarDate(r.date),
      startTime: r.start_time as string,
      endTime: r.end_time as string,
      title: r.title as string,
      type: r.type as CalEvent['type'],
      link: (r.link as string) ?? undefined,
    }))
    set({ calendarEvents: events })
  },
  linkUploadItem: null,
  openLinkUpload: (item) => set({ linkUploadItem: item }),
  closeLinkUpload: () => set({ linkUploadItem: null }),
  uploadReplayMaterial: async (eventId, category, link) => {
    await api.post('/api/teacher/materials/replay', { eventId, category, link })
    await get().loadTaskCounts()
    await get().loadTaskItems()
  },
  uploadHandoutMaterial: async (taskRowId, file) => {
    const form = new FormData()
    form.append('taskRowId', taskRowId)
    form.append('file', file)
    await api.postForm('/api/teacher/materials/handout', form)
    await get().loadTaskCounts()
    await get().loadTaskItems()
  },
  handoutUploadItem: null,
  openHandoutUpload: (item) => set({ handoutUploadItem: item }),
  closeHandoutUpload: () => set({ handoutUploadItem: null }),
  replayUploadItem: null,
  openReplayUpload: (item) => set({ replayUploadItem: item }),
  closeReplayUpload: () => set({ replayUploadItem: null }),
  targetStudentId: null,
  openStudentProfile: (studentId) => set({ targetStudentId: studentId, rightTab: 'students' }),
  clearTargetStudent: () => set({ targetStudentId: null }),
  targetTeacherName: null,
  openTeacherProfile: (name) => set({ targetTeacherName: name, rightTab: 'students' }),
  clearTargetTeacher: () => set({ targetTeacherName: null }),
  groupMembersMap: {},
  addGroupMember: async (contactId, member) => {
    const savedMember = await addChatMember(contactId, member)
    set((s) => ({
      groupMembersMap: {
        ...s.groupMembersMap,
        [contactId]: [...(s.groupMembersMap[contactId] ?? []), savedMember],
      },
    }))
  },
  removeGroupMember: async (contactId, member) => {
    if (!member.teacherId) return
    await removeChatMember(contactId, member.teacherId)
    set((s) => ({
      groupMembersMap: {
        ...s.groupMembersMap,
        [contactId]: (s.groupMembersMap[contactId] ?? []).filter((item) =>
          member.teacherId
            ? item.teacherId !== member.teacherId
            : !(item.name === member.name && item.role === member.role),
        ),
      },
    }))
  },
  manageMembersContactId: null,
  openManageMembers: (contactId) => set({ manageMembersContactId: contactId }),
  closeManageMembers: () => set({ manageMembersContactId: null }),
  loadGroupMembers: async (contactId) => {
    const members = await fetchChatMembers(contactId)
    set((s) => ({
      groupMembersMap: {
        ...s.groupMembersMap,
        [contactId]: members,
      },
    }))
  },
  assignStudentItem: null,
  openAssignStudent: (item) => set({ assignStudentItem: item }),
  closeAssignStudent: () => set({ assignStudentItem: null }),
  assignStudentTask: async (taskId, payload) => {
    const currentItem = get().assignStudentItem
    await api.post(`/api/teacher/practice-assignment-tasks/${taskId}/assign`, payload)
    await get().loadTaskCounts()
    await get().loadTaskItems()
    await get().loadStudents()
    await get().loadChatContacts()
    if (currentItem?.studentId) {
      await get().loadStudentInfo(currentItem.studentId)
    }
  },
  completeAssignTask: async (taskId) => {
    await api.post(`/api/teacher/practice-assignment-tasks/${taskId}/complete`, {})
    await get().loadTaskCounts()
    await get().loadTaskItems()
  },
  studentInfoMap: {},
  studentDetailMetaMap: {},
  studentAnswersMap: {},
  addStudentInfo: async (studentId, authorName, authorRole, content) => {
    const item: StudentInfoItem = {
      id: `si_${Date.now()}`,
      studentId,
      authorName,
      authorRole,
      content,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({
      studentInfoMap: {
        ...s.studentInfoMap,
        [studentId]: [...(s.studentInfoMap[studentId] ?? []), item],
      },
    }))
    await api.post(`/api/teacher/students/${studentId}/notes`, { content })
  },
  deleteStudentInfo: async (studentId, infoId) => {
    set((s) => ({
      studentInfoMap: {
        ...s.studentInfoMap,
        [studentId]: (s.studentInfoMap[studentId] ?? []).filter((i) => i.id !== infoId),
      },
    }))
    await api.delete(`/api/teacher/notes/${infoId}`)
  },
  loadStudentInfo: async (studentId) => {
    const data = await api.get<{
      student?: Record<string, unknown> | null
      notes?: Array<Record<string, unknown>>
      flagged?: boolean
      flagReason?: string | null
      flagSeverity?: string | null
      courses?: Array<Record<string, unknown>>
      checkpoints?: Array<{ name: string; hasData: boolean }>
      sessionCount?: number
      totalHours?: number
      teamTeachers?: Array<Record<string, unknown>>
      submissions?: Array<Record<string, unknown>>
    }>(`/api/teacher/students/${studentId}/info`)
    if (data) {
      const items: StudentInfoItem[] = (data.notes ?? []).map((r) => ({
        id: String(r.id),
        studentId: String(r.student_id),
        authorName: r.author as string,
        authorRole: 'teacher',
        content: r.content as string,
        createdAt: r.created_at as string,
      }))
      const student = data.student ?? null
      const answers: QuestionAnswer[] = (data.submissions ?? []).map((submission) => ({
        id: String(submission.id),
        questionTitle: buildSubmissionTitle(submission.review_type, submission.checkpoint, submission.file_name),
        questionType: mapSubmissionReviewType(typeof submission.review_type === 'string' ? submission.review_type : null),
        studentAnswer: submission.file_name ? '\u5df2\u63d0\u4ea4\u6587\u4ef6\uff1a' : '\u5df2\u63d0\u4ea4\u4f5c\u7b54',
        submittedAt: String(submission.created_at ?? new Date().toISOString()),
        status: submission.graded ? 'reviewed' : 'pending',
        score: submission.score === null || submission.score === undefined ? undefined : Number(submission.score),
        teacherComment: submission.feedback ? String(submission.feedback) : undefined,
        reviewedAt: submission.graded_at ? String(submission.graded_at) : undefined,
      }))
      const detailMeta: StudentDetailMeta = {
        joinDate: student?.created_at ? String(student.created_at).slice(0, 10) : null,
        sessionCount: Number(data.sessionCount ?? 0),
        totalHours: Number(data.totalHours ?? 0),
        courses: (data.courses ?? []).map((course) => ({
          id: String(course.id),
          name: String(course.name ?? ''),
          subject: String(course.subject ?? ''),
          progress: Number(course.progress ?? 0),
          status: ((course.status as 'in_progress' | 'completed' | 'failed') ?? 'in_progress'),
        })),
        checkpoints: (data.checkpoints ?? []).map((c) => ({ name: c.name, hasData: c.hasData })),
        teamTeachers: (data.teamTeachers ?? []).map((item) => ({
          id: String(item.id),
          name: String(item.name ?? ''),
          role: mapTeamRole(typeof item.role === 'string' ? item.role : null),
          title: item.title ? String(item.title) : undefined,
          status: item.status ? String(item.status) : undefined,
        })),
        profile: {
          gender: student?.gender ? String(student.gender) : null,
          grade: student?.profile_grade ? String(student.profile_grade) : null,
          hometown: student?.hometown ? String(student.hometown) : null,
          examStatus: student?.exam_status ? String(student.exam_status) : null,
          examDate: student?.exam_date ? String(student.exam_date).slice(0, 10) : null,
          education: student?.education ? String(student.education) : null,
          major: student?.major ? String(student.major) : null,
          avatarUrl: student?.avatar_url ? String(student.avatar_url) : null,
        },
        flagReason: data.flagReason ?? null,
        flagSeverity: data.flagSeverity ?? null,
      }
      set((s) => ({
        studentInfoMap: { ...s.studentInfoMap, [studentId]: items },
        studentDetailMetaMap: { ...s.studentDetailMetaMap, [studentId]: detailMeta },
        studentAnswersMap: { ...s.studentAnswersMap, [studentId]: answers },
        flaggedMap: { ...s.flaggedMap, [studentId]: data.flagged ?? false },
      }))
    }
  },
  flaggedMap: {},
  setStudentFlag: async (studentId, flagged) => {
    set((s) => ({ flaggedMap: { ...s.flaggedMap, [studentId]: flagged } }))
    await api.put(`/api/teacher/students/${studentId}/flag`, { flagged })
  },
  loadStudentFlag: async (studentId) => {
    const data = await api.get<{ flagged: boolean }>(`/api/teacher/students/${studentId}/info`)
    set((s) => ({ flaggedMap: { ...s.flaggedMap, [studentId]: data?.flagged ?? false } }))
  },
  notesMap: {},
  notesContactId: null,
  openNotes: (contactId) => set({ notesContactId: contactId }),
  closeNotes: () => set({ notesContactId: null }),
  addNote: async (contactId, text, authorName) => {
    const note: ContactNote = {
      id: `note_${Date.now()}`,
      contactId,
      authorName,
      text,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({
      notesMap: { ...s.notesMap, [contactId]: [...(s.notesMap[contactId] ?? []), note] },
    }))
    await api.post(`/api/teacher/contacts/${contactId}/notes`, { text })
  },
  deleteNote: async (contactId, noteId) => {
    set((s) => ({
      notesMap: {
        ...s.notesMap,
        [contactId]: (s.notesMap[contactId] ?? []).filter((n) => n.id !== noteId),
      },
    }))
    await api.delete(`/api/teacher/contact-notes/${noteId}`)
  },
  loadNotes: async (contactId) => {
    const data = await api.get<Array<Record<string, unknown>>>(`/api/teacher/contacts/${contactId}/notes`)
    if (Array.isArray(data)) {
      const notes: ContactNote[] = data.map((r) => ({
        id: String(r.id),
        contactId: String(r.contact_id),
        authorName: r.author_name as string,
        text: r.text as string,
        createdAt: r.created_at as string,
      }))
      set((s) => ({ notesMap: { ...s.notesMap, [contactId]: notes } }))
    }
  },
  studentPracticeAssignments: {},
  setStudentPracticeAssignment: (studentId, checkpointId, questionIds) => {
    set((s) => ({
      studentPracticeAssignments: {
        ...s.studentPracticeAssignments,
        [studentId]: {
          ...(s.studentPracticeAssignments[studentId] ?? {}),
          [checkpointId]: questionIds,
        },
      },
    }))
  },
  studentDayNotes: {},
  setStudentDayNote: (studentId, day, note) => {
    set((s) => ({
      studentDayNotes: {
        ...s.studentDayNotes,
        [studentId]: {
          ...(s.studentDayNotes[studentId] ?? {}),
          [day]: note,
        },
      },
    }))
  },
  complaintsMap: {},
  loadComplaints: async () => {
    const data = await api.get<Array<Record<string, unknown>>>('/api/teacher/complaints')
    if (!Array.isArray(data)) return

    const complaintsMap = data
      .map(mapComplaintRecord)
      .reduce<Record<string, ComplaintRecord[]>>((acc, complaint) => {
        acc[complaint.studentId] = [...(acc[complaint.studentId] ?? []), complaint]
        return acc
      }, {})

    set({ complaintsMap })
  },
  addComplaint: async (record) => {
    const data = await api.post<Record<string, unknown>>('/api/teacher/complaints', record)
    const complaint = mapComplaintRecord(data)
    set((s) => ({
      complaintsMap: {
        ...s.complaintsMap,
        [record.studentId]: [complaint, ...(s.complaintsMap[record.studentId] ?? [])],
      },
    }))
  },
  resolveComplaint: async (studentId, complaintId, resolvedNote) => {
    const data = await api.put<Record<string, unknown>>(`/api/teacher/complaints/${complaintId}/resolve`, { resolvedNote })
    const complaint = mapComplaintRecord(data)
    set((s) => ({
      complaintsMap: {
        ...s.complaintsMap,
        [studentId]: (s.complaintsMap[studentId] ?? []).map((item) => item.id === complaintId ? complaint : item),
      },
    }))
  },
  privateSessions: [],
  privateMsgMap: {},
  selectedPmId: null,
  openPrivateChat: (session) => set((s) => ({
    privateSessions: s.privateSessions.some((item) => item.id === session.id)
      ? s.privateSessions.map((item) => item.id === session.id ? { ...item } : item)
      : [{ ...session }, ...s.privateSessions],
    selectedPmId: session.id,
  })),
  closePrivateChatNav: () => set({ selectedPmId: null }),
  sendPrivateChatMsg: (pmId, msg) => set((s) => {
    const currentMessages = s.privateMsgMap[pmId] ?? []
    const nextMessages = [...currentMessages, msg]
    const nextSessions = s.privateSessions.map((item) =>
      item.id === pmId
        ? { ...item, lastMsg: msg.text, lastTime: msg.time }
        : item,
    )

    return {
      privateMsgMap: {
        ...s.privateMsgMap,
        [pmId]: nextMessages,
      },
      privateSessions: nextSessions,
      selectedPmId: pmId,
    }
  }),
}))
