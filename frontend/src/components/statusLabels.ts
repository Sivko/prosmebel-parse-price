import type { UploadStatus } from '../types'

export const statusLabels: Record<UploadStatus, string> = {
  preparing: 'Подготовка',
  waiting: 'Ожидает запуска',
  syncing: 'Синхронизация',
  ready: 'Готово',
  failed: 'Ошибка',
  cancelled: 'Отменено',
}
