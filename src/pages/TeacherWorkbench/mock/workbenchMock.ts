import type { CheckpointContent, ContactItem, MessageTabKey, TaskKey, TaskListItem } from '../types'
import type { CalEvent } from '../types'
import type { ChatMessage } from '../types'
import type { GroupMember } from '../types'

export const teacher = {
  name: '李老师',
  traineeCountToday: 9,
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
  newStudent: { label: '新增学生' },
  pendingHandout: { label: '待上传讲义' },
}

export const taskCounts: Record<TaskKey, number> = {
  pendingClass: 9,
  pendingReply: 5,
  abnormalUser: 3,
  pendingReview: 8,
  pendingAssign: 2,
  pendingLink: 4,
  newStudent: 3,
  pendingHandout: 2,
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
    { ...item('pc1', '王同学', '游走式找点 · 09:00–10:30', '查看主页', 0, 'c1'), studentId: 's1' },
    { ...item('pc2', '张同学', '提炼转述错误 · 10:00–11:30', '查看主页', 1, 'c2'), studentId: 's2' },
    { ...item('pc3', '陈同学', '对策推导错误 · 11:00–12:30', '查看主页', 2, 'c3'), studentId: 's3' },
    { id: 'pc4', name: '刘同学', subtitle: '分析结构错误 · 13:00–14:30', actionLabel: '查看主页', avatar: '刘', color: '#b5d5f5', studentId: 's4' },
    { id: 'pc5', name: '赵同学', subtitle: '公文结构错误 · 09:00–10:30', actionLabel: '查看主页', avatar: '赵', color: '#D94F35', contactId: 'c4', studentId: 's5' },
    { id: 'pc6', name: '孙同学', subtitle: '作文立意错误 · 10:00–11:30', actionLabel: '查看主页', avatar: '孙', color: '#c8e6c9', studentId: 's6' },
    { id: 'pc7', name: '吴同学', subtitle: '作文逻辑不清晰 · 14:00–15:30', actionLabel: '查看主页', avatar: '吴', color: '#ffe0b2', studentId: 's7' },
    { id: 'pc8', name: '郑同学', subtitle: '作文表达不流畅 · 15:00–16:30', actionLabel: '查看主页', avatar: '郑', color: '#e1bee7', studentId: 's8' },
    { id: 'pc9', name: '周同学', subtitle: '游走式找点 · 16:00–17:30', actionLabel: '查看主页', avatar: '周', color: '#f8bbd0', studentId: 's9' },
  ],
  pendingReply: [
    item('pr1', '陈同学', '等待 2 小时', '立即回复', 2, 'c3'),
    item('pr2', '王同学', '等待 35 分钟', '立即回复', 0, 'c1'),
  ],
  abnormalUser: [],  // handled by AbnormalModal
  pendingReview: [
    item('rv1', '张同学', '入学诊断 · 08:30 提交', '去批改', 1, 'c2'),
    item('rv2', '王同学', '卡点练习题 · 09:10 提交', '去批改', 0, 'c1'),
    { id: 'rv3', name: '陈同学', subtitle: '卡点考试 · 07:45 提交', actionLabel: '去批改', avatar: '陈', color: '#E6F1FB', contactId: 'c3' },
    { id: 'rv4', name: '赵同学', subtitle: '整卷批改 · 昨天 22:00 提交', actionLabel: '去批改', avatar: '赵', color: '#D94F35', contactId: 'c4' },
    { id: 'rv5', name: '孙同学', subtitle: '卡点练习题 · 09:50 提交', actionLabel: '去批改', avatar: '孙', color: '#c8e6c9' },
    { id: 'rv6', name: '吴同学', subtitle: '卡点考试 · 08:00 提交', actionLabel: '去批改', avatar: '吴', color: '#ffe0b2' },
    { id: 'rv7', name: '郑同学', subtitle: '入学诊断 · 10:20 提交', actionLabel: '去批改', avatar: '郑', color: '#e1bee7' },
    { id: 'rv8', name: '周同学', subtitle: '整卷批改 · 07:00 提交', actionLabel: '去批改', avatar: '周', color: '#f8bbd0' },
  ],
  pendingAssign: [
    { ...item('as1', '郑同学', '作文表达不流畅 · 待分配练习题', '去分配', 3), studentId: 's8' },
    { ...item('as2', '刘同学', '分析结构错误 · 待分配练习题', '去分配', 0), studentId: 's4' },
  ],
  pendingLink: [
    { ...item('lk1', '赵同学 · 03-30 09:00', '上课链接待上传', '上传链接', 3, 'c4'), eventId: 'e1', linkType: 'class' as const },
    { ...item('lk2', '张同学 · 03-31 10:00', '上课链接待上传', '上传链接', 1, 'c2'), eventId: 'e3', linkType: 'class' as const },
    { ...item('rp1', '赵同学 · 03-29 09:00', '课程回放待上传', '上传回放', 3, 'c4'), eventId: 'e1', linkType: 'replay' as const },
    { ...item('rp2', '王同学 · 03-28 09:00', '课程回放待上传', '上传回放', 0, 'c1'), eventId: 'e5', linkType: 'replay' as const },
  ],
  pendingHandout: [
    item('hd1', '课次 2026-03-28 · 英语', '课后讲义未上传', '上传讲义', 0),
    item('hd2', '课次 2026-03-27 · 数学', '课后讲义未上传', '上传讲义', 1),
  ],
  newStudent: [
    { ...item('ns1', '刘同学', '年级：高一 · 今日新入学', '去跟进', 2), studentId: 's4' },
    { ...item('ns2', '孙同学', '年级：初三 · 今日新入学', '去跟进', 1), studentId: 's6' },
    { ...item('ns3', '吴同学', '年级：高二 · 今日新入学', '去跟进', 3), studentId: 's7' },
  ],
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

const colleagueContacts: ContactItem[] = [
  {
    id: 't1',
    name: '顾老师',
    avatar: '顾',
    color: '#4a90d9',
    preview: '我已经帮王同学分配给你了',
    time: '10:06',
    unreadCount: 0,
    contactType: 'colleague',
  },
  {
    id: 't2',
    name: '周老师',
    avatar: '周',
    color: '#4caf74',
    preview: '下周四有个家长开放日',
    time: '09:37',
    unreadCount: 1,
    contactType: 'colleague',
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
      contactType: 'student',
    },
  ],
  colleagues: colleagueContacts,
}

export const calendarEvents: CalEvent[] = [
  // 本周（2026-03-29 周日 ~ 2026-04-04 周六）
  { id: 'e1',  date: '2026-03-30', startTime: '09:00', endTime: '10:30', title: '申论课 · 赵同学',     type: 'class'   },
  { id: 'e2',  date: '2026-03-30', startTime: '14:00', endTime: '15:00', title: '教研组例会',          type: 'meeting' },
  { id: 'e3',  date: '2026-03-31', startTime: '10:00', endTime: '11:30', title: '申论课 · 张同学',     type: 'class'   },
  { id: 'e4',  date: '2026-03-31', startTime: '15:00', endTime: '16:00', title: '家长沟通 · 赵同学',   type: 'meeting' },
  { id: 'e5',  date: '2026-04-01', startTime: '09:00', endTime: '10:30', title: '申论课 · 王同学',     type: 'class'   },
  { id: 'e6',  date: '2026-04-01', startTime: '14:00', endTime: '15:30', title: '申论课 · 陈同学',     type: 'class'   },
  { id: 'e7',  date: '2026-04-01', startTime: '16:00', endTime: '17:00', title: '备课会议',            type: 'meeting' },
  { id: 'e8',  date: '2026-04-02', startTime: '10:00', endTime: '11:30', title: '申论课 · 王同学',     type: 'class'   },
  { id: 'e9',  date: '2026-04-02', startTime: '14:00', endTime: '15:00', title: '教研会议',            type: 'meeting' },
  { id: 'e10', date: '2026-04-03', startTime: '09:00', endTime: '10:30', title: '申论课 · 张同学',     type: 'class'   },
  { id: 'e11', date: '2026-04-03', startTime: '14:00', endTime: '15:30', title: '申论课 · 陈同学',     type: 'class'   },
  { id: 'e12', date: '2026-04-04', startTime: '10:00', endTime: '11:00', title: '一对一复盘',          type: 'meeting' },
  // 下周（2026-04-05 ~ 2026-04-11）
  { id: 'e13', date: '2026-04-07', startTime: '09:00', endTime: '10:30', title: '申论课 · 王同学',     type: 'class'   },
  { id: 'e14', date: '2026-04-07', startTime: '14:00', endTime: '15:00', title: '家长会',              type: 'meeting' },
  { id: 'e15', date: '2026-04-08', startTime: '10:00', endTime: '11:30', title: '申论课 · 赵同学',     type: 'class'   },
  { id: 'e16', date: '2026-04-08', startTime: '15:00', endTime: '16:00', title: '月度教研会',          type: 'meeting' },
  { id: 'e17', date: '2026-04-09', startTime: '09:00', endTime: '10:30', title: '申论课 · 周同学',     type: 'class'   },
  { id: 'e18', date: '2026-04-09', startTime: '14:00', endTime: '15:30', title: '申论课 · 孙同学',     type: 'class'   },
  // 密集日演示（2026-04-10）
  { id: 'e19', date: '2026-04-10', startTime: '08:30', endTime: '10:00', title: '申论课 · 张同学',     type: 'class'   },
  { id: 'e20', date: '2026-04-10', startTime: '10:30', endTime: '11:30', title: '家长沟通 · 张同学',   type: 'meeting' },
  { id: 'e21', date: '2026-04-10', startTime: '13:00', endTime: '14:30', title: '申论课 · 王同学',     type: 'class'   },
  { id: 'e22', date: '2026-04-10', startTime: '14:00', endTime: '15:30', title: '申论课 · 陈同学',     type: 'class'   },
  { id: 'e23', date: '2026-04-10', startTime: '16:00', endTime: '17:00', title: '班主任研讨会',        type: 'meeting' },
  { id: 'e24', date: '2026-04-10', startTime: '19:00', endTime: '20:00', title: '学生测评分析',        type: 'meeting' },
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
  c1: '游走式找点 · 匹配方法课',
  c2: '提炼转述错误 · 真题训练',
  c3: '对策推导错误 · 纠偏课',
  c4: '课程反馈',
  t1: '诊断老师',
  t2: '学管',
}

export const groupMembersByContactId: Record<string, GroupMember[]> = {
  c1: [
    { role: '带教老师', name: '李老师' },
    { role: '学管', name: '周老师' },
    { role: '校长', name: '孙校长' },
    { role: '诊断老师', name: '顾老师' },
    { role: '学生', name: '王同学' },
  ],
  c2: [
    { role: '带教老师', name: '李老师' },
    { role: '学管', name: '周老师' },
    { role: '校长', name: '孙校长' },
    { role: '诊断老师', name: '顾老师' },
    { role: '学生', name: '张同学' },
  ],
  c3: [
    { role: '带教老师', name: '李老师' },
    { role: '学管', name: '周老师' },
    { role: '校长', name: '孙校长' },
    { role: '诊断老师', name: '顾老师' },
    { role: '学生', name: '陈同学' },
  ],
  c4: [
    { role: '带教老师', name: '李老师' },
    { role: '学管', name: '周老师' },
    { role: '校长', name: '孙校长' },
    { role: '诊断老师', name: '顾老师' },
    { role: '学生', name: '赵同学' },
  ],
}

