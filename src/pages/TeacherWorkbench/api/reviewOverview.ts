import { api } from '../../../lib/api'

export interface ReviewProgress {
  entryScore: number | null
  currentScore: number | null
  targetScore: number | null
}

export interface ReviewPointRate {
  pointName: string
  currentRate: number | null
  targetRate: number | null
  sortOrder?: number
  sourceType?: 'diagnosis' | 'monthly_review'
  updatedAt?: string
}

export type ReviewPointStatusValue = 'learning' | 'completed' | 'pending' | 'locked'

export interface ReviewPointStatus {
  pointId: number | null
  pointName: string
  status: ReviewPointStatusValue
}

export interface ReviewOverview {
  targetExam: string | null
  progress: ReviewProgress
  pointRates: ReviewPointRate[]
  pointStatuses?: ReviewPointStatus[]
}

export interface PointLearningDayRecord {
  date: string
  durationSec: number
}

export interface PointLearningSessionRecord {
  date: string
  startedAt?: string
  endedAt?: string
}

export interface PointLearningSummary {
  pointName: string
  courseId: number | null
  totalDurationSec: number
  longestDay: PointLearningDayRecord | null
  earliestSession: PointLearningSessionRecord | null
  latestSession: PointLearningSessionRecord | null
}

export function fetchStudentReviewOverview(studentId: string): Promise<ReviewOverview> {
  return api.get<ReviewOverview>(`/api/teacher/students/${studentId}/review-overview`)
}

export function saveStudentReviewOverview(studentId: string, data: ReviewOverview): Promise<ReviewOverview> {
  return api.put<ReviewOverview>(`/api/teacher/students/${studentId}/review-overview`, data)
}

export function fetchStudentPointLearningSummary(studentId: string, pointName: string): Promise<PointLearningSummary> {
  const query = new URLSearchParams({ pointName })
  return api.get<PointLearningSummary>(`/api/teacher/students/${studentId}/point-learning-summary?${query.toString()}`)
}
