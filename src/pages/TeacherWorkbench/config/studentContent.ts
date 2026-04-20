import type { CheckpointContent } from '../types'

const DEFAULT_PATH = [
  'DAY1 学情沟通',
  'DAY2 理论讲解',
  'DAY3 例题拆解',
  'DAY4 练习巩固',
  'DAY5 反馈纠错',
  'DAY6 强化训练',
  'DAY7 阶段检测',
]

const DEFAULT_OBJECTIVES = [
  '明确当前阶段的学习重点与薄弱项。',
  '完成一轮讲解、练习、反馈、复盘闭环。',
  '把错因沉淀成可重复执行的改进方法。',
]

export function buildSubjectContentConfig(subject: string): CheckpointContent {
  const safeSubject = String(subject || '').trim() || '学习计划'
  const baseId = safeSubject.replace(/\s+/g, '-').toLowerCase() || 'general'

  return {
    id: `subject-${baseId}`,
    name: safeSubject,
    theoryVideoId: '',
    theoryHandoutPdf: '',
    examTitle: `${safeSubject} 阶段检测`,
    examVideoId: '',
    examHandoutPdf: '',
    examAnalysisPdf: '',
    practiceQuestions: [
      { id: `${baseId}-q1`, selectionType: 'default', title: `${safeSubject} 基础巩固` },
      { id: `${baseId}-q2`, selectionType: 'default', title: `${safeSubject} 高频题型练习` },
      { id: `${baseId}-q3`, selectionType: 'manual', title: `${safeSubject} 错题复盘` },
      { id: `${baseId}-q4`, selectionType: 'weak', title: `${safeSubject} 薄弱点强化` },
    ],
    standardPath: DEFAULT_PATH,
    learningObjectives: DEFAULT_OBJECTIVES.map((item, index) =>
      index === 0 ? `${item}（${safeSubject}）` : item,
    ),
  }
}