export const messagesByContactId: Record<string, ChatMessage[]> = {
  c1: [
    { id: 'm1',  contactId: 'c1', sender: '学生',    senderName: '王同学', text: '老师，我上次练习的游走式找点那道题，感觉还是不太对…', time: '14:20', date: '2026-03-27' },
    { id: 'm1b', contactId: 'c1', sender: '带教老师', senderName: '李老师', text: '我看了一下，你在"要点取舍"那步跑偏了，我们再捋一遍思路。', time: '14:25', date: '2026-03-27' },
    { id: 'm1c', contactId: 'c1', sender: '诊断老师', senderName: '顾老师', text: '王同学，建议先把材料里的核心词标出来，再去找对应的要点，这样不容易漂移。', time: '14:30', date: '2026-03-27' },
    { id: 'm1d', contactId: 'c1', sender: '学生',    senderName: '王同学', text: '好的老师！我重新整理一下思路发给你看。', time: '14:33', date: '2026-03-27' },
    {
      id: 'm2',
      contactId: 'c1',
      sender: '学生',
      senderName: '王同学',
      text: '老师我这道题还是不太懂…',
      time: '09:10',
      date: '2026-03-28',
    },
    {
      id: 'm2b',
      contactId: 'c1',
      sender: '带教老师',
      senderName: '李老师',
      text: '发给我看看。',
      time: '09:11',
      date: '2026-03-28',
    },
    {
      id: 'm3',
      contactId: 'c1',
      sender: '诊断老师',
      senderName: '顾老师',
      text: '根据王同学上次测评报告，建议重点强化代数运算，李老师可以多出几道变式题巩固一下。',
      time: '09:15',
      date: '2026-03-28',
    },
    {
      id: 'm4',
      contactId: 'c1',
      sender: '带教老师',
      senderName: '李老师',
      text: '好的顾老师，我这节课会重点强化这部分，课后再布置两道变式练习。',
      time: '09:16',
      date: '2026-03-30',
    },
    {
      id: 'm5',
      contactId: 'c1',
      sender: '学管',
      senderName: '周老师',
      text: '王同学，课后如果还有疑问可以随时在群里说哦，我们都在～',
      time: '09:18',
      date: '2026-03-30',
    },
    { id: 'm5f1', contactId: 'c1', sender: '带教老师', senderName: '李老师', text: '', time: '10:00', date: '2026-03-31', msgType: 'file', fileName: '游走式找点专项练习.pdf', fileSize: '1.2 MB' },
    { id: 'm5f2', contactId: 'c1', sender: '诊断老师', senderName: '顾老师', text: '', time: '14:05', date: '2026-04-01', msgType: 'file', fileName: '王同学诊断报告_2026Q1.pdf', fileSize: '856 KB' },
    { id: 'm5f3', contactId: 'c1', sender: '带教老师', senderName: '李老师', text: '', time: '09:30', date: '2026-04-02', msgType: 'file', fileName: '卡点课课件_DAY3.pptx', fileSize: '3.4 MB' },
  ],
  c2: [
    { id: 'm6',  contactId: 'c2', sender: '学生',    senderName: '张同学', text: '老师，我今天的作业写了两遍，感觉第二遍好一点，发给你看下。', time: '20:00', date: '2026-03-28' },
    { id: 'm6b', contactId: 'c2', sender: '带教老师', senderName: '李老师', text: '好，我看看。整体框架比第一遍清晰多了，论据再具体一点就更好。', time: '20:20', date: '2026-03-28' },
    { id: 'm6c', contactId: 'c2', sender: '学生',    senderName: '张同学', text: '谢谢老师！我明天再修改一版。', time: '20:25', date: '2026-03-28' },
    {
      id: 'm7',
      contactId: 'c2',
      sender: '学生',
      senderName: '张同学',
      text: '已提交作业，麻烦老师批改~',
      time: '08:40',
      date: '2026-03-29',
    },
    {
      id: 'm8',
      contactId: 'c2',
      sender: '带教老师',
      senderName: '李老师',
      text: '收到，我今天中午前给你反馈。',
      time: '08:42',
      date: '2026-03-29',
    },
    {
      id: 'm8b',
      contactId: 'c2',
      sender: '诊断老师',
      senderName: '顾老师',
      text: '这次作文考察的是议论文结构，李老师批改时请重点看逻辑层次和论据是否充分。',
      time: '09:00',
      date: '2026-03-29',
    },
    {
      id: 'm9',
      contactId: 'c2',
      sender: '学管',
      senderName: '周老师',
      text: '张同学学习态度很积极，按时提交作业，继续保持！',
      time: '09:05',
      date: '2026-03-30',
    },
    {
      id: 'm10',
      contactId: 'c2',
      sender: '校长',
      senderName: '孙校长',
      text: '已知悉，请各位老师继续跟进。',
      time: '09:10',
      date: '2026-03-30',
    },
    { id: 'm10f1', contactId: 'c2', sender: '学生', senderName: '张同学', text: '', time: '20:05', date: '2026-03-28', msgType: 'file', fileName: '作文第二版_张同学.docx', fileSize: '48 KB' },
    { id: 'm10f2', contactId: 'c2', sender: '带教老师', senderName: '李老师', text: '', time: '09:20', date: '2026-03-31', msgType: 'file', fileName: '提炼转述错误专项讲义.pdf', fileSize: '2.1 MB' },
  ],
  c3: [
    { id: 'm11',  contactId: 'c3', sender: '学生',    senderName: '陈同学', text: '老师，家长说对课程效果不满意，我也不知道该怎么办…', time: '19:00', date: '2026-03-28' },
    { id: 'm11b', contactId: 'c3', sender: '带教老师', senderName: '李老师', text: '陈同学，你先别担心，我们一起好好分析一下目前的进展。', time: '19:05', date: '2026-03-28' },
    { id: 'm11c', contactId: 'c3', sender: '学管',    senderName: '周老师', text: '我也来了解一下情况，我们协同跟进，请家长放心。', time: '19:10', date: '2026-03-28' },
    {
      id: 'm12',
      contactId: 'c3',
      sender: '学生',
      senderName: '陈同学',
      text: '今天上课链接在哪里呀？',
      time: '20:15',
      date: '2026-03-29',
    },
    {
      id: 'm13',
      contactId: 'c3',
      sender: '学管',
      senderName: '周老师',
      text: '陈同学您好，课程链接会在上课前30分钟由李老师发送，如有紧急情况请联系我。',
      time: '20:20',
      date: '2026-03-29',
    },
    {
      id: 'm13b',
      contactId: 'c3',
      sender: '诊断老师',
      senderName: '顾老师',
      text: '陈同学本次课重点是对策专项训练，李老师请注意准备对应练习材料。',
      time: '20:30',
      date: '2026-03-29',
    },
    { id: 'm13f1', contactId: 'c3', sender: '带教老师', senderName: '李老师', text: '', time: '20:35', date: '2026-03-29', msgType: 'file', fileName: '对策专项训练材料.pdf', fileSize: '1.8 MB' },
    { id: 'm13f2', contactId: 'c3', sender: '学生', senderName: '陈同学', text: '', time: '10:00', date: '2026-04-01', msgType: 'file', fileName: '陈同学作答_对策题.pdf', fileSize: '320 KB' },
  ],
  t1: [
    { id: 'tm1', contactId: 't1', sender: '诊断老师', senderName: '顾老师', text: '李老师，王同学上周测评结果出来了，数学偏弱，建议下周课程重点补函数模块。', time: '10:00', date: '2026-03-28' },
    { id: 'tm2', contactId: 't1', sender: '带教老师', senderName: '李老师', text: '收到，我已经看到报告了，这周就开始调整计划。', time: '10:05', date: '2026-03-28' },
    { id: 'tm3', contactId: 't1', sender: '诊断老师', senderName: '顾老师', text: '好的，我已经帮王同学分配给你了，后续有问题随时联系。', time: '10:06', date: '2026-03-30' },
    { id: 'tm4', contactId: 't1', sender: '带教老师', senderName: '李老师', text: '没问题，谢谢顾老师！', time: '10:07', date: '2026-03-30' },
  ],
  t2: [
    { id: 'tm5', contactId: 't2', sender: '学管', senderName: '周老师', text: '李老师，赵同学家长反馈课程时间调整太频繁，已经在投诉群里说了，你看到了吗？', time: '09:30', date: '2026-03-29' },
    { id: 'tm6', contactId: 't2', sender: '带教老师', senderName: '李老师', text: '看到了，我等下去跟赵同学沟通一下，后续确保稳定时间上课。', time: '09:35', date: '2026-03-29' },
    { id: 'tm7', contactId: 't2', sender: '学管', senderName: '周老师', text: '好，我这边也会跟进，有需要我协调的随时说。', time: '09:36', date: '2026-03-29' },
    { id: 'tm8', contactId: 't2', sender: '学管', senderName: '周老师', text: '另外，下周四有个家长开放日，你安排一下时间参加一下。', time: '09:37', date: '2026-03-30' },
    { id: 'tm9', contactId: 't2', sender: '带教老师', senderName: '李老师', text: '好的，我记一下日历。', time: '09:38', date: '2026-03-30' },
  ],
  c4: [
    { id: 'm14',  contactId: 'c4', sender: '学生',    senderName: '赵同学', text: '老师，上次课讲的公文结构错误那块我有点没跟上，可以再讲一遍吗？', time: '19:30', date: '2026-03-28' },
    { id: 'm14b', contactId: 'c4', sender: '带教老师', senderName: '李老师', text: '好，下节课我们先从"文种审题"再系统梳理一遍。', time: '19:35', date: '2026-03-28' },
    {
      id: 'm15',
      contactId: 'c4',
      sender: '学生',
      senderName: '赵同学',
      text: '我想投诉一下课程安排…',
      time: '10:05',
      date: '2026-03-29',
    },
    {
      id: 'm16',
      contactId: 'c4',
      sender: '学管',
      senderName: '周老师',
      text: '赵同学您好，我是学管周老师，请您详细说明问题，我会认真处理并尽快给您答复。',
      time: '10:08',
      date: '2026-03-29',
    },
    {
      id: 'm17',
      contactId: 'c4',
      sender: '学生',
      senderName: '赵同学',
      text: '最近三次课程时间都临时调整了，对我影响很大，我没法每次都能配合。',
      time: '10:10',
      date: '2026-03-29',
    },
    {
      id: 'm18',
      contactId: 'c4',
      sender: '学管',
      senderName: '周老师',
      text: '非常抱歉给您带来不便！我会马上和老师协商，为您安排一个固定的、不轻易变动的课程时间。',
      time: '10:12',
      date: '2026-03-30',
    },
    {
      id: 'm19',
      contactId: 'c4',
      sender: '带教老师',
      senderName: '李老师',
      text: '赵同学，这边确实是我的问题，之后所有课程变动我会提前至少3天通知您，请放心。',
      time: '10:15',
      date: '2026-03-30',
    },
    {
      id: 'm20',
      contactId: 'c4',
      sender: '校长',
      senderName: '孙校长',
      text: '已了解情况，请学管尽快跟进落实，确保同学权益不受影响。',
      time: '10:20',
      date: '2026-03-30',
    },
  ],
}


export type AbnormalReason = '连续缺课' | '长期未提交作业' | '情绪异常' | '家长投诉' | '退费风险'

export interface AbnormalEvent {
  date: string
  desc: string
}

export interface AbnormalUser {
  id: string
  name: string
  avatar: string
  color: string
  contactId: string
  checkpoint: string
  reason: AbnormalReason
  severity: 'high' | 'medium'
  events: AbnormalEvent[]
  transferred?: boolean
}

export const abnormalUsers: AbnormalUser[] = [
  {
    id: 'ab1', name: '赵同学', avatar: '赵', color: '#D94F35', contactId: 'c4',
    checkpoint: '公文结构错误', reason: '连续缺课', severity: 'high',
    events: [
      { date: '2026-03-10', desc: '无故缺席第18课，未提前告知' },
      { date: '2026-03-17', desc: '再次缺席第19课，事后联系未接听' },
      { date: '2026-03-24', desc: '第三次缺席第20课，家长电话无法接通' },
    ],
  },
  {
    id: 'ab2', name: '张同学', avatar: '张', color: '#F0CDBB', contactId: 'c2',
    checkpoint: '提炼转述错误', reason: '长期未提交作业', severity: 'medium',
    events: [
      { date: '2026-03-08', desc: '第13课作业逾期3天未交' },
      { date: '2026-03-15', desc: '第14课作业再次未交，提醒后仍无回应' },
      { date: '2026-03-22', desc: '第15课作业未交，已累计拖欠3次' },
    ],
  },
  {
    id: 'ab3', name: '陈同学', avatar: '陈', color: '#E6F1FB', contactId: 'c3',
    checkpoint: '对策推导错误', reason: '家长投诉', severity: 'high',
    events: [
      { date: '2026-03-20', desc: '家长在课程反馈群反映课程效果不满意' },
      { date: '2026-03-25', desc: '家长要求调换老师，情绪较激动' },
      { date: '2026-03-28', desc: '家长再次联系学管，提出退费意向' },
    ],
  },
]

export interface ReviewItem {
  id: string
  name: string
  avatar: string
  color: string
  contactId: string
  reviewType: '入学诊断' | '卡点练习题' | '卡点考试' | '整卷批改' | '二阶试卷'
  checkpoint: string
  submittedAt: string
  deadline: string
  priority: 'urgent' | 'normal' | 'low'
  submittedNormal: boolean  // 是否正常提交（准时、无异常）
}

