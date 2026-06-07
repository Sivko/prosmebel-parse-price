import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@heroui/react'
import { rollbackExcelPrices } from '../lib/api'

export function RollbackPage({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const rollbackMutation = useMutation({
    mutationFn: () => rollbackExcelPrices(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const runRollback = () => {
    if (!window.confirm('Вы действительно хотите удалить все записи цен, которые экспортировали через excel?')) {
      return
    }

    if (!window.confirm('Точно-точно?')) {
      return
    }

    rollbackMutation.mutate()
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Откат</h1>
      </header>

      <section className="rollback-panel">
        <p>
          После восстановления работы 1С можно просто нажать кнопку, чтобы удалить все цены, которые были выгружены через excel - в этом случае будет работать "Старая логика" отображения цен.
        </p>
        <Button className="primary" onPress={runRollback} isDisabled={rollbackMutation.isPending}>
          {rollbackMutation.isPending ? 'Удаляем...' : 'Запустить удаление'}
        </Button>
      </section>

      {rollbackMutation.error && <div className="error">{rollbackMutation.error.message}</div>}
      {rollbackMutation.data && (
        <div className="success">
          Удалено записей цен: {rollbackMutation.data.deletedCount}
        </div>
      )}
    </section>
  )
}
