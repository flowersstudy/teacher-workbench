import { apiUrl } from './apiBase'

function getToken(): string {
  return localStorage.getItem('teacher_token') ?? ''
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const requestUrl = apiUrl(path)
  const res = await fetch(requestUrl, {
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
    throw new Error(`接口返回了网页而不是 JSON。状态码: ${res.status}，地址: ${requestUrl}`)
  }

  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('teacher_token')
      window.dispatchEvent(new Event('teacher-auth-expired'))
    }

    const message = data && typeof data === 'object' && 'message' in data
      ? String((data as { message?: unknown }).message || '')
      : ''
    throw new Error(message || `接口请求失败：${res.status} ${requestUrl}`)
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
  get:    <T>(path: string)                  => request<T>('GET', path),
  post:   <T>(path: string, body: unknown)   => request<T>('POST', path, body),
  postForm: <T>(path: string, body: FormData) => requestForm<T>('POST', path, body),
  put:    <T>(path: string, body: unknown)   => request<T>('PUT', path, body),
  patch:  <T>(path: string, body: unknown)   => request<T>('PATCH', path, body),
  delete: <T>(path: string)                  => request<T>('DELETE', path),
}