export const pendingReviewItems: ReviewItem[] = [
  { id: 'rv1', name: '张同学', avatar: '张', color: '#F0CDBB', contactId: 'c2', reviewType: '入学诊断',  checkpoint: '作文立意错误',   submittedAt: '08:30 提交',     deadline: '今日 12:00', priority: 'urgent', submittedNormal: true  },
  { id: 'rv2', name: '王同学', avatar: '王', color: '#E8845A', contactId: 'c1', reviewType: '卡点练习题', checkpoint: '游走式找点',    submittedAt: '09:10 提交',     deadline: '今日 14:00', priority: 'normal', submittedNormal: true  },
  { id: 'rv3', name: '陈同学', avatar: '陈', color: '#E6F1FB', contactId: 'c3', reviewType: '卡点考试',  checkpoint: '对策推导错误',   submittedAt: '07:45 提交',     deadline: '今日 10:00', priority: 'urgent', submittedNormal: false },
  { id: 'rv4', name: '赵同学', avatar: '赵', color: '#D94F35', contactId: 'c4', reviewType: '整卷批改',  checkpoint: '公文结构错误',   submittedAt: '昨天 22:00 提交', deadline: '明日 18:00', priority: 'low',    submittedNormal: false },
  { id: 'rv5', name: '孙同学', avatar: '孙', color: '#c8e6c9', contactId: 'c1', reviewType: '卡点练习题', checkpoint: '作文立意错误',   submittedAt: '09:50 提交',     deadline: '今日 16:00', priority: 'normal', submittedNormal: true  },
  { id: 'rv6', name: '吴同学', avatar: '吴', color: '#ffe0b2', contactId: 'c2', reviewType: '卡点考试',  checkpoint: '作文逻辑不清晰',  submittedAt: '08:00 提交',     deadline: '今日 11:30', priority: 'urgent', submittedNormal: true  },
  { id: 'rv7', name: '郑同学', avatar: '郑', color: '#e1bee7', contactId: 'c3', reviewType: '入学诊断',  checkpoint: '作文表达不流畅',  submittedAt: '10:20 提交',     deadline: '今日 18:00', priority: 'low',    submittedNormal: true  },
  { id: 'rv8', name: '周同学', avatar: '周', color: '#f8bbd0', contactId: 'c4', reviewType: '整卷批改',  checkpoint: '游走式找点',    submittedAt: '07:00 提交',     deadline: '今日 12:30', priority: 'normal', submittedNormal: false },
  { id: 'rv9', name: '刘同学', avatar: '刘', color: '#b5d5f5', contactId: 'c1', reviewType: '二阶试卷',  checkpoint: '提炼转述错误',   submittedAt: '08:55 提交',     deadline: '今日 13:00', priority: 'urgent', submittedNormal: true  },
  { id: 'rv10', name: '吴同学', avatar: '吴', color: '#ffe0b2', contactId: 'c2', reviewType: '二阶试卷', checkpoint: '分析结构错误',   submittedAt: '09:30 提交',     deadline: '今日 15:00', priority: 'normal', submittedNormal: true  },
]

export interface StudentItem {
  id: string
  name: string
  avatar: string
  color: string
  grade: string
  subject: string
  lastSession: string
  status: 'normal' | 'warning' | 'new' | 'leave' | 'completed'
  contactId?: string   // 关联的群聊 contact ID
}

export const myDiagnosisStudents: StudentItem[] = [
  { id: 's1', name: '王同学', avatar: '王', color: '#E8845A', grade: '国考申论', subject: '游走式找点', lastSession: '2026-03-27', status: 'normal',  contactId: 'c1' },
  { id: 's2', name: '张同学', avatar: '张', color: '#F0CDBB', grade: '国考申论', subject: '提炼转述错误', lastSession: '2026-03-26', status: 'warning', contactId: 'c2' },
  { id: 's3', name: '陈同学', avatar: '陈', color: '#E6F1FB', grade: '省考申论', subject: '对策推导错误', lastSession: '2026-03-25', status: 'normal',  contactId: 'c3' },
  { id: 's4', name: '刘同学', avatar: '刘', color: '#b5d5f5', grade: '国考申论', subject: '分析结构错误', lastSession: '2026-03-28', status: 'new' },
]

export const myTeachingStudents: StudentItem[] = [
  { id: 's5', name: '赵同学', avatar: '赵', color: '#D94F35', grade: '省考申论', subject: '公文结构错误', lastSession: '2026-03-27', status: 'warning', contactId: 'c4' },
  { id: 's6', name: '孙同学', avatar: '孙', color: '#c8e6c9', grade: '国考申论', subject: '作文立意错误', lastSession: '2026-03-26', status: 'normal' },
  { id: 's7', name: '吴同学', avatar: '吴', color: '#ffe0b2', grade: '国考申论', subject: '作文逻辑不清晰', lastSession: '2026-03-24', status: 'normal' },
  { id: 's8', name: '郑同学', avatar: '郑', color: '#e1bee7', grade: '省考申论', subject: '作文表达不流畅', lastSession: '2026-03-28', status: 'new' },
  { id: 's9', name: '周同学', avatar: '周', color: '#f8bbd0', grade: '国考申论', subject: '游走式找点', lastSession: '2026-03-22', status: 'normal' },
  { id: 's10', name: '蒋同学', avatar: '蒋', color: '#b0b8c1', grade: '省考申论', subject: '提炼转述错误', lastSession: '2026-03-18', status: 'leave' },
]

/** 老师姓名 → 对话框 contact ID */
export const teacherNameToContactId: Record<string, string> = {
  '顾老师': 't1',
  '周老师': 't2',
}

/** contact ID → 学生 ID（用于从对话框跳转到学生资料） */
export const contactIdToStudentId: Record<string, string> = {
  'c1': 's1',
  'c2': 's2',
  'c3': 's3',
  'c4': 's5',
}


export interface KpointAssignment {
  title: string
  score: number      // 得分（满分100）
  accuracy: number   // 正确率 0–100
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
  rating: number          // 1–5
  tags: string[]          // 学生选择的标签
  comment: string         // 文字补充
}

export type AnswerStatus = 'pending' | 'reviewed'
export type QuestionType = '入学诊断' | '卡点练习题' | '卡点考试' | '整卷批改'

export interface QuestionAnswer {
  id: string
  questionTitle: string
  questionType: QuestionType
  studentAnswer: string
  submittedAt: string     // ISO
  status: AnswerStatus
  score?: number          // 老师打分
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
  kpoint: string      // 卡点名称，e.g. '游走式找点'
  color: string       // 卡点颜色
  teachers: { role: string; name: string }[]
}

export type DayStatus = 'normal' | 'delayed' | 'urgent' | 'pending'

export interface LeaveInfo {
  startDate: string     // 请假开始日期 yyyy-MM-dd
  endDate: string       // 请假结束日期 yyyy-MM-dd
  reason: string        // 请假原因
  resumeDate?: string   // 预计复课日期 yyyy-MM-dd
}

export interface StudentDetail {
  studentId: string
  totalHours: number
  joinDate: string
  sessionCount: number
  currentChapter: string
  teachers: { role: string; name: string }[]
  teachersByKpoint: KpointTeacherGroup[]
  knowledgePoints: KnowledgePoint[]
  teacherNotes: TeacherNote[]
  handouts: Handout[]
  replays: Replay[]
  feedbacks: StudentFeedback[]
  answers: QuestionAnswer[]
  dayStatuses?: Record<number, DayStatus>  // key = DAY编号(1-7), 覆盖默认状态
  leaveInfo?: LeaveInfo
}

