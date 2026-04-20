export type LearningPathStageKey = 'diagnose' | 'theory' | 'training' | 'exam' | 'report' | 'drill'
export type LearningPathItemStatus = 'done' | 'current' | 'pending'

export interface LearningPathItemDefinition {
  id: string
  title: string
  desc: string
  actionText?: string
  actionType: string
  secondaryActionText?: string
  secondaryActionType?: string
}

export interface LearningPathGroupDefinition {
  title: string
  items: LearningPathItemDefinition[]
}

export interface LearningPathStageDefinition {
  stageKey: LearningPathStageKey
  stageIndex: string
  stageName: string
  stageSubtitle: string
  sectionTitle: string
  groups: LearningPathGroupDefinition[]
}

export interface LearningPathItem extends LearningPathItemDefinition {
  status: LearningPathItemStatus
}

export interface LearningPathGroup {
  title: string
  items: LearningPathItem[]
}

export interface LearningPathStage extends Omit<LearningPathStageDefinition, 'groups'> {
  pointName: string
  currentTaskId: string
  groups: LearningPathGroup[]
}

interface LearningPathStageState {
  completedTaskIds: string[]
}

const DRILL_ITEMS: LearningPathItemDefinition[] = [
  {
    id: 'drill_question',
    title: '题目',
    desc: '查看当前刷题题目 PDF。',
    actionText: '查看题目',
    actionType: 'document',
  },
  {
    id: 'drill_upload',
    title: '上传作业',
    desc: '上传本次刷题作业，支持 PDF 或图片。',
    actionText: '去上传',
    actionType: 'upload',
  },
  {
    id: 'drill_ai_review',
    title: 'AI批改',
    desc: '提交后进入 AI 批改流程。',
    actionText: '查看批改',
    actionType: 'processing',
  },
  {
    id: 'drill_live',
    title: '去上课',
    desc: '进入直播课链接。',
    actionText: '去上课',
    actionType: 'live',
    secondaryActionText: '去提问',
    secondaryActionType: 'askTeacher',
  },
  {
    id: 'drill_replay',
    title: '去回顾',
    desc: '查看直播课回放链接。',
    actionText: '去回顾',
    actionType: 'replay',
  },
  {
    id: 'drill_qa_summary',
    title: '群内答疑总结',
    desc: '查看群内答疑总结。',
    actionText: '查看总结',
    actionType: 'feedback',
  },
]

function buildTrainingRound(roundNumber: number): LearningPathItemDefinition[] {
  const taskPrefix = `training_round_${roundNumber}`
  return [
    {
      id: `${taskPrefix}_question`,
      title: '题目',
      desc: '查看本题实训题目 PDF。',
      actionText: '查看题目',
      actionType: 'document',
    },
    {
      id: `${taskPrefix}_explain_video`,
      title: '视频讲解',
      desc: '查看 PDF 文档及视频链接，并完成课程星级评价。',
      actionText: '看讲解',
      actionType: 'video',
    },
    {
      id: `${taskPrefix}_homework_upload`,
      title: '上传作业',
      desc: '看完视频讲解后提交本题作业，支持 PDF 或图片。',
      actionText: '去上传',
      actionType: 'upload',
    },
    {
      id: `${taskPrefix}_homework_feedback`,
      title: '批改反馈',
      desc: '查看本题作业批改反馈；有疑问可去“找老师”提问。',
      actionText: '查看反馈',
      actionType: 'feedback',
      secondaryActionText: '去提问',
      secondaryActionType: 'askTeacher',
    },
    {
      id: `${taskPrefix}_reflection_upload`,
      title: '学生心得体会',
      desc: '提交本题学习心得体会，支持 PDF 或图片。',
      actionText: '去提交',
      actionType: 'upload',
    },
    {
      id: `${taskPrefix}_reflection_feedback`,
      title: '批改反馈',
      desc: '查看本题心得体会批改反馈。',
      actionText: '查看反馈',
      actionType: 'feedback',
    },
  ]
}

const TRAINING_ROUND_ITEMS = [1, 2, 3].flatMap((roundNumber) => buildTrainingRound(roundNumber))

function buildTheoryRound(roundNumber: number): LearningPathGroupDefinition {
  const label = `第 ${roundNumber} 轮`
  return {
    title: label,
    items: [
      {
        id: `theory_round_${roundNumber}_handout`,
        title: '课前讲义',
        desc: `${label}下载课前讲义 PDF。`,
        actionText: '查看讲义',
        actionType: 'document',
      },
      {
        id: `theory_round_${roundNumber}_recorded`,
        title: '理论课',
        desc: `${label}观看理论课录播，返回后可选星级评价。`,
        actionText: '看录播',
        actionType: 'video',
        secondaryActionText: '找老师',
        secondaryActionType: 'askTeacher',
      },
      {
        id: `theory_round_${roundNumber}_homework_pdf`,
        title: '课后作业',
        desc: `${label}下载课后作业 PDF。`,
        actionText: '下载作业',
        actionType: 'document',
      },
      {
        id: `theory_round_${roundNumber}_explain_video`,
        title: '视频讲解',
        desc: `${label}观看视频讲解，返回后可选星级评价。`,
        actionText: '看讲解',
        actionType: 'video',
      },
    ],
  }
}

