import type { UploadStatus } from '../types'

export const statusLabels: Record<UploadStatus, string> = {
  preparing: 'Подготовка',
  waiting: 'Ожидает запуска',
  ready: 'Готово',
  cancelled: 'Отменено',
}