export const studentDetails: Record<string, StudentDetail> = {
  s1: {
    studentId: 's1',
    joinDate: '2025-09-01', sessionCount: 24, totalHours: 48,
    currentChapter: '游走式找点 · DAY6 刷题',
    teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }],
    teachersByKpoint: [
      { kpoint: '游走式找点', color: '#e8845a', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }] },
      { kpoint: '提炼转述错误', color: '#4a90d9', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered',
        assignments: [
          { title: '开课共识测验', score: 92, accuracy: 88, date: '2025-09-05' },
        ] },
      { name: '前置词识别', progress: 85, status: 'mastered',
        assignments: [
          { title: '前置词识别练习A', score: 88, accuracy: 84, date: '2025-10-10' },
          { title: '前置词识别练习B', score: 90, accuracy: 87, date: '2025-11-02' },
        ] },
      { name: '要点取舍', progress: 70, status: 'learning',
        assignments: [
          { title: '要点取舍专项作业①', score: 72, accuracy: 68, date: '2026-02-15' },
          { title: '要点取舍专项作业②', score: 76, accuracy: 71, date: '2026-03-06' },
          { title: '要点取舍真题练习', score: 74, accuracy: 69, date: '2026-03-20' },
        ] },
      { name: '要点分类', progress: 55, status: 'learning',
        assignments: [
          { title: '要点分类专项作业', score: 62, accuracy: 55, date: '2026-03-13' },
          { title: '要点分类真题练习', score: 65, accuracy: 58, date: '2026-03-27' },
        ] },
      { name: '真题综合应用', progress: 30, status: 'weak',
        assignments: [
          { title: '2024国考真题·归纳第2题', score: 48, accuracy: 40, date: '2026-03-26' },
        ] },
    ],
    teacherNotes: [
      { role: '带教老师', name: '李老师', content: '要点取舍方向感有提升，但分类维度仍不稳定，需重点练习"横向归类"方法。', date: '2026-03-27' },
      { role: '诊断老师', name: '顾老师', content: '诊断发现答题时容易遗漏隐性要点，建议专项训练材料信息挖掘。', date: '2026-03-20' },
      { role: '学管', name: '周老师', content: '学习态度认真，每次课后会自主整理笔记。', date: '2026-03-15' },
    ],
    handouts: [
      { id: 'h1', fileName: '游走式找点-要点分类专项讲义.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-27', sessionLabel: '第24课' },
      { id: 'h2', fileName: '游走式找点-要点取舍练习册.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-20', sessionLabel: '第23课' },
      { id: 'h3', fileName: '游走式找点-诊断材料.docx', uploadedBy: '顾老师', role: '诊断老师', date: '2026-03-15', sessionLabel: '诊断材料' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第24课', date: '2026-03-27', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s1r1', duration: '89分钟' },
      { id: 'r2', sessionLabel: '第23课', date: '2026-03-20', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s1r2', duration: '92分钟' },
    ],
    feedbacks: [
      { id: 'fb1', sessionLabel: '第24课', date: '2026-03-27', rating: 5, tags: ['讲解清晰', '节奏合适', '有收获'], comment: '这节课终于搞懂了要点分类，老师举的例子很实用！' },
      { id: 'fb2', sessionLabel: '第23课', date: '2026-03-20', rating: 4, tags: ['内容充实', '讲解清晰'], comment: '要点取舍这块还是有点模糊，希望下节课可以再练一道题。' },
      { id: 'fb3', sessionLabel: '第22课', date: '2026-03-13', rating: 4, tags: ['节奏合适', '有收获'], comment: '感觉进步了，但分类维度总是想不全。' },
    ],
    answers: [
      { id: 'ans1', questionTitle: '2024年国考真题·归纳概括第2题', questionType: '卡点练习题', studentAnswer: '材料反映了基层治理中存在的主要问题：一是权责不清，基层干部承担上级转移职责但缺乏相应权限；二是考核机制不合理，"留痕主义"导致形式重于实质；三是资源配置不足，人手与任务量严重失衡。', submittedAt: '2026-03-27T14:30:00Z', status: 'reviewed', score: 85, teacherComment: '要点提炼完整，概括准确，但第三点"资源配置"与材料对应不够精确，建议改为"经费与人员保障不足"更贴近原文。', reviewedAt: '2026-03-27T18:00:00Z' },
      { id: 'ans2', questionTitle: '2023年省考真题·综合分析第1题', questionType: '卡点练习题', studentAnswer: '这道题考查的是对"数字鸿沟"问题的分析。数字鸿沟的本质是信息获取能力的不平等，体现在城乡之间、代际之间以及不同受教育程度群体之间。解决路径应从基础设施、数字素养培训和适老化改造三个维度着手。', submittedAt: '2026-03-26T20:15:00Z', status: 'pending' },
    ],
  },
  s2: {
    studentId: 's2',
    joinDate: '2025-11-10', sessionCount: 16, totalHours: 32,
    currentChapter: '提炼转述错误 · DAY6 刷题+背诵规范词',
    teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }],
    teachersByKpoint: [
      { kpoint: '提炼转述错误', color: '#4a90d9', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered',
        assignments: [
          { title: '开课共识测验', score: 88, accuracy: 82, date: '2025-11-15' },
        ] },
      { name: '间接概括方法', progress: 80, status: 'mastered',
        assignments: [
          { title: '间接概括专项练习A', score: 82, accuracy: 78, date: '2025-12-10' },
          { title: '间接概括真题训练', score: 85, accuracy: 80, date: '2026-01-08' },
        ] },
      { name: '要素提炼规范', progress: 60, status: 'learning',
        assignments: [
          { title: '要素提炼作业①', score: 63, accuracy: 57, date: '2026-02-20' },
          { title: '要素提炼真题练习', score: 66, accuracy: 60, date: '2026-03-10' },
        ] },
      { name: '语言规范化', progress: 45, status: 'weak',
        assignments: [
          { title: '语言改写专项作业', score: 50, accuracy: 42, date: '2026-03-18' },
          { title: '申论语体训练', score: 48, accuracy: 38, date: '2026-03-26' },
        ] },
      { name: '真题实战', progress: 50, status: 'learning',
        assignments: [
          { title: '2024国考归纳第1题', score: 55, accuracy: 48, date: '2026-03-26' },
        ] },
    ],
    teacherNotes: [
      { role: '带教老师', name: '李老师', content: '间接概括框架掌握较好，但语言规范化失分严重，需加强"申论语体"训练。', date: '2026-03-26' },
      { role: '诊断老师', name: '顾老师', content: '测评发现表述口语化严重，建议每日抄写一段参考答案培养语感。', date: '2026-03-18' },
      { role: '学管', name: '周老师', content: '最近两次课迟到，已与家长沟通，请老师关注状态。', date: '2026-03-22' },
      { role: '校长', name: '孙校长', content: '关注该生情况，如持续异常请上报。', date: '2026-03-23' },
    ],
    handouts: [
      { id: 'h1', fileName: '提炼转述错误-间接概括方法讲义.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-26', sessionLabel: '第16课' },
      { id: 'h2', fileName: '提炼转述错误-真题训练第3道.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-18', sessionLabel: '第15课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第16课', date: '2026-03-26', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s2r1', duration: '87分钟' },
    ],
    feedbacks: [
      { id: 'fb1', sessionLabel: '第16课', date: '2026-03-26', rating: 3, tags: ['有点快', '内容充实'], comment: '这节课讲的内容有点多，有些地方跟不上，希望下次可以放慢一点。' },
      { id: 'fb2', sessionLabel: '第15课', date: '2026-03-18', rating: 4, tags: ['讲解清晰', '有收获'], comment: '间接概括方法学会了，感觉对真题很有帮助。' },
    ],
    answers: [
      { id: 'ans1', questionTitle: '入学诊断题·材料概括', questionType: '入学诊断', studentAnswer: '材料主要说明了城市化进程带来的问题，包括交通拥堵、环境污染和社会分化等。', submittedAt: '2026-03-10T09:00:00Z', status: 'reviewed', score: 60, teacherComment: '概括维度不够，遗漏了"公共服务供给滞后"这一核心要点。另外"社会分化"表述宽泛，建议对应原文用"贫富差距扩大"。', reviewedAt: '2026-03-10T12:00:00Z' },
      { id: 'ans2', questionTitle: '2024年国考真题·归纳概括第1题', questionType: '卡点练习题', studentAnswer: '根据材料，当前社区建设面临的挑战主要有：基层组织能力薄弱、居民参与积极性不足、专项资金使用不规范三个方面。', submittedAt: '2026-03-26T16:00:00Z', status: 'pending' },
    ],
  },
  s3: {
    studentId: 's3',
    joinDate: '2025-07-15', sessionCount: 30, totalHours: 60,
    currentChapter: '对策推导错误 · DAY7 考试',
    teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '王老师' }],
    teachersByKpoint: [
      { kpoint: '游走式找点', color: '#e8845a', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '王老师' }] },
      { kpoint: '提炼转述错误', color: '#4a90d9', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '王老师' }] },
      { kpoint: '对策推导错误', color: '#4caf74', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '王老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered',
        assignments: [{ title: '开课共识测验', score: 95, accuracy: 92, date: '2025-07-20' }] },
      { name: '对策来源识别', progress: 90, status: 'mastered',
        assignments: [
          { title: '对策来源识别练习A', score: 90, accuracy: 87, date: '2025-09-15' },
          { title: '对策来源识别练习B', score: 92, accuracy: 89, date: '2025-10-10' },
        ] },
      { name: '对策分析推导', progress: 85, status: 'mastered',
        assignments: [
          { title: '对策推导专项作业①', score: 86, accuracy: 82, date: '2025-11-20' },
          { title: '对策推导真题训练', score: 88, accuracy: 84, date: '2026-01-15' },
        ] },
      { name: '针对性与可操作性', progress: 75, status: 'learning',
        assignments: [
          { title: '可操作性专项作业', score: 74, accuracy: 70, date: '2026-02-28' },
          { title: '针对性改写练习', score: 78, accuracy: 73, date: '2026-03-18' },
        ] },
      { name: '结课综合测评', progress: 65, status: 'learning',
        assignments: [
          { title: '结课模拟考试', score: 68, accuracy: 62, date: '2026-03-25' },
        ] },
    ],
    teacherNotes: [
      { role: '带教老师', name: '李老师', content: '整体进步稳定，对策来源分析能力强，结课前重点打磨"可操作性"表述。', date: '2026-03-25' },
      { role: '学管', name: '周老师', content: '学员积极性很高，每次课前都会预习材料。', date: '2026-03-10' },
    ],
    handouts: [
      { id: 'h1', fileName: '对策推导错误-对策推导专项讲义.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-25', sessionLabel: '第30课' },
      { id: 'h2', fileName: '对策推导错误-结课模拟卷.docx', uploadedBy: '李老师', role: '带教老师', date: '2026-03-18', sessionLabel: '第29课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第30课', date: '2026-03-25', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s3r1', duration: '90分钟' },
      { id: 'r2', sessionLabel: '第29课', date: '2026-03-18', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s3r2', duration: '88分钟' },
    ],
    feedbacks: [
      { id: 'fb1', sessionLabel: '第30课', date: '2026-03-25', rating: 5, tags: ['讲解清晰', '节奏合适', '有收获'], comment: '今天考试题做对了，感觉很有成就感！' },
    ],
    answers: [
      { id: 'ans1', questionTitle: '结课考试·对策综合题', questionType: '卡点考试', studentAnswer: '针对材料中反映的基层治理难题，应从以下三个层面提出对策：第一，明确权责边界，依法厘清基层政府与上级部门的职责划分；第二，优化考核机制，推行"结果导向"替代"留痕主义"；第三，加强资源保障，增加基层财政转移支付和人员配置。', submittedAt: '2026-03-25T10:00:00Z', status: 'pending' },
    ],
  },
  s4: {
    studentId: 's4',
    joinDate: '2026-03-25', sessionCount: 2, totalHours: 4,
    currentChapter: '分析结构错误 · DAY1 1V1共识课',
    teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '顾老师' }],
    teachersByKpoint: [
      { kpoint: '分析结构错误', color: '#6b21a8', teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 50, status: 'learning' },
      { name: '分析结构建立', progress: 10, status: 'weak' },
      { name: '对策来源分析', progress: 0, status: 'weak' },
      { name: '真题训练', progress: 0, status: 'weak' },
    ],
    teacherNotes: [
      { role: '带教老师', name: '陈老师', content: '新学员，完成首次开课共识，对申论基本概念理解薄弱，需从分析框架打基础。', date: '2026-03-28' },
      { role: '诊断老师', name: '顾老师', content: '初步诊断：分析题常出现"对策代替分析"的问题，属于典型分析结构错误卡点。', date: '2026-03-27' },
    ],
    handouts: [
      { id: 'h1', fileName: '分析结构错误-开课共识讲义.pdf', uploadedBy: '陈老师', role: '带教老师', date: '2026-03-28', sessionLabel: '第2课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第2课', date: '2026-03-28', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s4r1', duration: '85分钟' },
    ],
    feedbacks: [],
    answers: [],
  },
  s5: {
    studentId: 's5',
    joinDate: '2025-10-01', sessionCount: 20, totalHours: 40,
    currentChapter: '公文结构错误 · DAY5 刷题',
    teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '顾老师' }],
    teachersByKpoint: [
      { kpoint: '公文结构错误', color: '#9b6fcc', teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '顾老师' }] },
      { kpoint: '提炼转述错误', color: '#4a90d9', teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered',
        assignments: [{ title: '开课共识测验', score: 90, accuracy: 86, date: '2025-10-05' }] },
      { name: '文种审题', progress: 55, status: 'learning',
        assignments: [
          { title: '文种辨析专项作业', score: 58, accuracy: 52, date: '2026-02-10' },
          { title: '文种判断练习', score: 62, accuracy: 55, date: '2026-03-05' },
        ] },
      { name: '结构确定', progress: 40, status: 'weak',
        assignments: [
          { title: '公文结构练习', score: 45, accuracy: 38, date: '2026-03-20' },
        ] },
      { name: '公文语体规范', progress: 35, status: 'weak',
        assignments: [
          { title: '语体规范改写作业', score: 40, accuracy: 32, date: '2026-03-27' },
        ] },
      { name: '真题实战', progress: 20, status: 'weak',
        assignments: [
          { title: '2023省考公文写作', score: 35, accuracy: 28, date: '2026-03-28' },
        ] },
    ],
    teacherNotes: [
      { role: '带教老师', name: '陈老师', content: '公文结构判断不稳定，总把报告写成请示，需专项训练文种辨析。', date: '2026-03-27' },
      { role: '诊断老师', name: '顾老师', content: '公文格式规范性差，建议抄写3份标准范文后再进行练习。', date: '2026-03-15' },
      { role: '学管', name: '周老师', content: '家长反馈学生压力较大，请老师多给予鼓励。', date: '2026-03-20' },
    ],
    handouts: [
      { id: 'h1', fileName: '公文结构错误-文种辨析专项讲义.pdf', uploadedBy: '陈老师', role: '带教老师', date: '2026-03-27', sessionLabel: '第20课' },
      { id: 'h2', fileName: '公文结构错误-公文结构练习题.pdf', uploadedBy: '陈老师', role: '带教老师', date: '2026-03-20', sessionLabel: '第19课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第20课', date: '2026-03-27', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s5r1', duration: '91分钟' },
    ],
    feedbacks: [
      { id: 'fb1', sessionLabel: '第20课', date: '2026-03-27', rating: 2, tags: ['有点难', '节奏偏快'], comment: '公文那块真的没搞懂，感觉越学越乱，希望老师能多讲几遍。' },
      { id: 'fb2', sessionLabel: '第19课', date: '2026-03-20', rating: 3, tags: ['内容充实'], comment: '练习题做了一半，没来得及全做完，感觉还差得远。' },
    ],
    answers: [
      { id: 'ans1', questionTitle: '文种辨析专项练习·请示与报告区别', questionType: '卡点练习题', studentAnswer: '请示用于向上级请求指示或批准；报告用于向上级汇报工作情况。区别在于：请示需要批复，报告不需要。', submittedAt: '2026-03-27T15:00:00Z', status: 'reviewed', score: 70, teacherComment: '基本区别答出来了，但缺少格式规范的对比（请示末尾须有"请批示"、报告末尾须有"特此报告"），以及发文对象的区别——请示只能送一个上级，报告可以抄送多个。', reviewedAt: '2026-03-27T19:00:00Z' },
      { id: 'ans2', questionTitle: '2023年省考真题·公文写作', questionType: '卡点考试', studentAnswer: '关于进一步加强基层社区治理工作的报告\n一、基本情况\n近年来，我市基层社区治理工作取得一定成效，但仍存在若干问题需要解决。\n二、主要问题\n（一）基层治理能力有待提升\n（二）居民参与积极性不足\n（三）相关经费保障不够\n三、下步工作建议\n建议加大培训力度，完善经费保障机制，充分调动居民积极性。', submittedAt: '2026-03-28T10:00:00Z', status: 'pending' },
    ],
  },
  s6: {
    studentId: 's6',
    joinDate: '2025-08-20', sessionCount: 26, totalHours: 52,
    currentChapter: '作文立意错误 · DAY3 1V1纠偏课',
    teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '王老师' }],
    teachersByKpoint: [
      { kpoint: '游走式找点', color: '#e8845a', teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '王老师' }] },
      { kpoint: '作文立意错误', color: '#e0a020', teachers: [{ role: '带教老师', name: '陈老师' }, { role: '诊断老师', name: '王老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered' },
      { name: '题干分析法', progress: 85, status: 'mastered' },
      { name: '材料分析法', progress: 75, status: 'learning' },
      { name: '立意准确性', progress: 60, status: 'learning' },
      { name: '真题实战', progress: 55, status: 'learning' },
    ],
    teacherNotes: [
      { role: '带教老师', name: '陈老师', content: '立意方向基本正确，但仍有偏跑风险，纠偏课重点强化"材料核心词锁定"方法。', date: '2026-03-26' },
      { role: '学管', name: '周老师', content: '出勤率100%，学习状态非常稳定。', date: '2026-03-01' },
    ],
    handouts: [
      { id: 'h1', fileName: '作文立意错误-材料分析法讲义.pdf', uploadedBy: '陈老师', role: '带教老师', date: '2026-03-26', sessionLabel: '第26课' },
      { id: 'h2', fileName: '作文立意错误-题干分析框架.docx', uploadedBy: '陈老师', role: '带教老师', date: '2026-03-19', sessionLabel: '第25课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第26课', date: '2026-03-26', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s6r1', duration: '93分钟' },
      { id: 'r2', sessionLabel: '第25课', date: '2026-03-19', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s6r2', duration: '86分钟' },
    ],
    feedbacks: [],
    answers: [],
  },
  s7: {
    studentId: 's7',
    joinDate: '2025-09-15', sessionCount: 18, totalHours: 36,
    currentChapter: '作文逻辑不清晰 · DAY5 刷题+论据背诵',
    teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '顾老师' }],
    teachersByKpoint: [
      { kpoint: '作文逻辑不清晰', color: '#64b0c8', teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '顾老师' }] },
      { kpoint: '作文立意错误', color: '#e0a020', teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered' },
      { name: '道理论证运用', progress: 80, status: 'mastered' },
      { name: '举例论证运用', progress: 70, status: 'learning' },
      { name: '论证逻辑结构', progress: 55, status: 'learning' },
      { name: '作文综合练习', progress: 45, status: 'weak' },
    ],
    teacherNotes: [
      { role: '带教老师', name: '林老师', content: '道理论证素材丰富但缺少深度分析，论据堆砌感强，需训练"论据→分析→结论"三步法。', date: '2026-03-24' },
      { role: '诊断老师', name: '顾老师', content: '整体申论思维有一定基础，建议多做综合押题提升解题速度。', date: '2026-03-10' },
    ],
    handouts: [
      { id: 'h1', fileName: '作文逻辑不清晰-道理论证专项讲义.pdf', uploadedBy: '林老师', role: '带教老师', date: '2026-03-24', sessionLabel: '第18课' },
      { id: 'h2', fileName: '作文逻辑不清晰-真题作文第2篇练习.pdf', uploadedBy: '林老师', role: '带教老师', date: '2026-03-17', sessionLabel: '第17课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第18课', date: '2026-03-24', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s7r1', duration: '89分钟' },
    ],
    feedbacks: [],
    answers: [],
  },
  s8: {
    studentId: 's8',
    joinDate: '2026-03-20', sessionCount: 3, totalHours: 6,
    currentChapter: '作文表达不流畅 · DAY1 1V1共识课',
    teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '顾老师' }],
    teachersByKpoint: [
      { kpoint: '作文表达不流畅', color: '#d94f35', teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 60, status: 'learning' },
      { name: '语言优化方法', progress: 15, status: 'weak' },
      { name: '申论语体规范', progress: 10, status: 'weak' },
      { name: '作文训练', progress: 0, status: 'weak' },
    ],
    teacherNotes: [
      { role: '带教老师', name: '林老师', content: '刚入学，开课共识中发现表达口语化严重，整句都是大白话，先从改写练习入手。', date: '2026-03-28' },
      { role: '诊断老师', name: '顾老师', content: '作文表达不流畅典型案例，建议系统学习申论标准语体后再进行写作训练。', date: '2026-03-26' },
    ],
    handouts: [
      { id: 'h1', fileName: '作文表达不流畅-语言优化方法讲义.pdf', uploadedBy: '林老师', role: '带教老师', date: '2026-03-28', sessionLabel: '第3课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第3课', date: '2026-03-28', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s8r1', duration: '84分钟' },
    ],
    feedbacks: [],
    answers: [],
  },
  s9: {
    studentId: 's9',
    joinDate: '2025-10-10', sessionCount: 22, totalHours: 44,
    currentChapter: '游走式找点 · DAY5 刷题',
    teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '王老师' }],
    teachersByKpoint: [
      { kpoint: '游走式找点', color: '#e8845a', teachers: [{ role: '带教老师', name: '林老师' }, { role: '诊断老师', name: '王老师' }] },
    ],
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered' },
      { name: '前置词识别', progress: 80, status: 'mastered' },
      { name: '要点取舍', progress: 65, status: 'learning' },
      { name: '要点分类', progress: 50, status: 'learning' },
      { name: '真题综合应用', progress: 35, status: 'weak' },
    ],
    teacherNotes: [
      { role: '带教老师', name: '林老师', content: '前置词识别已掌握，要点分类维度还不够稳定，本周重点练习"按性质分类"模型。', date: '2026-03-22' },
      { role: '学管', name: '周老师', content: '学习状态稳定，偶尔会主动问问题，积极性可以。', date: '2026-03-05' },
    ],
    handouts: [
      { id: 'h1', fileName: '游走式找点-要点分类模型讲义.pdf', uploadedBy: '林老师', role: '带教老师', date: '2026-03-22', sessionLabel: '第22课' },
      { id: 'h2', fileName: '游走式找点-前置词识别练习.pdf', uploadedBy: '林老师', role: '带教老师', date: '2026-03-15', sessionLabel: '第21课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第22课', date: '2026-03-22', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s9r1', duration: '90分钟' },
    ],
    feedbacks: [],
    answers: [],
  },
  s10: {
    studentId: 's10',
    joinDate: '2025-12-01', sessionCount: 10, totalHours: 20,
    currentChapter: '提炼转述错误 · DAY3 1V1纠偏课',
    teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }, { role: '学管', name: '周老师' }],
    teachersByKpoint: [
      { kpoint: '提炼转述错误', color: '#4a90d9', teachers: [{ role: '带教老师', name: '李老师' }, { role: '诊断老师', name: '顾老师' }] },
    ],
    leaveInfo: {
      startDate: '2026-03-20',
      endDate: '2026-04-10',
      reason: '备考省考笔试，需要集中时间自主复习',
      resumeDate: '2026-04-11',
    },
    dayStatuses: { 1: 'normal', 2: 'normal', 3: 'delayed' },
    knowledgePoints: [
      { name: '开课共识', progress: 100, status: 'mastered',
        assignments: [{ title: '开课共识测验', score: 85, accuracy: 80, date: '2025-12-05' }] },
      { name: '间接概括方法', progress: 70, status: 'learning',
        assignments: [
          { title: '间接概括专项练习A', score: 75, accuracy: 70, date: '2026-01-10' },
          { title: '间接概括真题训练', score: 78, accuracy: 73, date: '2026-02-08' },
        ] },
      { name: '规范词积累', progress: 45, status: 'learning',
        assignments: [{ title: '规范词专项练习', score: 62, accuracy: 55, date: '2026-03-10' }] },
      { name: '转述逻辑训练', progress: 20, status: 'weak', assignments: [] },
    ],
    teacherNotes: [
      { role: '带教老师', name: '李老师', content: '规范词积累薄弱，转述时容易用口语替换，需强化书面表达习惯。请假前已推送背诵材料。', date: '2026-03-18' },
      { role: '学管', name: '周老师', content: '学生因省考在即申请请假，态度认真，已知会带教老师并完成请假审批。', date: '2026-03-19' },
    ],
    handouts: [
      { id: 'h1', fileName: '提炼转述错误-规范词汇手册.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-18', sessionLabel: '第10课' },
      { id: 'h2', fileName: '提炼转述错误-间接概括专项讲义.pdf', uploadedBy: '李老师', role: '带教老师', date: '2026-03-10', sessionLabel: '第9课' },
    ],
    replays: [
      { id: 'r1', sessionLabel: '第10课', date: '2026-03-18', url: 'https://meeting.tencent.com/v2/cloud-record/share?id=s10r1', duration: '88分钟' },
    ],
    feedbacks: [
      { id: 'fb1', sessionLabel: '第10课', date: '2026-03-18', rating: 4, tags: ['讲解清晰', '内容充实'], comment: '老师给的规范词手册很实用，请假期间会认真背。' },
    ],
    answers: [],
  },
}


