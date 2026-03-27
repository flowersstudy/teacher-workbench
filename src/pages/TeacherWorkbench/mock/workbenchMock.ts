import type { ContactItem, MessageTabKey, TaskKey, TaskListItem } from '../types'
import type { CalEvent } from '../types'
import type { ChatMessage } from '../types'

export const teacher = {
  name: '李老师',
  traineeCountToday: 12,
}

export const taskMeta: Record<
  TaskKey,
  { label: string; badgeTone?: 'alert' }
> = {
  pendingClass: { label: '待上课' },
  pendingReply: { label: '待回复' },
  abnormalUser: { label: '异常用户', badgeTone: 'alert' },
  pendingReview: { label: '待批改' },
  pendingAssign: { label: '待分配学员' },
  pendingLink: { label: '待上传链接' },
}

export const taskCounts: Record<TaskKey, number> = {
  pendingClass: 3,
  pendingReply: 5,
  abnormalUser: 1,
  pendingReview: 8,
  pendingAssign: 2,
  pendingLink: 4,
}

const avatarPool = [
  { avatar: '王', color: '#E8845A' },
  { avatar: '张', color: '#F0CDBB' },
  { avatar: '陈', color: '#E6F1FB' },
  { avatar: '赵', color: '#D94F35' },
]

function item(
  id: string,
  name: string,
  subtitle: string,
  actionLabel: string,
  avatarIdx = 0,
  contactId?: string,
): TaskListItem {
  return {
    id,
    name,
    subtitle,
    actionLabel,
    avatar: avatarPool[avatarIdx].avatar,
    color: avatarPool[avatarIdx].color,
    contactId,
  }
}

export const taskItemsByKey: Record<TaskKey, TaskListItem[]> = {
  pendingClass: [
    item('pc1', '王同学', '英语 · 10:00', '进入课堂', 0, 'c1'),
    item('pc2', '张同学', '数学 · 14:00', '进入课堂', 1, 'c2'),
  ],
  pendingReply: [
    item('pr1', '陈同学', '等待 2 小时', '立即回复', 2, 'c3'),
    item('pr2', '王同学', '等待 35 分钟', '立即回复', 0, 'c1'),
  ],
  abnormalUser: [item('ab1', '赵同学', '连续 3 次缺课', '联系跟进', 3, 'c4')],
  pendingReview: [
    item('rv1', '张同学', '作文 · 08:30 提交', '去批改', 1, 'c2'),
    item('rv2', '王同学', '练习题 · 09:10 提交', '去批改', 0, 'c1'),
  ],
  pendingAssign: [item('as1', '新学员 A', '年级：初二', '接受分配', 2)],
  pendingLink: [item('lk1', '课次 2026-03-27', '课后链接未上传', '上传链接', 0)],
}

const baseContacts: ContactItem[] = [
  {
    id: 'c1',
    name: '王同学',
    avatar: '王',
    color: '#E8845A',
    preview: '老师我这道题还是不太懂…',
    time: '09:12',
    unreadCount: 2,
  },
  {
    id: 'c2',
    name: '张同学',
    avatar: '张',
    color: '#F0CDBB',
    preview: '已提交作业，麻烦老师批改~',
    time: '08:40',
    unreadCount: 0,
  },
  {
    id: 'c3',
    name: '陈同学',
    avatar: '陈',
    color: '#E6F1FB',
    preview: '今天上课链接在哪里呀？',
    time: '昨天',
    unreadCount: 1,
  },
]

export const contactsByTab: Record<MessageTabKey, ContactItem[]> = {
  yesterdayUnreplied: [baseContacts[2], baseContacts[0]],
  todayMessages: baseContacts,
  complaints: [
    {
      id: 'c4',
      name: '赵同学',
      avatar: '赵',
      color: '#D94F35',
      preview: '我想投诉一下课程安排…',
      time: '10:05',
      unreadCount: 1,
      tag: 'complaint',
    },
  ],
}

export const calendarEvents: CalEvent[] = [
  { id: 'e1', date: '2026-03-27', title: '英语课 · 王同学', type: 'class' },
  { id: 'e2', date: '2026-03-27', title: '教研会议', type: 'meeting' },
  { id: 'e3', date: '2026-03-28', title: '数学课 · 张同学', type: 'class' },
  { id: 'e4', date: '2026-03-30', title: '一对一复盘', type: 'meeting' },
]

export const inspirePhrases: string[] = [
  '每一次耐心讲解，都在点亮一个孩子的世界。',
  '教育是慢的艺术，但每一步都算数。',
  '你今天的坚持，会成为学生明天的底气。',
  '把复杂讲简单，是老师的超能力。',
  '你在认真带教，学生也在认真成长。',
  '别忘了给自己一点肯定：你做得很好。',
]

export const contactSubtitleById: Record<string, string> = {
  c1: '英语 · 提升班',
  c2: '数学 · 基础巩固',
  c3: '英语 · 作业答疑',
  c4: '课程反馈',
}

export const messagesByContactId: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: 'm1',
      contactId: 'c1',
      sender: 'student',
      text: '老师我这道题还是不太懂…',
      time: '09:10',
    },
    {
      id: 'm2',
      contactId: 'c1',
      sender: 'teacher',
      text: '我看到了，我们先从题干条件开始梳理。',
      time: '09:11',
    },
  ],
  c2: [
    {
      id: 'm3',
      contactId: 'c2',
      sender: 'student',
      text: '已提交作业，麻烦老师批改~',
      time: '08:40',
    },
    {
      id: 'm4',
      contactId: 'c2',
      sender: 'teacher',
      text: '收到，我今天中午前给你反馈。',
      time: '08:42',
    },
  ],
  c3: [
    {
      id: 'm5',
      contactId: 'c3',
      sender: 'student',
      text: '今天上课链接在哪里呀？',
      time: '昨天 20:15',
    },
  ],
  c4: [
    {
      id: 'm6',
      contactId: 'c4',
      sender: 'student',
      text: '我想投诉一下课程安排…',
      time: '10:05',
    },
  ],
}

