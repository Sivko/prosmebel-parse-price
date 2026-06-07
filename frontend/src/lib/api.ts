import type { HistoryResponse, Preview, UploadDetails, UploadListItem, User } from '../types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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

export function getUpload(token: string, id: string) {
  return api<UploadDetails>(`/uploads/${id}`, token)
}

export function startUpload(token: string, id: string) {
  return api<UploadDetails>(`/uploads/${id}/start`, token, { method: 'POST' })
}

export function getHistory(token: string, query: string) {
  return api<HistoryResponse>(`/history${query ? `?q=${encodeURIComponent(query)}` : ''}`, token)
}

export function getUsers(token: string) {
  return api<Array<{ _id: string; login: string; createdAt: string }>>('/users', token)
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
