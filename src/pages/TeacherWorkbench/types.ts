export type TaskKey =
  | 'pendingClass'
  | 'pendingReply'
  | 'abnormalUser'
  | 'pendingReview'
  | 'pendingAssign'
  | 'pendingLink'

export type MessageTabKey = 'yesterdayUnreplied' | 'todayMessages' | 'complaints'

export type RightTabKey = 'schedule' | 'chat'

export interface ContactItem {
  id: string
  name: string
  avatar: string
  color: string
  preview: string
  time: string
  unreadCount: number
  tag?: 'complaint'
}

export interface TaskListItem {
  id: string
  name: string
  subtitle: string
  avatar: string
  color: string
  actionLabel: string
  contactId?: string
}

export interface CalEvent {
  id: string
  date: string // yyyy-MM-dd
  title: string
  type: 'class' | 'meeting'
}

export interface ChatMessage {
  id: string
  contactId: string
  sender: 'student' | 'teacher'
  text: string
  time: string
}