const THEORY_ROUND_GROUPS = [1, 2, 3].map((roundNumber) => buildTheoryRound(roundNumber))

export const LEARNING_PATH_STAGE_ORDER: LearningPathStageKey[] = ['diagnose', 'theory', 'training', 'exam', 'report', 'drill']

export const LEARNING_PATH_STAGE_DEFINITIONS: Record<LearningPathStageKey, LearningPathStageDefinition> = {
  diagnose: {
    stageKey: 'diagnose',
    stageIndex: '1 / 6',
    stageName: '诊断',
    stageSubtitle: '按顺序完成诊断群、电话沟通、诊断试卷、解析课、1v1诊断、回顾和报告。',
    sectionTitle: '诊断路径',
    groups: [
      {
        title: '诊断路径',
        items: [
          { id: 'diagnose_group', title: '诊断群', desc: '点击加入诊断群，接收老师安排和后续通知。', actionText: '去加群', actionType: 'group' },
          { id: 'diagnose_schedule', title: '电话沟通', desc: '自己选择老师可预约时间，确认当前问题和学习目标。', actionText: '预约时间', actionType: 'schedule' },
          { id: 'diagnose_paper', title: '诊断试卷', desc: '先完成诊断试卷，帮助老师判断当前卡点。', actionText: '查看试卷', actionType: 'document' },
          { id: 'diagnose_analysis_video', title: '听解析课', desc: '查看解析课内容，了解本卡点常见失分原因。', actionText: '去学习', actionType: 'video' },
          { id: 'diagnose_live', title: '1v1诊断：去上课', desc: '进入 1v1 诊断直播课链接。', actionText: '去上课', actionType: 'live' },
          { id: 'diagnose_feedback', title: '课后反馈', desc: '查看老师给你的本次诊断反馈。', actionText: '查看反馈', actionType: 'feedback' },
          { id: 'diagnose_replay', title: '去回顾', desc: '查看直播课回放链接。', actionText: '去回顾', actionType: 'replay' },
          { id: 'diagnose_report', title: '报告', desc: '查看诊断报告和后续学习建议。', actionText: '查看报告', actionType: 'report' },
        ],
      },
    ],
  },
  theory: {
    stageKey: 'theory',
    stageIndex: '2 / 6',
    stageName: '理论',
    stageSubtitle: '按“课前讲义—理论课—课后作业—视频讲解”循环学习多轮，完成后再上传思维导图。',
    sectionTitle: '理论路径',
    groups: [
      ...THEORY_ROUND_GROUPS,
      {
        title: '思维导图',
        items: [
          { id: 'theory_mindmap_upload', title: '上传思维导图', desc: '支持上传 PDF 或照片，可反复重新上传。', actionText: '去上传', actionType: 'upload' },
        ],
      },
    ],
  },
  training: {
    stageKey: 'training',
    stageIndex: '3 / 6',
    stageName: '实训',
    stageSubtitle: '按 3 轮完成“题目、视频讲解、上传作业、批改反馈/去提问、学生心得体会、批改反馈”的实训闭环。',
    sectionTitle: '实训路径',
    groups: [
      {
        title: '实训路径',
        items: [
          { id: 'training_timer', title: '计时器', desc: '设置并开始本次实训计时。', actionType: 'timer' },
          ...TRAINING_ROUND_ITEMS,
        ],
      },
    ],
  },
  exam: {
    stageKey: 'exam',
    stageIndex: '4 / 6',
    stageName: '测试',
    stageSubtitle: '按顺序完成倒计时、题目、上传、讲解、反馈和卡点报告。',
    sectionTitle: '测试路径',
    groups: [
      {
        title: '测试路径',
        items: [
          { id: 'exam_countdown', title: '倒计时显示器', desc: '设置并开始本次测试倒计时。', actionType: 'timer' },
          { id: 'exam_question', title: '题目', desc: '查看当前测试题目 PDF。', actionText: '查看题目', actionType: 'document' },
          { id: 'exam_homework_upload', title: '上传作业', desc: '上传测试作业，支持 PDF 或图片，可重新上传。', actionText: '去上传', actionType: 'upload' },
          { id: 'exam_explain_video', title: '视频讲解', desc: '查看 PDF 文档及视频链接。', actionText: '去学习', actionType: 'video', secondaryActionText: '去提问', secondaryActionType: 'askTeacher' },
          { id: 'exam_feedback', title: '批改反馈', desc: '查看基于作业 PDF 的批改反馈。', actionText: '查看反馈', actionType: 'feedback', secondaryActionText: '去提问', secondaryActionType: 'askTeacher' },
          { id: 'exam_point_report', title: '查看卡点报告', desc: '查看当前卡点测试报告。', actionText: '查看报告', actionType: 'report' },
        ],
      },
    ],
  },
  report: {
    stageKey: 'report',
    stageIndex: '5 / 6',
    stageName: '完成',
    stageSubtitle: '恭喜你完成本次学习。',
    sectionTitle: '学习完成',
    groups: [
      {
        title: '学习完成',
        items: [
          { id: 'report_encourage', title: '恭喜你完成本次学习', desc: '你已经走完了这一阶段的完整训练路径，继续保持复盘和练习节奏，下一次会更稳、更准。', actionText: '我知道了', actionType: 'encourage' },
        ],
      },
    ],
  },
  drill: {
    stageKey: 'drill',
    stageIndex: '6 / 6',
    stageName: '刷题',
    stageSubtitle: '先开启正计时，再按顺序完成题目、上传作业、AI批改、去上课、去回顾、群内答疑总结，最后查看刷题报告总结。',
    sectionTitle: '刷题流程',
    groups: [
      {
        title: '刷题流程',
        items: [
          { id: 'drill_countdown', title: '计时器', desc: '开始本次刷题计时。', actionType: 'timer' },
          ...DRILL_ITEMS,
          { id: 'drill_monthly_report', title: '刷题报告总结', desc: '查看 4 月直播课安排、休息日和注意事项。', actionText: '查看课表', actionType: 'report' },
        ],
      },
    ],
  },
}

