import { api } from '../../../lib/api'
import type { LearningPathStage } from '../config/studentLearningPath'

export interface LearningPathPayload {
  studentId: string
  pointName: string
  updatedAt?: string
  stages: LearningPathStage[]
}

export function fetchStudentLearningPath(studentId: string, pointName: string): Promise<LearningPathPayload> {
  const query = new URLSearchParams({ pointName })
  return api.get<LearningPathPayload>(`/api/teacher/students/${studentId}/learning-path?${query.toString()}`)
}

export function updateStudentLearningPathTask(
  studentId: string,
  taskId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  return api.patch<{ ok: boolean }>(`/api/teacher/students/${studentId}/learning-path/tasks/${taskId}`, data)
}

export async function uploadPdf(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const result = await api.postForm<{ url: string }>('/api/teacher/upload/pdf', form)
  return result.url
}
