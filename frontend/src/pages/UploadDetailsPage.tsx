import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Table } from '@heroui/react'
import { getUpload, startUpload } from '../lib/api'
import { currency, formatDate } from '../lib/format'
import { DataTable } from '../components/DataTable'
import { Info } from '../components/Info'
import { statusLabels } from '../components/statusLabels'

export function UploadDetailsPage({ token, path }: { token: string; path: string }) {
  const queryClient = useQueryClient()
  const id = path.split('/').pop() ?? ''
  const uploadQuery = useQuery({
    queryKey: ['upload', id],
    queryFn: () => getUpload(token, id),
    enabled: Boolean(id),
  })

  const startMutation = useMutation({
    mutationFn: () => startUpload(token, id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['upload', id], updated)
      queryClient.invalidateQueries({ queryKey: ['uploads'] })
    },
  })

  if (uploadQuery.isLoading) return <section className="page">Загрузка...</section>
  if (uploadQuery.error) return <section className="page"><div className="error">{uploadQuery.error.message}</div></section>
  if (!uploadQuery.data) return <section className="page">Загрузка не найдена</section>

  const upload = uploadQuery.data
  const found = upload.items.filter((item) => item.found).length
  const progress = upload.totalArticles ? Math.round((found / upload.totalArticles) * 100) : 0

  return (
    <section className="page">
      <header className="page-header">
        <h1>{upload.fileName}</h1>
        {upload.status === 'waiting' && (
          <Button className="primary" onPress={() => startMutation.mutate()} isDisabled={startMutation.isPending}>
            {startMutation.isPending ? 'Запускаем...' : 'Запустить процесс'}
          </Button>
        )}
      </header>

      {startMutation.error && <div className="error">{startMutation.error.message}</div>}

      <div className="summary-grid">
        <Info label="Дата" value={formatDate(upload.createdAt)} />
        <Info label="Кто запустил" value={upload.createdByLogin} />
        <Info label="Страница" value={upload.sheetName} />
        <Info label="Статус" value={statusLabels[upload.status]} />
        <Info label="Артикулы" value={upload.totalArticles} />
        <Info label="Найдено" value={found} />
        <Info label="Не найдено" value={upload.notFoundCount} />
      </div>

      <div className="progress"><span style={{ width: `${progress}%` }} /></div>

      <DataTable>
        <Table.Header>
          <Table.Column id="article">Артикул</Table.Column>
          <Table.Column id="oldPrice">Старая цена</Table.Column>
          <Table.Column id="newPrice">Новая цена</Table.Column>
          <Table.Column id="history">История изменения цен</Table.Column>
        </Table.Header>
        <Table.Body>
          {upload.items.map((item) => (
            <Table.Row id={item.article} key={item.article}>
              <Table.Cell>{item.article}</Table.Cell>
              <Table.Cell>{item.found ? currency(item.oldPrice) : 'Не найдено'}</Table.Cell>
              <Table.Cell>{currency(item.newPrice)}</Table.Cell>
              <Table.Cell><a target="_blank" href={`/history?q=${encodeURIComponent(item.article)}`}>Открыть</a></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </DataTable>
    </section>
  )
}
