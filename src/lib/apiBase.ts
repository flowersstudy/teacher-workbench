const DEFAULT_API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3000'
const ENV_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '')

export const API_BASE_URL = ENV_API_BASE_URL || DEFAULT_API_BASE_URL

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${API_BASE_URL}${normalizedPath}`
}
