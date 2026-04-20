import { apiUrl } from './apiBase'

function getToken(): string {
  return localStorage.getItem('teacher_token') ?? ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const contentType = res.headers.get('content-type') || ''

  if (contentType.includes('text/html') || text.trim().startsWith('<')) {
    throw new Error(`接口返回了网页，请确认后端服务 http://localhost:3000 已启动，且前端 dev 服务已重启：${path}`)
  }

  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const message = data && typeof data === 'object' && 'message' in data
      ? String((data as { message?: unknown }).message || '')
      : ''
    throw new Error(message || `接口请求失败：${res.status}`)
  }

  return data as T
}

async function requestForm<T>(method: string, path: string, body: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
    body,
  })
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string)                  => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST',   path, body),
  postForm: <T>(path: string, body: FormData) => requestForm<T>('POST', path, body),
  put:    <T>(path: string, body: unknown)   => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown)   => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
}
