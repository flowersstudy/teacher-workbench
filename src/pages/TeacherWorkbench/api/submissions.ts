const BASE = 'http://localhost:3000'

export interface Submission {
  id: string
  student_name: string
  review_type: '入学诊断' | '卡点练习题' | '卡点考试' | '整卷批改' | '二阶试卷'
  checkpoint: string
  deadline: string
  priority: 'urgent' | 'normal' | 'low'
  submitted_normal: number   // 1 = true, 0 = false
  file_name: string
  submitted_at: string
}

const MOCK_SUBMISSIONS: Submission[] = [
  { id: 'rv1', student_name: '张同学', review_type: '入学诊断',  checkpoint: '作文立意错误',   deadline: '今日 12:00', priority: 'urgent', submitted_normal: 1, file_name: '张同学_入学诊断.pdf',    submitted_at: '08:30 提交' },
  { id: 'rv2', student_name: '王同学', review_type: '卡点练习题', checkpoint: '游走式找点',    deadline: '今日 14:00', priority: 'normal', submitted_normal: 1, file_name: '王同学_卡点练习题.pdf',  submitted_at: '09:10 提交' },
  { id: 'rv3', student_name: '陈同学', review_type: '卡点考试',  checkpoint: '对策推导错误',   deadline: '今日 10:00', priority: 'urgent', submitted_normal: 0, file_name: '陈同学_卡点考试.pdf',    submitted_at: '07:45 提交' },
  { id: 'rv4', student_name: '赵同学', review_type: '整卷批改',  checkpoint: '公文结构错误',   deadline: '明日 18:00', priority: 'low',    submitted_normal: 0, file_name: '赵同学_整卷批改.pdf',    submitted_at: '昨天 22:00 提交' },
  { id: 'rv5', student_name: '孙同学', review_type: '卡点练习题', checkpoint: '作文立意错误',   deadline: '今日 16:00', priority: 'normal', submitted_normal: 1, file_name: '孙同学_卡点练习题.pdf',  submitted_at: '09:50 提交' },
  { id: 'rv6', student_name: '吴同学', review_type: '卡点考试',  checkpoint: '作文逻辑不清晰',  deadline: '今日 11:30', priority: 'urgent', submitted_normal: 1, file_name: '吴同学_卡点考试.pdf',    submitted_at: '08:00 提交' },
  { id: 'rv7',  student_name: '郑同学', review_type: '入学诊断',  checkpoint: '作文表达不流畅',  deadline: '今日 18:00', priority: 'low',    submitted_normal: 1, file_name: '郑同学_入学诊断.pdf',    submitted_at: '10:20 提交' },
  { id: 'rv8',  student_name: '周同学', review_type: '整卷批改',  checkpoint: '游走式找点',    deadline: '今日 12:30', priority: 'normal', submitted_normal: 0, file_name: '周同学_整卷批改.pdf',    submitted_at: '07:00 提交' },
  { id: 'rv9',  student_name: '刘同学', review_type: '二阶试卷',  checkpoint: '提炼转述错误',   deadline: '今日 13:00', priority: 'urgent', submitted_normal: 1, file_name: '刘同学_二阶试卷.pdf',    submitted_at: '08:55 提交' },
  { id: 'rv10', student_name: '吴同学', review_type: '二阶试卷',  checkpoint: '分析结构错误',   deadline: '今日 15:00', priority: 'normal', submitted_normal: 1, file_name: '吴同学_二阶试卷.pdf',    submitted_at: '09:30 提交' },
]

export async function fetchSubmissions(): Promise<Submission[]> {
  try {
    const res = await fetch(`${BASE}/api/submissions`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } catch {
    return MOCK_SUBMISSIONS
  }
}

/** Returns a blob URL for the PDF — caller should URL.revokeObjectURL() when done */
export async function fetchSubmissionPdfUrl(id: string): Promise<string> {
  const res = await fetch(`${BASE}/api/submissions/file/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
