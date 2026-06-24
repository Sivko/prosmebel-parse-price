import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@heroui/react'
import { rollbackExcelPrices } from '../lib/api'
import { PRICE_REGION_CONFIG, PRICE_REGIONS, type PriceRegion } from '../lib/price-region'

export function RollbackPage({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const [region, setRegion] = useState<PriceRegion>('MSK')
  const rollbackMutation = useMutation({
    mutationFn: () => rollbackExcelPrices(token, region),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const runRollback = () => {
    const regionLabel = PRICE_REGION_CONFIG[region].label
    if (!window.confirm(`Удалить все Excel-цены для региона «${regionLabel}» (тип ${PRICE_REGION_CONFIG[region].priceTypeId})?`)) {
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
          После восстановления работы 1С можно удалить Excel-цены выбранного региона. Базовые цены Bitrix не изменяются.
        </p>
        <label>
          Регион
          <select value={region} onChange={(event) => setRegion(event.target.value as PriceRegion)}>
            {PRICE_REGIONS.map((item) => (
              <option key={item} value={item}>
                {PRICE_REGION_CONFIG[item].label} (тип {PRICE_REGION_CONFIG[item].priceTypeId})
              </option>
            ))}
          </select>
        </label>
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
