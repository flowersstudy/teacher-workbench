import { create } from 'zustand'
import type { CalEvent, ChatMessage, ComplaintRecord, ContactNote, GroupMember, MessageTabKey, PrivateChatSession, RightTabKey, StudentInfoItem, TaskKey, TaskListItem } from '../types'
import { calendarEvents as initialEvents, defaultStudentPracticeAssignments, groupMembersByContactId as initialGroupMembers } from '../mock/workbenchMock'
import type { StudentItem } from '../mock/workbenchMock'
import { api } from '../../../lib/api'

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

const STUDENT_COLORS = ['#e8845a','#6b9e78','#7b8fc4','#c4847b','#9b84c4','#84b8c4','#c4b484','#84c4a4']

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
  students: StudentItem[]
  loadStudents: () => Promise<void>

  setLeftMessageTab: (tab: MessageTabKey) => void
  setRightTab: (tab: RightTabKey) => void
  selectContact: (contactId: string) => void
  clearSelectedContact: () => void
  restoreLastChat: () => void
  openTaskModal: (taskKey: TaskKey) => void
  closeTaskModal: () => void
  addCalendarEvent: (event: CalEvent) => void
  updateCalendarEvent: (event: CalEvent) => void
  deleteCalendarEvent: (id: string) => void
  setEventLink: (eventId: string, link: string) => void
  loadCalendarEvents: () => Promise<void>
  linkUploadItem: TaskListItem | null
  openLinkUpload: (item: TaskListItem) => void
  closeLinkUpload: () => void
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
  addGroupMember: (contactId: string, member: GroupMember) => void
  removeGroupMember: (contactId: string, memberName: string) => void
  manageMembersContactId: string | null
  openManageMembers: (contactId: string) => void
  closeManageMembers: () => void
  assignStudentItem: TaskListItem | null
  openAssignStudent: (item: TaskListItem) => void
  closeAssignStudent: () => void
  studentInfoMap: Record<string, StudentInfoItem[]>
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
  // ── 学生刷题分配 studentId → checkpointId → questionId[] ──
  studentPracticeAssignments: Record<string, Record<string, string[]>>
  setStudentPracticeAssignment: (studentId: string, checkpointId: string, questionIds: string[]) => void
  // ── 学生每天自定义备注 studentId → dayNum → note ──
  studentDayNotes: Record<string, Record<number, string>>
  setStudentDayNote: (studentId: string, day: number, note: string) => void
  // ── 投诉 ──
  complaintsMap: Record<string, ComplaintRecord[]>   // studentId → records
  addComplaint: (record: Omit<ComplaintRecord, 'id' | 'submittedAt' | 'status'>) => void
  resolveComplaint: (studentId: string, complaintId: string, resolvedNote: string) => void
  // ── 私聊 ──
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
  calendarEvents: initialEvents,
  teacherName: getTeacherNameFromToken(),
  taskCounts: { pendingClass: 0, pendingReview: 0, newStudent: 0, pendingAssign: 0, pendingLink: 0, pendingHandout: 0 },
  loadTaskCounts: async () => {
    const data = await api.get<{ pendingClass: number; pendingGrade: number; newStudents: number; abnormal: number }>('/api/teacher/tasks/count')
    if (data) {
      set({
        taskCounts: {
          pendingClass:   data.pendingClass  ?? 0,
          pendingReview:  data.pendingGrade  ?? 0,
          newStudent:     data.newStudents   ?? 0,
          pendingAssign:  0,
          pendingLink:    data.pendingClass  ?? 0,
          pendingHandout: 0,
        },
      })
    }
  },
  students: [],
  loadStudents: async () => {
    const data = await api.get<Array<Record<string, unknown>>>('/api/teacher/students')
    if (Array.isArray(data)) {
      const students: StudentItem[] = data.map((r, i) => ({
        id:          String(r.id),
        name:        String(r.name),
        status:      (r.status as StudentItem['status']) ?? 'normal',
        subject:     String(r.subject ?? ''),
        grade:       String(r.grade ?? ''),
        lastSession: r.last_session_date ? String(r.last_session_date).slice(0, 10) : '暂无',
        avatar:      String(r.name).slice(0, 1),
        color:       STUDENT_COLORS[i % STUDENT_COLORS.length],
      }))
      set({ students })
    }
  },

  setLeftMessageTab: (tab) => set({ leftMessageTab: tab }),
  setRightTab: (tab) => set({ rightTab: tab }),
  selectContact: (contactId) =>
    set({ selectedContactId: contactId, lastContactId: contactId, rightTab: 'chat', selectedPmId: null }),
  clearSelectedContact: () => set({ selectedContactId: null, rightTab: 'chat' }),
  restoreLastChat: () => {
    const { lastContactId } = get()
    if (lastContactId) {
      set({ selectedContactId: lastContactId, rightTab: 'chat' })
    } else {
      set({ rightTab: 'chat' })
    }
  },
  openTaskModal: (taskKey) => set({ openTaskKey: taskKey }),
  closeTaskModal: () => set({ openTaskKey: null }),
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
  setEventLink: async (eventId, link) => {
    set((s) => ({
      calendarEvents: s.calendarEvents.map((e) => e.id === eventId ? { ...e, link } : e),
    }))
    await api.put(`/api/teacher/calendar/${eventId}/link`, { link })
  },
  loadCalendarEvents: async () => {
    const data = await api.get<Array<Record<string, unknown>>>('/api/teacher/calendar')
    if (Array.isArray(data) && data.length > 0) {
      const events: CalEvent[] = data.map((r) => ({
        id: String(r.id),
        date: r.date as string,
        startTime: r.start_time as string,
        endTime: r.end_time as string,
        title: r.title as string,
        type: r.type as CalEvent['type'],
        link: (r.link as string) ?? undefined,
      }))
      set({ calendarEvents: events })
    }
  },
  linkUploadItem: null,
  openLinkUpload: (item) => set({ linkUploadItem: item }),
  closeLinkUpload: () => set({ linkUploadItem: null }),
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
  groupMembersMap: Object.fromEntries(Object.entries(initialGroupMembers).map(([k, v]) => [k, [...v]])),
  addGroupMember: (contactId, member) => set((s) => ({
    groupMembersMap: { ...s.groupMembersMap, [contactId]: [...(s.groupMembersMap[contactId] ?? []), member] },
  })),
  removeGroupMember: (contactId, memberName) => set((s) => ({
    groupMembersMap: { ...s.groupMembersMap, [contactId]: (s.groupMembersMap[contactId] ?? []).filter((m) => m.name !== memberName) },
  })),
  manageMembersContactId: null,
  openManageMembers: (contactId) => set({ manageMembersContactId: contactId }),
  closeManageMembers: () => set({ manageMembersContactId: null }),
  assignStudentItem: null,
  openAssignStudent: (item) => set({ assignStudentItem: item }),
  closeAssignStudent: () => set({ assignStudentItem: null }),
  studentInfoMap: {},
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
    const data = await api.get<{ notes: Array<Record<string, unknown>> }>(`/api/teacher/students/${studentId}/info`)
    if (data?.notes) {
      const items: StudentInfoItem[] = data.notes.map((r) => ({
        id: String(r.id),
        studentId: String(r.student_id),
        authorName: r.author as string,
        authorRole: 'teacher',
        content: r.content as string,
        createdAt: r.created_at as string,
      }))
      set((s) => ({ studentInfoMap: { ...s.studentInfoMap, [studentId]: items } }))
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
  // ── 学生刷题分配 ──
  studentPracticeAssignments: { ...defaultStudentPracticeAssignments },
  setStudentPracticeAssignment: (studentId, checkpointId, questionIds) =>
    set((s) => ({
      studentPracticeAssignments: {
        ...s.studentPracticeAssignments,
        [studentId]: {
          ...(s.studentPracticeAssignments[studentId] ?? {}),
          [checkpointId]: questionIds,
        },
      },
    })),
  // ── 学生每天自定义备注 ──
  studentDayNotes: {},
  setStudentDayNote: (studentId, day, note) =>
    set((s) => ({
      studentDayNotes: {
        ...s.studentDayNotes,
        [studentId]: { ...(s.studentDayNotes[studentId] ?? {}), [day]: note },
      },
    })),
  // ── 投诉 ──
  complaintsMap: {},
  addComplaint: (record) => {
    const complaint: ComplaintRecord = {
      ...record,
      id: `cp_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    }
    set((s) => ({
      complaintsMap: {
        ...s.complaintsMap,
        [record.studentId]: [...(s.complaintsMap[record.studentId] ?? []), complaint],
      },
    }))
  },
  resolveComplaint: (studentId, complaintId, resolvedNote) =>
    set((s) => ({
      complaintsMap: {
        ...s.complaintsMap,
        [studentId]: (s.complaintsMap[studentId] ?? []).map((c) =>
          c.id === complaintId
            ? { ...c, status: 'resolved', resolvedAt: new Date().toISOString(), resolvedNote }
            : c,
        ),
      },
    })),
  // ── 私聊 ──
  privateSessions: [],
  privateMsgMap: {},
  selectedPmId: null,
  openPrivateChat: (session) => set((s) => {
    const exists = s.privateSessions.some((p) => p.id === session.id)
    return {
      privateSessions: exists ? s.privateSessions : [...s.privateSessions, session],
      selectedPmId: session.id,
      selectedContactId: null,
      rightTab: 'chat',
    }
  }),
  closePrivateChatNav: () => set({ selectedPmId: null }),
  sendPrivateChatMsg: (pmId, msg) => set((s) => {
    const updated = [...(s.privateMsgMap[pmId] ?? []), msg]
    const sessions = s.privateSessions.map((p) =>
      p.id === pmId ? { ...p, lastMsg: msg.text, lastTime: msg.time } : p,
    )
    return { privateMsgMap: { ...s.privateMsgMap, [pmId]: updated }, privateSessions: sessions }
  }),
}))

