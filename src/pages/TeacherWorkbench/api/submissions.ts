import { apiUrl } from '../../../lib/apiBase'

export type ReviewType = '入学诊断' | '卡点练习题' | '卡点考试' | '整卷批改' | '二阶试卷'
export type ReviewPriority = 'urgent' | 'normal' | 'low'

export interface Submission {
  id: string
  student_name: string
  review_type: ReviewType
  checkpoint: string
  deadline: string
  priority: ReviewPriority
  submitted_normal: number
  file_name: string
  submitted_at: string
}

export interface ReviewItem {
  id: string
  name: string
  avatar: string
  color: string
  contactId: string
  reviewType: ReviewType
  checkpoint: string
  submittedAt: string
  deadline: string
  priority: ReviewPriority
  submittedNormal: boolean
}

function getTeacherAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('teacher_token') ?? ''

  return token
    ? { Authorization: `Bearer ${token}` }
    : {}
}

export async function fetchSubmissions(): Promise<Submission[]> {
  const res = await fetch(apiUrl('/api/submissions'), {
    headers: getTeacherAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  return res.json()
}

export async function fetchSubmissionPdfBlob(id: string): Promise<Blob> {
  const res = await fetch(apiUrl(`/api/submissions/file/${id}`), {
    headers: getTeacherAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  return res.blob()
}

export async function fetchSubmissionPdfUrl(id: string): Promise<string> {
  const blob = await fetchSubmissionPdfBlob(id)
  return URL.createObjectURL(blob)
}

export async function uploadReviewedSubmissionPdf(id: string, file: File): Promise<{ reviewedFileName: string }> {
  const body = new FormData()
  body.append('file', file)

  const res = await fetch(apiUrl(`/api/submissions/${id}/review-file`), {
    method: 'POST',
    headers: getTeacherAuthHeaders(),
    body,
  })

  const payload = await res.json()
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || `HTTP ${res.status}`)
  }

  return payload
}
