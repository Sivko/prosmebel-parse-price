import type { HistoryResponse, Preview, RollbackResponse, UploadDetails, UploadListItem, User } from '../types'

export const API_URL = import.meta.env.VITE_API_URL ?? '/api'

export function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function api<T>(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка запроса')
  }

  return response.json() as Promise<T>
}

export async function loginRequest(login: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })

  if (!response.ok) throw new Error('Неверный логин или пароль')
  return response.json() as Promise<{ accessToken: string; user: User }>
}

export function getUploads(token: string) {
  return api<UploadListItem[]>('/uploads', token)
}

export function getUpload(
  token: string,
  id: string,
  params: { page?: number; limit?: number; withProductIdOnly?: boolean } = {},
) {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.withProductIdOnly) searchParams.set('withProductIdOnly', 'true')
  const query = searchParams.toString()

  return api<UploadDetails>(`/uploads/${id}${query ? `?${query}` : ''}`, token)
}

export function startUpload(token: string, id: string) {
  return api<UploadDetails>(`/uploads/${id}/start`, token, { method: 'POST' })
}

export function subscribeUpload(
  token: string,
  id: string,
  onUpload: (upload: UploadDetails) => void,
  onError?: (error: Error) => void,
) {
  const controller = new AbortController()

  void fetch(`${API_URL}/uploads/${id}/events`, {
    headers: authHeaders(token),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        throw new Error(await response.text() || 'Ошибка подключения к прогрессу')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!controller.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split(/\n\n/)
        buffer = messages.pop() ?? ''

        for (const message of messages) {
          const data = message
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('')

          if (data) {
            onUpload(JSON.parse(data) as UploadDetails)
          }
        }
      }
    })
    .catch((error: Error) => {
      if (!controller.signal.aborted) {
        onError?.(error)
      }
    })

  return () => controller.abort()
}

export function getHistory(token: string, query: string) {
  return api<HistoryResponse>(`/history${query ? `?q=${encodeURIComponent(query)}` : ''}`, token)
}

export function getUsers(token: string) {
  return api<Array<{ _id: string; login: string; createdAt: string }>>('/users', token)
}

export function rollbackExcelPrices(token: string) {
  return api<RollbackResponse>('/uploads/rollback', token, { method: 'DELETE' })
}

export function previewUpload(token: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return api<Preview>('/uploads/preview', token, {
    method: 'POST',
    body: formData,
  })
}

export function createUpload(
  token: string,
  params: {
    file: File
    sheetName: string
    articleColumn: string
    priceColumn: string
  },
) {
  const formData = new FormData()
  formData.append('file', params.file)
  formData.append('sheetName', params.sheetName)
  formData.append('articleColumn', params.articleColumn)
  formData.append('priceColumn', params.priceColumn)

  return api<UploadDetails>('/uploads', token, {
    method: 'POST',
    body: formData,
  })
}