export interface TeacherProfile {
  name: string
  avatar: string
  color: string
  primaryRole: string
  subject: string
  joinDate: string
  intro: string
}

export const teacherProfiles: Record<string, TeacherProfile> = {
  '李老师': { name: '李老师', avatar: '李', color: '#e8845a', primaryRole: '带教老师', subject: '申论卡点突破', joinDate: '2023-03-01', intro: '专注申论卡点突破辅导，擅长帮助学生识别自身卡点并系统提升。' },
  '顾老师': { name: '顾老师', avatar: '顾', color: '#4a90d9', primaryRole: '诊断老师', subject: '综合诊断', joinDate: '2022-09-01', intro: '擅长学情分析与测评，为每位学生制定个性化学习路径。' },
  '王老师': { name: '王老师', avatar: '王', color: '#4caf74', primaryRole: '诊断老师', subject: '申论诊断', joinDate: '2023-06-15', intro: '申论专项诊断老师，擅长识别学员卡点类型，制定针对性学习路径。' },
}

export const staffRoster: GroupMember[] = [
  { role: '带教老师', name: '李老师' },
  { role: '带教老师', name: '陈老师' },
  { role: '带教老师', name: '林老师' },
  { role: '诊断老师', name: '顾老师' },
  { role: '诊断老师', name: '王老师' },
  { role: '学管', name: '周老师' },
  { role: '学管', name: '赵老师' },
  { role: '校长', name: '孙校长' },
]

// ── Kpoint types (8个卡点) ────────────────────────────────────────────────────

export interface KpointType {
  name: string
  tag: string
  color: string
  desc: string
}

export const kpointTypes: KpointType[] = [
  { name: '游走式找点', tag: '找点', color: '#e8845a', desc: '题干关键词提取不稳定，找点走位偏移' },
  { name: '提炼转述错误', tag: '提炼', color: '#4a90d9', desc: '要点提炼角度偏离材料核心意图' },
  { name: '对策推导错误', tag: '对策', color: '#4caf74', desc: '对策内容空泛无力，无法紧扣题意' },
  { name: '公文结构错误', tag: '公文', color: '#9b6fcc', desc: '公文格式套用不当，文种混淆' },
  { name: '作文立意错误', tag: '立意', color: '#e0a020', desc: '作文立意方向模糊或出现跑题' },
  { name: '作文逻辑不清晰', tag: '论述', color: '#64b0c8', desc: '论述内容堆砌材料，逻辑层次弱' },
  { name: '作文表达不流畅', tag: '输出', color: '#d94f35', desc: '表达口语化严重，不符合申论语体规范' },
  { name: '分析结构错误', tag: '分析', color: '#6b21a8', desc: '综合分析题不知从何处入手' },
]

// ── Overview ──────────────────────────────────────────────────────────────────

export interface OverviewEvent {
  id: string
  date: string        // yyyy-MM-dd
  startTime: string   // HH:mm
  endTime: string     // HH:mm
  title: string
  type: 'class' | 'meeting'
  teacherName: string
  teacherColor: string
}

export interface TeacherStat {
  name: string
  avatar: string
  color: string
  role: string
  traineeCount: number
  diagnosisCount: number
  subject?: string
  intro?: string
  joinDate?: string
}

export const teacherStats: TeacherStat[] = [
  { name: '李老师', avatar: '李', color: '#e8845a', role: '带教老师', traineeCount: 9,  diagnosisCount: 0, subject: '申论卡点突破', joinDate: '2023-03-01', intro: '专注申论卡点突破辅导，擅长帮助学生识别自身卡点并系统提升，累计带教学生 40+ 人。' },
  { name: '陈老师', avatar: '陈', color: '#9b6fcc', role: '带教老师', traineeCount: 6,  diagnosisCount: 0, subject: '申论写作提升', joinDate: '2023-08-01', intro: '聚焦作文立意与论述结构，擅长帮助学生突破"堆砌"和"偏题"类卡点。' },
  { name: '林老师', avatar: '林', color: '#e0a020', role: '带教老师', traineeCount: 5,  diagnosisCount: 0, subject: '公文与对策专项', joinDate: '2024-01-15', intro: '专注公文写作与对策类题型，对公文格式规范和对策逻辑有深厚积累。' },
  { name: '顾老师', avatar: '顾', color: '#4a90d9', role: '诊断老师', traineeCount: 0,  diagnosisCount: 7, subject: '综合学情诊断', joinDate: '2022-09-01', intro: '擅长学情分析与测评，能快速定位学生卡点类型，为每位学生制定个性化学习路径。' },
  { name: '王老师', avatar: '王', color: '#4caf74', role: '诊断老师', traineeCount: 0,  diagnosisCount: 2, subject: '申论专项诊断', joinDate: '2023-06-15', intro: '申论专项诊断老师，擅长识别学员卡点类型，制定针对性学习路径。' },
  { name: '周老师', avatar: '周', color: '#64b0c8', role: '学管',    traineeCount: 0,  diagnosisCount: 0, subject: '学员全程管理', joinDate: '2022-07-01', intro: '负责学员学习全程跟进与家校沟通，擅长学情预警与家长关系维护。' },
  { name: '赵老师', avatar: '赵', color: '#d94f35', role: '学管',    traineeCount: 0,  diagnosisCount: 0, subject: '学员服务管理', joinDate: '2023-05-10', intro: '负责新学员接待与日常学习跟进，注重学生学习积极性和习惯养成。' },
  { name: '孙校长', avatar: '孙', color: '#6b21a8', role: '校长',    traineeCount: 0,  diagnosisCount: 0, subject: '教学质量督导', joinDate: '2021-01-01', intro: '统筹教学质量与团队建设，关注异常学情并提供整体学习方案指导。' },
]