const DEFAULT_STAGE_STATE: LearningPathStageState = { completedTaskIds: [] }

const STUDENT_LEARNING_PATH_PROGRESS: Record<string, Partial<Record<LearningPathStageKey, LearningPathStageState>>> = {
  stu_1: {
    diagnose: { completedTaskIds: ['diagnose_group', 'diagnose_schedule', 'diagnose_paper', 'diagnose_analysis_video', 'diagnose_live', 'diagnose_feedback', 'diagnose_replay', 'diagnose_report'] },
    theory: { completedTaskIds: ['theory_round_1_handout', 'theory_round_1_recorded'] },
  },
  stu_2: {
    diagnose: { completedTaskIds: ['diagnose_group', 'diagnose_schedule', 'diagnose_paper', 'diagnose_analysis_video', 'diagnose_live', 'diagnose_feedback', 'diagnose_replay', 'diagnose_report'] },
    theory: { completedTaskIds: ['theory_round_1_handout', 'theory_round_1_recorded', 'theory_round_1_homework_pdf', 'theory_round_1_explain_video', 'theory_round_2_handout', 'theory_round_2_recorded', 'theory_round_2_homework_pdf', 'theory_round_2_explain_video', 'theory_round_3_handout', 'theory_round_3_recorded', 'theory_round_3_homework_pdf', 'theory_round_3_explain_video', 'theory_mindmap_upload'] },
    training: { completedTaskIds: ['training_timer', 'training_round_1_question', 'training_round_1_explain_video', 'training_round_1_homework_upload'] },
  },
  stu_3: {
    diagnose: { completedTaskIds: ['diagnose_group', 'diagnose_schedule', 'diagnose_paper'] },
  },
}

function cloneGroups(groups: LearningPathGroupDefinition[]): LearningPathGroupDefinition[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item })),
  }))
}

export function buildTeacherLearningPathStage(studentId: string, stageKey: LearningPathStageKey, pointName = ''): LearningPathStage {
  const definition = LEARNING_PATH_STAGE_DEFINITIONS[stageKey]
  const stageState = STUDENT_LEARNING_PATH_PROGRESS[studentId]?.[stageKey] ?? DEFAULT_STAGE_STATE
  let currentTaskId = ''
  let currentFound = false

  const groups = cloneGroups(definition.groups).map((group) => ({
    ...group,
    items: group.items.map((item) => {
      if (stageState.completedTaskIds.includes(item.id)) {
        return { ...item, status: 'done' as const }
      }

      if (!currentFound) {
        currentFound = true
        currentTaskId = item.id
        return { ...item, status: 'current' as const }
      }

      return { ...item, status: 'pending' as const }
    }),
  }))

  return {
    ...definition,
    pointName,
    currentTaskId,
    groups,
  }
}

export function getRecommendedLearningPathStage(studentId: string): LearningPathStageKey {
  for (const stageKey of LEARNING_PATH_STAGE_ORDER) {
    const stage = buildTeacherLearningPathStage(studentId, stageKey)
    if (stage.groups.flatMap((group) => group.items).some((item) => item.status !== 'done')) {
      return stageKey
    }
  }

  return 'drill'
}

export function getLearningPathStageSummaryStatus(studentId: string, stageKey: LearningPathStageKey): LearningPathItemStatus {
  const items = buildTeacherLearningPathStage(studentId, stageKey).groups.flatMap((group) => group.items)
  if (items.length > 0 && items.every((item) => item.status === 'done')) return 'done'
  if (items.some((item) => item.status === 'current')) return 'current'
  return 'pending'
}
