export type User = {
  userId: string
  login: string
}

export type UploadStatus = 'preparing' | 'waiting' | 'ready' | 'cancelled'

export type UploadListItem = {
  _id: string
  createdAt: string
  createdByLogin: string
  totalArticles: number
  fileName: string
  status: UploadStatus
  syncedCount: number
  notFoundCount: number
}

export type UploadItem = {
  article: string
  oldPrice: number
  newPrice: number
  found: boolean
}

export type UploadDetails = UploadListItem & {
  sheetName: string
  articleColumn: string
  priceColumn: string
  items: UploadItem[]
}

export type PreviewSheet = {
  name: string
  columns: string[]
  examples: Record<string, string | number>[]
}

export type Preview = {
  fileName: string
  sheets: PreviewSheet[]
}

export type HistoryResponse = {
  dates: string[]
  rows: Array<Record<string, string | number>>
}