export const allTeacherEvents: OverviewEvent[] = [
  // ── 李老师 ──
  { id: 'oe1',  date: '2026-03-30', startTime: '09:00', endTime: '10:30', title: '申论课 · 赵同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe2',  date: '2026-03-30', startTime: '14:00', endTime: '15:00', title: '教研组例会',        type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe3',  date: '2026-03-31', startTime: '10:00', endTime: '11:30', title: '申论课 · 张同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe4',  date: '2026-03-31', startTime: '15:00', endTime: '16:00', title: '家长沟通 · 赵同学', type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe5',  date: '2026-04-01', startTime: '09:00', endTime: '10:30', title: '申论课 · 王同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe6',  date: '2026-04-01', startTime: '14:00', endTime: '15:30', title: '申论课 · 陈同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe7',  date: '2026-04-01', startTime: '16:00', endTime: '17:00', title: '备课会议',          type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe8',  date: '2026-04-02', startTime: '10:00', endTime: '11:30', title: '申论课 · 王同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe9',  date: '2026-04-02', startTime: '14:00', endTime: '15:00', title: '教研会议',          type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe10', date: '2026-04-03', startTime: '09:00', endTime: '10:30', title: '申论课 · 张同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe11', date: '2026-04-03', startTime: '14:00', endTime: '15:30', title: '申论课 · 陈同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe12', date: '2026-04-04', startTime: '10:00', endTime: '11:00', title: '一对一复盘',        type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe13', date: '2026-04-07', startTime: '09:00', endTime: '10:30', title: '申论课 · 王同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe14', date: '2026-04-07', startTime: '14:00', endTime: '15:00', title: '家长会',            type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe15', date: '2026-04-08', startTime: '10:00', endTime: '11:30', title: '申论课 · 赵同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe16', date: '2026-04-08', startTime: '15:00', endTime: '16:00', title: '月度教研会',        type: 'meeting', teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe17', date: '2026-04-09', startTime: '09:00', endTime: '10:30', title: '申论课 · 周同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe18', date: '2026-04-09', startTime: '14:00', endTime: '15:30', title: '申论课 · 孙同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe19', date: '2026-04-10', startTime: '08:30', endTime: '10:00', title: '申论课 · 张同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  { id: 'oe20', date: '2026-04-10', startTime: '13:00', endTime: '14:30', title: '申论课 · 王同学',   type: 'class',   teacherName: '李老师', teacherColor: '#e8845a' },
  // ── 顾老师 ──
  { id: 'ge1',  date: '2026-03-30', startTime: '11:00', endTime: '12:00', title: '诊断测评 · 刘同学',  type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge2',  date: '2026-03-31', startTime: '09:00', endTime: '10:00', title: '诊断测评 · 孙同学',  type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge3',  date: '2026-04-01', startTime: '11:00', endTime: '12:00', title: '学情分析会',         type: 'meeting', teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge4',  date: '2026-04-02', startTime: '09:00', endTime: '10:00', title: '诊断测评 · 吴同学',  type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge5',  date: '2026-04-03', startTime: '11:00', endTime: '12:00', title: '复测评估 · 王同学',  type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge6',  date: '2026-04-07', startTime: '10:00', endTime: '11:00', title: '诊断测评 · 新学员A', type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge7',  date: '2026-04-08', startTime: '09:00', endTime: '10:00', title: '诊断测评 · 新学员B', type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge8',  date: '2026-04-09', startTime: '11:00', endTime: '12:00', title: '学情分析会',         type: 'meeting', teacherName: '顾老师', teacherColor: '#4a90d9' },
  { id: 'ge9',  date: '2026-04-10', startTime: '10:30', endTime: '11:30', title: '诊断测评 · 陈同学',  type: 'class',   teacherName: '顾老师', teacherColor: '#4a90d9' },
  // ── 陈老师 ──
  { id: 'ce1',  date: '2026-03-30', startTime: '10:00', endTime: '11:30', title: '申论课 · 周学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce2',  date: '2026-03-31', startTime: '09:00', endTime: '10:30', title: '申论课 · 何学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce3',  date: '2026-04-01', startTime: '15:00', endTime: '16:30', title: '申论课 · 周学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce4',  date: '2026-04-02', startTime: '14:00', endTime: '15:30', title: '申论课 · 何学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce5',  date: '2026-04-03', startTime: '10:00', endTime: '11:30', title: '申论课 · 钱学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce6',  date: '2026-04-07', startTime: '09:00', endTime: '10:30', title: '申论课 · 周学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce7',  date: '2026-04-08', startTime: '14:00', endTime: '15:30', title: '申论课 · 何学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce8',  date: '2026-04-09', startTime: '10:00', endTime: '11:30', title: '申论课 · 钱学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  { id: 'ce9',  date: '2026-04-10', startTime: '09:00', endTime: '10:30', title: '申论课 · 冯学员',   type: 'class',   teacherName: '陈老师', teacherColor: '#9b6fcc' },
  // ── 林老师 ──
  { id: 'le1',  date: '2026-03-30', startTime: '14:30', endTime: '16:00', title: '申论课 · 郑学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  { id: 'le2',  date: '2026-04-01', startTime: '10:00', endTime: '11:30', title: '申论课 · 钱学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  { id: 'le3',  date: '2026-04-02', startTime: '09:00', endTime: '10:30', title: '申论课 · 郑学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  { id: 'le4',  date: '2026-04-03', startTime: '14:00', endTime: '15:30', title: '申论课 · 褚学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  { id: 'le5',  date: '2026-04-07', startTime: '14:00', endTime: '15:30', title: '申论课 · 郑学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  { id: 'le6',  date: '2026-04-09', startTime: '15:00', endTime: '16:30', title: '申论课 · 钱学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  { id: 'le7',  date: '2026-04-10', startTime: '14:00', endTime: '15:30', title: '申论课 · 褚学员',   type: 'class',   teacherName: '林老师', teacherColor: '#e0a020' },
  // ── 周老师 ──
  { id: 'zoe1', date: '2026-03-30', startTime: '11:30', endTime: '12:00', title: '学员跟进 · 陈同学', type: 'meeting', teacherName: '周老师', teacherColor: '#64b0c8' },
  { id: 'zoe2', date: '2026-03-31', startTime: '16:00', endTime: '17:00', title: '家长沟通 · 赵同学', type: 'meeting', teacherName: '周老师', teacherColor: '#64b0c8' },
  { id: 'zoe3', date: '2026-04-02', startTime: '11:00', endTime: '12:00', title: '新学员接待',        type: 'meeting', teacherName: '周老师', teacherColor: '#64b0c8' },
  { id: 'zoe4', date: '2026-04-07', startTime: '11:00', endTime: '12:00', title: '学员月度跟进会',    type: 'meeting', teacherName: '周老师', teacherColor: '#64b0c8' },
  { id: 'zoe5', date: '2026-04-08', startTime: '16:00', endTime: '17:00', title: '家长开放日准备会',  type: 'meeting', teacherName: '周老师', teacherColor: '#64b0c8' },
  { id: 'zoe6', date: '2026-04-10', startTime: '16:00', endTime: '17:00', title: '学员跟进 · 吴同学', type: 'meeting', teacherName: '周老师', teacherColor: '#64b0c8' },
]

// ── Scheduling students (排课用学生列表) ──────────────────────────────────────

export interface SchedulingStudent {
  id: string
  name: string
  avatar: string
  color: string
  currentChapter: string
  kpoint: string            // 当前所在卡点
  joinDate: string
  sessionCount: number
  totalHours: number
  teacherName: string       // 带教老师
  diagnosisTeacher?: string // 诊断老师
}

export const schedulingStudents: SchedulingStudent[] = [
  // 李老师带教 (3人)
  { id: 's1', name: '王同学', avatar: '王', color: '#E8845A', currentChapter: '游走式找点 · DAY6 刷题', kpoint: '游走式找点', joinDate: '2025-09-01', sessionCount: 24, totalHours: 48, teacherName: '李老师', diagnosisTeacher: '顾老师' },
  { id: 's2', name: '张同学', avatar: '张', color: '#F0CDBB', currentChapter: '提炼转述错误 · DAY6 刷题+背诵规范词',   kpoint: '提炼转述错误', joinDate: '2025-11-10', sessionCount: 16, totalHours: 32, teacherName: '李老师', diagnosisTeacher: '顾老师' },
  { id: 's3', name: '陈同学', avatar: '陈', color: '#E6F1FB', currentChapter: '对策推导错误 · DAY7 考试',           kpoint: '对策推导错误', joinDate: '2025-07-15', sessionCount: 30, totalHours: 60, teacherName: '李老师', diagnosisTeacher: '王老师' },
  // 陈老师带教 (3人)
  { id: 's4', name: '刘同学', avatar: '刘', color: '#9b6fcc', currentChapter: '分析结构错误 · DAY1 1V1共识课',           kpoint: '分析结构错误', joinDate: '2026-03-25', sessionCount: 2,  totalHours: 4,  teacherName: '陈老师', diagnosisTeacher: '顾老师' },
  { id: 's5', name: '赵同学', avatar: '赵', color: '#D94F35', currentChapter: '公文结构错误 · DAY5 刷题', kpoint: '公文结构错误', joinDate: '2025-10-01', sessionCount: 20, totalHours: 40, teacherName: '陈老师', diagnosisTeacher: '顾老师' },
  { id: 's6', name: '孙同学', avatar: '孙', color: '#e0a020', currentChapter: '作文立意错误 · DAY3 1V1纠偏课',       kpoint: '作文立意错误', joinDate: '2025-08-20', sessionCount: 26, totalHours: 52, teacherName: '陈老师', diagnosisTeacher: '王老师' },
  // 林老师带教 (3人)
  { id: 's7', name: '吴同学', avatar: '吴', color: '#64b0c8', currentChapter: '作文逻辑不清晰 · DAY5 刷题+论据背诵',   kpoint: '作文逻辑不清晰', joinDate: '2025-09-15', sessionCount: 18, totalHours: 36, teacherName: '林老师', diagnosisTeacher: '顾老师' },
  { id: 's8', name: '周同学', avatar: '周', color: '#4caf74', currentChapter: '作文表达不流畅 · DAY1 1V1共识课',           kpoint: '作文表达不流畅', joinDate: '2026-03-20', sessionCount: 3,  totalHours: 6,  teacherName: '林老师', diagnosisTeacher: '顾老师' },
  { id: 's9', name: '郑同学', avatar: '郑', color: '#4a90d9', currentChapter: '游走式找点 · DAY5 刷题', kpoint: '游走式找点', joinDate: '2025-10-10', sessionCount: 22, totalHours: 44, teacherName: '林老师', diagnosisTeacher: '王老师' },
]

// ── Kpoint delivery records (卡点交付记录) ────────────────────────────────────
export type KpointDeliveryStatus = 'not_started' | 'in_progress' | 'completed'

export interface KpointDeliveryRecord {
  studentId: string
  studentName: string
  kpoint: string
  color: string
  status: KpointDeliveryStatus
  teacherName: string
}

// ── Student exam plans (考试节点) ────────────────────────────────────────────
export type RiskLevel = 'high' | 'medium' | 'low'

export interface StudentExamPlan {
  studentId: string
  studentName: string
  avatar: string
  color: string
  examDate: string          // yyyy-MM-dd
  examType: string          // '国考' | '省考'
  totalKpoints: number      // 计划总卡点数
  completedKpoints: number  // 已完成
  /** 最近 4 周每周完成数量（从最早到最近），用于燃尽图 */
  weeklyCompleted: [number, number, number, number]
  riskLevel: RiskLevel
  teacherName: string
}

export const studentExamPlans: StudentExamPlan[] = [
  // ── 省考面试 2026-04-26（联考省考笔试已于3月14日举行，面试约4月下旬）──
  { studentId: 's3', studentName: '陈同学', avatar: '陈', color: '#E6F1FB', examDate: '2026-04-26', examType: '省考面试', totalKpoints: 5, completedKpoints: 2, weeklyCompleted: [0, 1, 1, 0], riskLevel: 'high',   teacherName: '李老师' },
  { studentId: 's5', studentName: '赵同学', avatar: '赵', color: '#D94F35', examDate: '2026-04-26', examType: '省考面试', totalKpoints: 4, completedKpoints: 0, weeklyCompleted: [0, 0, 0, 0], riskLevel: 'high',   teacherName: '陈老师' },
  { studentId: 's8', studentName: '周同学', avatar: '周', color: '#4caf74', examDate: '2026-05-09', examType: '省考面试', totalKpoints: 3, completedKpoints: 0, weeklyCompleted: [0, 0, 0, 0], riskLevel: 'medium', teacherName: '林老师' },
  // ── 国考面试 2026-05-10（国考笔试已于2025-11-30举行，面试约2-5月）──
  { studentId: 's1', studentName: '王同学', avatar: '王', color: '#E8845A', examDate: '2026-05-10', examType: '国考面试', totalKpoints: 4, completedKpoints: 0, weeklyCompleted: [0, 0, 0, 1], riskLevel: 'medium', teacherName: '李老师' },
  { studentId: 's7', studentName: '吴同学', avatar: '吴', color: '#ffe0b2', examDate: '2026-05-10', examType: '国考面试', totalKpoints: 4, completedKpoints: 0, weeklyCompleted: [1, 0, 0, 0], riskLevel: 'medium', teacherName: '林老师' },
  // ── 事业单位统考 2026-09-20（下半年招考）──
  { studentId: 's4', studentName: '刘同学', avatar: '刘', color: '#b5d5f5', examDate: '2026-09-20', examType: '事业单位统考', totalKpoints: 2, completedKpoints: 0, weeklyCompleted: [0, 0, 0, 0], riskLevel: 'low',    teacherName: '陈老师' },
  // ── 2027届联考省考 2027-03-14（预计，以各省公告为准）──
  { studentId: 's2', studentName: '张同学', avatar: '张', color: '#F0CDBB', examDate: '2027-03-14', examType: '2027届联考省考', totalKpoints: 3, completedKpoints: 1, weeklyCompleted: [0, 1, 0, 0], riskLevel: 'low',    teacherName: '李老师' },
  { studentId: 's6', studentName: '孙同学', avatar: '孙', color: '#c8e6c9', examDate: '2027-03-14', examType: '2027届联考省考', totalKpoints: 3, completedKpoints: 1, weeklyCompleted: [1, 0, 0, 0], riskLevel: 'low',    teacherName: '陈老师' },
  { studentId: 's9', studentName: '郑同学', avatar: '郑', color: '#e1bee7', examDate: '2027-03-14', examType: '2027届联考省考', totalKpoints: 3, completedKpoints: 0, weeklyCompleted: [0, 0, 0, 0], riskLevel: 'low',    teacherName: '林老师' },
]

export const kpointDeliveries: KpointDeliveryRecord[] = [
  // 王同学 (s1) — 游走式找点 进行中，提炼转述错误 未开始
  { studentId: 's1', studentName: '王同学', kpoint: '游走式找点', color: '#e8845a', status: 'in_progress', teacherName: '李老师' },
  { studentId: 's1', studentName: '王同学', kpoint: '提炼转述错误', color: '#4a90d9', status: 'not_started', teacherName: '李老师' },
  // 张同学 (s2) — 提炼转述错误 进行中
  { studentId: 's2', studentName: '张同学', kpoint: '提炼转述错误', color: '#4a90d9', status: 'in_progress', teacherName: '李老师' },
  // 陈同学 (s3) — 游走式找点、提炼转述错误 已完成，对策推导错误 进行中
  { studentId: 's3', studentName: '陈同学', kpoint: '游走式找点', color: '#e8845a', status: 'completed',   teacherName: '李老师' },
  { studentId: 's3', studentName: '陈同学', kpoint: '提炼转述错误', color: '#4a90d9', status: 'completed',   teacherName: '李老师' },
  { studentId: 's3', studentName: '陈同学', kpoint: '对策推导错误', color: '#4caf74', status: 'in_progress', teacherName: '李老师' },
  // 刘同学 (s4) — 分析结构错误 进行中（刚开始）
  { studentId: 's4', studentName: '刘同学', kpoint: '分析结构错误', color: '#6b21a8', status: 'in_progress', teacherName: '陈老师' },
  // 赵同学 (s5) — 公文结构错误 进行中
  { studentId: 's5', studentName: '赵同学', kpoint: '公文结构错误', color: '#9b6fcc', status: 'in_progress', teacherName: '陈老师' },
  // 孙同学 (s6) — 游走式找点 已完成，作文立意错误 进行中
  { studentId: 's6', studentName: '孙同学', kpoint: '游走式找点', color: '#e8845a', status: 'completed',   teacherName: '陈老师' },
  { studentId: 's6', studentName: '孙同学', kpoint: '作文立意错误', color: '#e0a020', status: 'in_progress', teacherName: '陈老师' },
  // 吴同学 (s7) — 作文逻辑不清晰 进行中
  { studentId: 's7', studentName: '吴同学', kpoint: '作文逻辑不清晰', color: '#64b0c8', status: 'in_progress', teacherName: '林老师' },
  // 周同学 (s8) — 作文表达不流畅 进行中（刚开始）
  { studentId: 's8', studentName: '周同学', kpoint: '作文表达不流畅', color: '#d94f35', status: 'in_progress', teacherName: '林老师' },
  // 郑同学 (s9) — 游走式找点 进行中，提炼转述错误 未开始
  { studentId: 's9', studentName: '郑同学', kpoint: '游走式找点', color: '#e8845a', status: 'in_progress', teacherName: '林老师' },
  { studentId: 's9', studentName: '郑同学', kpoint: '提炼转述错误', color: '#4a90d9', status: 'not_started', teacherName: '林老师' },
]

// ── Kpoint blockage data (交付堵点) ──────────────────────────────────────────
export interface BlockageItem {
  studentName: string
  avatar: string
  color: string
  kpoint: string
  detail: string
  teacherName: string
}

export const blockageData = {
  /** 未开始：卡点已分配但未启动 */
  notStarted: [
    { studentName: '王同学', avatar: '王', color: '#E8845A', kpoint: '提炼转述错误', detail: '游走式找点尚未完成，等待衔接', teacherName: '李老师' },
    { studentName: '郑同学', avatar: '郑', color: '#e1bee7', kpoint: '提炼转述错误', detail: '游走式找点尚未完成，等待衔接', teacherName: '林老师' },
  ] as BlockageItem[],
  /** 学习中 → 待老师处理 */
  pendingTeacher: [
    { studentName: '王同学', avatar: '王', color: '#E8845A', kpoint: '游走式找点', detail: '卡点练习题已提交，等待批改',     teacherName: '李老师' },
    { studentName: '陈同学', avatar: '陈', color: '#9ab8c8', kpoint: '对策推导错误', detail: '卡点考试已提交，等待批改',       teacherName: '李老师' },
    { studentName: '赵同学', avatar: '赵', color: '#D94F35', kpoint: '公文结构错误', detail: '入学诊断已提交，等待老师反馈',   teacherName: '陈老师' },
    { studentName: '吴同学', avatar: '吴', color: '#64b0c8', kpoint: '作文逻辑不清晰', detail: '整卷批改提交中，等待审阅',       teacherName: '林老师' },
  ] as BlockageItem[],
  /** 学习中 → 作业/反馈未完成 */
  pendingAssignment: [
    { studentName: '张同学', avatar: '张', color: '#F0CDBB', kpoint: '提炼转述错误', detail: '匹配方法课后作业未提交',         teacherName: '李老师' },
    { studentName: '刘同学', avatar: '刘', color: '#b5d5f5', kpoint: '分析结构错误', detail: '开课共识练习作业未完成',         teacherName: '陈老师' },
    { studentName: '孙同学', avatar: '孙', color: '#c8e6c9', kpoint: '作文立意错误', detail: '一对一纠偏课后作业未提交',       teacherName: '陈老师' },
  ] as BlockageItem[],
  /** 已学未过：完成学习但考试不达标 */
  learnedNotPassed: [
    { studentName: '周同学', avatar: '周', color: '#4caf74', kpoint: '作文表达不流畅', detail: '初测 58 分，未达及格线（70分）', teacherName: '林老师' },
    { studentName: '郑同学', avatar: '郑', color: '#e1bee7', kpoint: '游走式找点', detail: '卡点考试 61 分，需补测',         teacherName: '林老师' },
  ] as BlockageItem[],
  /** 正常推进（无堵点，仅用于合计） */
  activeCount: 2,
  /** 已完成 */
  completedCount: 3,
}

// ── 分析维度数据 ──────────────────────────────────────────────────────────────
/** 每位学生距上次活跃（上课/交作业）天数 */
export const studentLastActiveDays: Record<string, number> = {
  's1': 5, 's2': 1, 's3': 4, 's4': 7, 's5': 2,
  's6': 1, 's7': 3, 's8': 6, 's9': 2,
}

/** 各卡点类型统计 */
export interface KpointTypeStat {
  kpointType: string
  avgCompletionDays: number   // 平均完成周期（天）
  blockageCount: number       // 当前积压数
  totalCount: number          // 在训学员数
  passRate: number            // 通过率 0-100（高≥80 中50-79 低<50）
  recurrenceRate: number      // 复发率 0-100（通过后再次卡住的比例）
  avgFeedbackScore: number    // 近30天平均用户反馈分（1-5分）
  learningCount: number       // 近30天学习人次
}

export const kpointTypeStats: KpointTypeStat[] = [
  //                                                                                   passRate recur  feedback  count
  { kpointType: '游走式找点', avgCompletionDays: 18, blockageCount: 3, totalCount: 5, passRate: 83, recurrenceRate: 15, avgFeedbackScore: 3.6, learningCount: 47 },
  { kpointType: '提炼转述错误', avgCompletionDays: 24, blockageCount: 4, totalCount: 5, passRate: 45, recurrenceRate: 30, avgFeedbackScore: 3.1, learningCount: 53 },
  { kpointType: '对策推导错误', avgCompletionDays: 15, blockageCount: 1, totalCount: 2, passRate: 88, recurrenceRate:  8, avgFeedbackScore: 4.3, learningCount: 38 },
  { kpointType: '分析结构错误', avgCompletionDays: 30, blockageCount: 2, totalCount: 2, passRate: 38, recurrenceRate: 42, avgFeedbackScore: 2.7, learningCount: 11 },
  { kpointType: '公文结构错误', avgCompletionDays: 12, blockageCount: 1, totalCount: 2, passRate: 85, recurrenceRate:  5, avgFeedbackScore: 4.6, learningCount: 65 },
  { kpointType: '作文立意错误', avgCompletionDays: 21, blockageCount: 1, totalCount: 2, passRate: 62, recurrenceRate: 20, avgFeedbackScore: 4.2, learningCount: 29 },
  { kpointType: '作文逻辑不清晰', avgCompletionDays: 26, blockageCount: 2, totalCount: 2, passRate: 48, recurrenceRate: 35, avgFeedbackScore: 4.1, learningCount: 44 },
  { kpointType: '作文表达不流畅', avgCompletionDays: 32, blockageCount: 2, totalCount: 2, passRate: 30, recurrenceRate: 45, avgFeedbackScore: 2.4, learningCount: 22 },
]

// ── 老师维度通过率统计 ────────────────────────────────────────────────────────
export interface TeacherPassRateStat {
  teacherName: string
  passRate: number
  avgFeedbackScore: number
  avgCompletionDays: number
  studentCount: number
  color: string
}

export const teacherPassRates: TeacherPassRateStat[] = [
  { teacherName: '李老师', passRate: 72, avgFeedbackScore: 3.8, avgCompletionDays: 18, studentCount: 3, color: '#e8845a' },
  { teacherName: '陈老师', passRate: 58, avgFeedbackScore: 3.5, avgCompletionDays: 22, studentCount: 3, color: '#9b6fcc' },
  { teacherName: '林老师', passRate: 45, avgFeedbackScore: 3.3, avgCompletionDays: 28, studentCount: 3, color: '#e0a020' },
]

// ── 考试周期通过率统计 ────────────────────────────────────────────────────────
export interface ExamCycleStat {
  label: string
  passRate: number
  avgFeedbackScore: number
  avgCompletionDays: number
  studentCount: number
}

export const examCycleStats: ExamCycleStat[] = [
  { label: '<60天',     passRate: 42, avgFeedbackScore: 3.2, avgCompletionDays: 12, studentCount: 3 },
  { label: '60–180天',  passRate: 65, avgFeedbackScore: 3.7, avgCompletionDays: 20, studentCount: 2 },
  { label: '>180天',    passRate: 55, avgFeedbackScore: 3.5, avgCompletionDays: 25, studentCount: 4 },
]

// ── 变量相关性 ────────────────────────────────────────────────────────────────
export interface VariableCorrelation {
  variable: string
  category: string
  passRateCorr: number   // -1 ~ 1，正 = 正相关通过率
  feedbackCorr: number   // -1 ~ 1，正 = 正相关反馈分
  cycleCorr: number      // -1 ~ 1，正 = 周期更长
}

export const variableCorrelations: VariableCorrelation[] = [
  { variable: '用户基础水平',      category: '用户属性', passRateCorr:  0.72, feedbackCorr:  0.45, cycleCorr: -0.55 },
  { variable: '考试时间远近',      category: '用户属性', passRateCorr: -0.38, feedbackCorr: -0.18, cycleCorr: -0.68 },
  { variable: '用户参数分型',      category: '用户属性', passRateCorr:  0.51, feedbackCorr:  0.38, cycleCorr: -0.42 },
  { variable: '老师差异',          category: '教学因素', passRateCorr:  0.65, feedbackCorr:  0.58, cycleCorr: -0.47 },
  { variable: '交付频率/干预次数', category: '教学因素', passRateCorr:  0.68, feedbackCorr:  0.42, cycleCorr: -0.61 },
  { variable: '反馈质量',          category: '教学因素', passRateCorr:  0.55, feedbackCorr:  0.82, cycleCorr: -0.38 },
  { variable: '完成速度',          category: '学习行为', passRateCorr:  0.44, feedbackCorr:  0.22, cycleCorr: -0.78 },
  { variable: '作业提交完整度',    category: '学习行为', passRateCorr:  0.73, feedbackCorr:  0.48, cycleCorr: -0.52 },
  { variable: '按标准路径推进',    category: '学习行为', passRateCorr:  0.69, feedbackCorr:  0.51, cycleCorr: -0.65 },
  { variable: '卡点类型差异',      category: '内容因素', passRateCorr:  0.42, feedbackCorr:  0.28, cycleCorr:  0.45 },
]

// ─────────────────────────────────────────────────────────────────────────────
// 卡点内容库
// 说明：
//   - 每个卡点包含：理论课（录播）/ 刷题训练（可分配给学生）/ 考试题目 / 1v1共识课 / 1v1纠错课
//   - 只有1v1共识课和1v1纠错课需要上传腾讯会议链接（在排课模块处理）
//   - videoId 为保利威视频 ID；handoutPdf / analysisPdf 为文件名
//   - 7个待补充卡点仅建框架，具体视频/讲义待后续填入
// ─────────────────────────────────────────────────────────────────────────────
export const checkpointContents: CheckpointContent[] = [
  {
    id: 'cp1',
    name: '作文逻辑不清晰',
    // ── 理论课（录播）──
    theoryVideoId: '1e6eaa05af2e0e1fba3b74c3bc3b0caa_1',
    theoryHandoutPdf: '理论课论证思路不合理讲义.pdf',
    // ── 考试题目 ──
    examTitle: '科技是这个时代最大的公益',
    examVideoId: '1e6eaa05af8d3a8b562c73baf58c0ec3_1',
    examHandoutPdf: '考试题目科技是这个时代最大的公益讲义.pdf',
    examAnalysisPdf: '考试题目科技是这个时代最大公益解析.pdf',
    // ── 训练动作（最小训练单元）──
    practiceQuestions: [
      { id: 'cp1_q1', selectionType: 'manual',  title: '明确论证顺序的方法' },
      { id: 'cp1_q2', selectionType: 'manual',  title: '明确论证要素分类的方法+书写的组合形式' },
      { id: 'cp1_q3', selectionType: 'default', title: '明确论证形成闭环的前提条件（论据与论点的关联性）' },
      { id: 'cp1_q4', selectionType: 'default', title: '明确知道论据选择的方法+明确不同字数情况下论据的表达方式，能够书写出来' },
      { id: 'cp1_q5', selectionType: 'default', title: '明确论证力度加强的各类情形' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题+论据背诵', 'DAY5 刷题+论据背诵', 'DAY6 刷题+论据背诵', 'DAY7 考试'],
    learningObjectives: [
      '明确论证顺序的方法',
      '明确论证要素分类的方法+书写的组合形式',
      '明确论证形成闭环的前提条件（论据与论点的关联性）',
      '明确知道论据选择的方法+明确不同字数情况下论据的表达方式，能够书写出来',
    ],
  },
  {
    id: 'cp2',
    name: '游走式找点',
    practiceQuestions: [
      { id: 'cp2_q1', selectionType: 'manual',  title: '掌握正确的阅读认知【要点的构成、评分标准、阅读习惯】' },
      { id: 'cp2_q2', selectionType: 'manual',  title: '判断题干+材料中关于主体的信息' },
      { id: 'cp2_q3', selectionType: 'manual',  title: '判断题干+材料中关于主题的信息' },
      { id: 'cp2_q4', selectionType: 'manual',  title: '判断题干+材料要素一致性【材料直给的要素能识别】' },
      { id: 'cp2_q5', selectionType: 'default', title: '判断材料信息主次关系+划分材料层级+根据层级取舍+规划要点字数' },
      { id: 'cp2_q6', selectionType: 'default', title: '判断段落间的总分关系+定位总结性的信息' },
      { id: 'cp2_q7', selectionType: 'default', title: '掌握材料分类依据、规则+方法' },
      { id: 'cp2_q8', selectionType: 'weak',    title: '明确掌握基础词性（主谓宾、定状补；感情色彩）' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题', 'DAY5 刷题', 'DAY6 刷题', 'DAY7 考试'],
    learningObjectives: [
      '明确正确的阅读方法+纠正错误的阅读认知（小题和作文）',
      '理解各作答要素的含义+书写形式+明确能准确判断材料与作答要素是否有关联的方法，达到能够识别要素的目的',
      '明确如何从材料中找总结性的信息的方法',
      '明确掌握如何自行在学习过程中积累规范词（包括政治素养常识词汇）高频词库',
      '明确从材料的总结性信息中写出前置词的方法',
      '明确关键词的分类方法（零散材料）+选取的优先级',
      '明确从题干中精准识别分类数量要求的方法，达到明确题干分类数量的目的',
      '明确要点取舍的相关方法，合理规划每个要点的字数',
      '明确从材料的信息中写出关键词的方法',
      '明确总括句的概念+书写总括句的判断依据，达到明确总括句的材料来源定位，知道什么时候写，什么时候不写',
    ],
  },
  {
    id: 'cp3',
    name: '提炼转述错误',
    practiceQuestions: [
      { id: 'cp3_q1', selectionType: 'default', title: '总结每一句的主要信息+分析句子间主要信息的共性=得出本段的主旨' },
      { id: 'cp3_q2', selectionType: 'default', title: '根据本段的主旨匹配规范表述的短语或词语进行精准描述形成前置词、关键词' },
      { id: 'cp3_q3', selectionType: 'default', title: '判断题干+材料要素一致性【特定表述方式匹配、情感色彩判断】' },
      { id: 'cp3_q4', selectionType: 'weak',    title: '明确掌握基础词性（主谓宾、定状补；感情色彩）' },
      { id: 'cp3_q5', selectionType: 'manual',  title: '掌握正确的阅读认知【要点的构成、评分标准、阅读习惯】' },
      { id: 'cp3_q6', selectionType: 'manual',  title: '判断题干+材料中关于主体的信息' },
      { id: 'cp3_q7', selectionType: 'manual',  title: '判断题干+材料中关于主题的信息' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题+背诵规范词', 'DAY5 刷题+背诵规范词', 'DAY6 刷题+背诵规范词', 'DAY7 考试'],
    learningObjectives: [
      '明确正确的阅读方法+纠正错误的阅读认知（小题和作文）',
      '明确掌握如何自行在学习过程中积累规范词（包括政治素养常识词汇）高频词库',
      '明确抽象总结及转述材料的方法',
    ],
  },
  {
    id: 'cp4',
    name: '对策推导错误',
    practiceQuestions: [
      { id: 'cp4_q1', selectionType: 'manual',  title: '明确题干中关于对应性要求的识别方法，理解对应性要求的含义+明确对应书写的逻辑，达成一一对应的答题框架' },
      { id: 'cp4_q2', selectionType: 'default', title: '明确识别对策来源+推导对策的方法' },
      { id: 'cp4_q3', selectionType: 'default', title: '积累对策库+背诵检查闭环' },
      { id: 'cp4_q4', selectionType: 'manual',  title: '明确判断针对性、可操作性、可行性的方法，达到能自行判断' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题+常规对策积累', 'DAY5 刷题+常规对策积累', 'DAY6 刷题+常规对策积累', 'DAY7 考试'],
    learningObjectives: [
      '明确题干中关于对应性要求的识别方法，理解对应性要求的含义+明确对应书写的逻辑，达成一一对应的答题框架',
      '明确推导对策的方法+积累（包含字数的详细程度）',
      '明确判断各类边界的方法，达到能自行判断',
    ],
  },
  {
    id: 'cp5',
    name: '分析结构错误',
    practiceQuestions: [
      { id: 'cp5_q1', selectionType: 'default', title: '解释型分析的判定方法+开头写法' },
      { id: 'cp5_q2', selectionType: 'default', title: '结尾的判断方法+书写方法' },
      { id: 'cp5_q3', selectionType: 'manual',  title: '评价型分析的判定方法+开头写法' },
      { id: 'cp5_q4', selectionType: 'manual',  title: '定义型分析的判定方法+开头写法' },
      { id: 'cp5_q5', selectionType: 'manual',  title: '比较型分析的判定方法+开头写法' },
      { id: 'cp5_q6', selectionType: 'manual',  title: '混合型分析的判定方法+开头写法' },
      { id: 'cp5_q7', selectionType: 'manual',  title: '掌握题干分类依据、规则+方法' },
      { id: 'cp5_q8', selectionType: 'weak',    title: '认知分析三段式【书写格式+布局+每段的作用】' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题', 'DAY5 刷题', 'DAY6 刷题', 'DAY7 考试'],
    learningObjectives: [
      '明确根据题干作答任务分析出必要组成部分的方法，达到知道要写哪些组成部分的目的',
      '明确不同组成部分的字数分配原则（涵盖近五年的常见字数分配）',
      '明确书写不同组成部分主线任务的方法（内容+表达方式），达到能够确定不同组成部分主线任务的目的',
    ],
  },
  {
    id: 'cp6',
    name: '公文结构错误',
    practiceQuestions: [
      { id: 'cp6_q1', selectionType: 'default', title: '所有近5年出现过的公文的开头判定方法+书写方法' },
      { id: 'cp6_q2', selectionType: 'default', title: '所有近5年出现过的公文的结尾判定方法+书写方法' },
      { id: 'cp6_q3', selectionType: 'default', title: '所有近5年出现过的公文的语言要求+对应的书写方式' },
      { id: 'cp6_q4', selectionType: 'default', title: '根据题干分析格式的方法' },
      { id: 'cp6_q5', selectionType: 'default', title: '所有近5年出现过的公文的格式要求+对应的书写方式' },
      { id: 'cp6_q6', selectionType: 'manual',  title: '掌握题干分类依据、规则+方法' },
      { id: 'cp6_q7', selectionType: 'weak',    title: '认知公文三段式【书写格式+布局+每段的作用】' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题', 'DAY5 刷题', 'DAY6 刷题', 'DAY7 考试'],
    learningObjectives: [
      '明确根据题干作答任务分析出必要组成部分的方法，达到知道要写哪些组成部分的目的',
      '明确不同组成部分的字数分配原则（涵盖近五年的常见字数分配）',
      '明确书写不同组成部分主线任务的方法（内容+表达方式），达到能够确定不同组成部分主线任务的目的',
      '明确格式正确的书写样式，预占格式书写位置（近五年所有出现过写法）',
      '明确根据题干的提示判定对应的"完整格式的组合"',
      '明确不同语言要求的书写位置和书写方式，达到准确书写（近五年所有出现过的语言要求和书写形式）',
    ],
  },
  {
    id: 'cp7',
    name: '作文立意错误',
    practiceQuestions: [
      { id: 'cp7_q1', selectionType: 'weak',    title: '明确掌握文体基本认识（议论文、策论文是什么、框架写成啥样-书写框架和范式、四要素）' },
      { id: 'cp7_q2', selectionType: 'manual',  title: '明确主题词（话题）识别的方法+优先原则' },
      { id: 'cp7_q3', selectionType: 'manual',  title: '明确如何从材料中找主题词的方法' },
      { id: 'cp7_q4', selectionType: 'manual',  title: '明确角度的判定依据+选取原则' },
      { id: 'cp7_q5', selectionType: 'default', title: '明确题干关键词的拆解方法' },
      { id: 'cp7_q6', selectionType: 'default', title: '明确从材料中确定关键词的方法' },
      { id: 'cp7_q7', selectionType: 'default', title: '明确关键词选择+整合到同一层级的方法' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题', 'DAY5 刷题', 'DAY6 刷题', 'DAY7 考试'],
    learningObjectives: [
      '明确掌握文体基本认识（议论文、策论文是什么、框架写成啥样-书写框架和范式、四要素）',
      '明确如何从材料中找总结性的信息的方法',
      '明确主题词（话题）识别的方法+优先原则',
      '明确正确的阅读方法+纠正错误的阅读认知（小题和作文）',
      '明确掌握如何自行在学习过程中积累规范词高频词库',
      '明确题干关键词的拆解方法',
      '明确从材料中确定关键词的方法',
      '明确关键词选择+整合到同一层级的方法',
      '明确角度的判定依据+选取原则（优先按题干要求，无要求的情况下选自己好写的）',
    ],
  },
  {
    id: 'cp8',
    name: '作文表达不流畅',
    practiceQuestions: [
      { id: 'cp8_q1', selectionType: 'weak',    title: '明确校阅改错的基本方法，达到自主判断并解决语病的目标' },
      { id: 'cp8_q2', selectionType: 'manual',  title: '能够熟练运用各类连接词' },
      { id: 'cp8_q3', selectionType: 'default', title: '明确书面表达的方法+常见表达，达到能够使用书面用语的目的【标题、观点、开头、论证、结尾】' },
    ],
    standardPath: ['DAY1 1V1共识课', 'DAY2 理论录播课', 'DAY3 1V1纠偏课', 'DAY4 刷题+语言积累背诵', 'DAY5 刷题+语言积累背诵', 'DAY6 刷题+语言积累背诵', 'DAY7 考试'],
    learningObjectives: [
      '掌握基本的书写规范，实现语言没有语病',
      '掌握多种修辞手法，提升语言的文采',
    ],
  },
]

/** 每个学生各卡点已分配的刷题 ID 列表
 *  结构：studentId → checkpointId → string[]（已分配题目 ID）
 *  初始值：每位学生在其对应卡点全部题目都分配上 */
export const defaultStudentPracticeAssignments: Record<string, Record<string, string[]>> = {
  s1: { cp2: ['cp2_q5', 'cp2_q6', 'cp2_q7'] },              // 王同学 · 游走式找点（默认勾选）
  s2: { cp3: ['cp3_q1', 'cp3_q2', 'cp3_q3'] },              // 张同学 · 提炼转述错误（默认勾选）
  s3: { cp4: ['cp4_q2', 'cp4_q3'] },                        // 陈同学 · 对策推导错误（默认勾选）
  s4: { cp5: ['cp5_q1', 'cp5_q2'] },                        // 刘同学 · 分析结构错误（默认勾选）
  s5: { cp6: ['cp6_q1', 'cp6_q2', 'cp6_q3', 'cp6_q4', 'cp6_q5'] }, // 赵同学 · 公文结构错误（默认勾选）
  s6: { cp7: ['cp7_q5', 'cp7_q6', 'cp7_q7'] },              // 孙同学 · 作文立意错误（默认勾选）
  s7: { cp1: ['cp1_q3', 'cp1_q4', 'cp1_q5'] },              // 吴同学 · 作文逻辑不清晰（默认勾选）
  s8: { cp8: ['cp8_q3'] },                                   // 郑同学 · 作文表达不流畅（默认勾选）
  s9: { cp2: ['cp2_q5', 'cp2_q6'] },                        // 周同学 · 游走式找点（部分示例）
}
