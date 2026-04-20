export type TaskKey =
  | 'pendingClass'
  | 'pendingReply'
  | 'abnormalUser'
  | 'pendingReview'
  | 'pendingLeave'
  | 'pendingAssign'
  | 'pendingLink'
  | 'newStudent'
  | 'pendingHandout'
  | 'pendingFeedback'

export type MessageTabKey = 'yesterdayUnreplied' | 'abnormalUsers' | 'todayMessages' | 'complaints' | 'colleagues'

export type RightTabKey = 'schedule' | 'chat' | 'students' | 'mailbox' | 'overview' | 'scheduling'

export interface ContactItem {
  id: string
  name: string
  avatar: string
  color: string
  preview: string
  time: string
  unreadCount: number
  tag?: 'complaint'
  contactType?: 'student' | 'colleague'
  subtitle?: string
  studentId?: string
  studentStatus?: 'normal' | 'warning' | 'new' | 'leave' | 'completed'
  lastMessageAt?: string | null
  lastSenderType?: 'teacher' | 'student' | null
}

export interface TaskListItem {
  id: string
  name: string
  subtitle: string
  avatar: string
  color: string
  actionLabel: string
  contactId?: string
  tmLink?: string
  studentId?: string
  eventId?: string
  linkType?: 'class' | 'replay'
  feedbackId?: string
}

export interface CalEvent {
  id: string
  date: string       // yyyy-MM-dd
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  title: string
  type: 'class' | 'meeting'
  link?: string
}

export interface ChatMessage {
  id: string
  clientId?: string
  contactId: string
  sender: GroupRole
  senderName: string
  text: string
  time: string
  date?: string        // yyyy-MM-dd
  pending?: boolean
  recalled?: boolean
  replyTo?: { id: string; senderName: string; text: string }
  msgType?: 'text' | 'image' | 'file' | 'audio'
  fileUrl?: string
  fileName?: string
  fileSize?: string
  audioDuration?: number
}

export type GroupRole = '带教老师' | '学管' | '校长' | '诊断老师' | '学生'

export interface GroupMember {
  role: GroupRole
  name: string
  teacherId?: string
}

export interface ContactNote {
  id: string
  contactId: string
  authorName: string
  text: string
  createdAt: string   // ISO 字符串
}

export interface AbnormalStudent {
  id: string
  name: string
  status: 'normal' | 'warning' | 'new' | 'leave' | 'completed'
  reason: string
  severity: 'high' | 'medium' | 'low'
  updatedAt: string
}

export interface StudentItem {
  id: string
  name: string
  avatar: string
  color: string
  grade: string
  subject: string
  lastSession: string
  status: 'normal' | 'warning' | 'new' | 'leave' | 'completed'
  contactId?: string
}

export interface KpointAssignment {
  title: string
  score: number
  accuracy: number
  date: string
}

export interface KnowledgePoint {
  name: string
  progress: number
  status: 'mastered' | 'learning' | 'weak'
  assignments?: KpointAssignment[]
}

export interface StudentFeedback {
  id: string
  sessionLabel: string
  date: string
  rating: number
  tags: string[]
  comment: string
}

export type AnswerStatus = 'pending' | 'reviewed'
export type QuestionType = '入学诊断' | '卡点练习题' | '卡点考试' | '整卷批改'

export interface QuestionAnswer {
  id: string
  questionTitle: string
  questionType: QuestionType
  studentAnswer: string
  submittedAt: string
  status: AnswerStatus
  score?: number
  teacherComment?: string
  reviewedAt?: string
}

export interface TeacherNote {
  role: string
  name: string
  content: string
  date: string
}

export interface Handout {
  id: string
  fileName: string
  uploadedBy: string
  role: string
  date: string
  sessionLabel: string
}

export interface Replay {
  id: string
  sessionLabel: string
  date: string
  url: string
  duration?: string
}

export interface KpointTeacherGroup {
  kpoint: string
  color: string
  teachers: { role: string; name: string }[]
}

export interface PrivateChatSession {
  id: string              // `pm_${groupContactId}_${memberName}`
  groupContactId: string
  memberName: string
  memberRole: GroupRole
  avatarColor: string
  lastMsg?: string
  lastTime?: string
}

export interface PracticeQuestion {
  id: string
  title: string                              // 训练动作描述
  selectionType: 'default' | 'manual' | 'weak'  // 默认勾选 / 手动勾选 / 补弱勾选
  videoId?: string
  handoutPdf?: string
  analysisPdf?: string
}

export interface CheckpointContent {
  id: string
  name: string                          // 卡点名称，如"堆砌式论述"
  theoryVideoId?: string                // 理论课保利威视频 ID
  theoryHandoutPdf?: string
  examTitle?: string
  examVideoId?: string
  examHandoutPdf?: string
  examAnalysisPdf?: string
  practiceQuestions: PracticeQuestion[] // 可分配的刷题题目库
  standardPath: string[]                // 标准版路径 DAY1–DAY7
  learningObjectives: string[]          // 去重版最小颗粒（学习目标）
}

export interface StudentInfoItem {
  id: string
  studentId: string
  authorName: string
  authorRole: string
  content: string
  createdAt: string   // ISO 字符串
}

export interface StudentCourseProgress {
  id: string
  name: string
  subject: string
  progress: number
  status: 'in_progress' | 'completed' | 'failed'
}

export interface StudentTeamTeacher {
  id: string
  name: string
  role: string
  title?: string
  status?: string
}

export interface StudentDetailMeta {
  joinDate: string | null
  sessionCount: number
  totalHours: number
  courses: StudentCourseProgress[]
  teamTeachers: StudentTeamTeacher[]
  profile: {
    gender?: string | null
    grade?: string | null
    hometown?: string | null
    examStatus?: string | null
    examDate?: string | null
    education?: string | null
    major?: string | null
    avatarUrl?: string | null
  }
  flagReason?: string | null
  flagSeverity?: string | null
}

export interface ComplaintAttachment {
  id: string
  name: string
  dataUrl: string    // base64
}

export interface ComplaintRecord {
  id: string
  studentId: string
  studentName: string
  demand: string          // 学生诉求
  reason: string          // 投诉原因
  suggestion: string      // 解决建议
  resolvers: string[]     // 建议解决人（角色名）
  deadline: string        // YYYY-MM-DD
  extraNote: string       // 补充说明（可选）
  attachments: ComplaintAttachment[]
  submittedBy: string
  submittedAt: string     // ISO
  status: 'pending' | 'resolved'
  resolvedAt?: string
  resolvedNote?: string
}
