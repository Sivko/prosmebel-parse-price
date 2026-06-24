import { useQuery } from '@tanstack/react-query'
import { Button, Table } from '@heroui/react'
import { getUploads } from '../lib/api'
import { formatDate } from '../lib/format'
import { getRegionShortLabel } from '../lib/price-region'
import { DataTable } from '../components/DataTable'
import { statusLabels } from '../components/statusLabels'

export function UploadsPage({ token, navigate }: { token: string; navigate: (to: string) => void }) {
  const uploadsQuery = useQuery({
    queryKey: ['uploads'],
    queryFn: () => getUploads(token),
  })

  return (
    <section className="page">
      <header className="page-header"><h1>Загрузки</h1></header>
      {uploadsQuery.isLoading && <div>Загрузка...</div>}
      {uploadsQuery.error && <div className="error">{uploadsQuery.error.message}</div>}
      {uploadsQuery.data && (
        <DataTable label="Загрузки">
          <Table.Header>
            <Table.Column id="date" isRowHeader>Дата</Table.Column>
            <Table.Column id="createdBy">Кто запустил</Table.Column>
            <Table.Column id="articles">Кол-во артикулов</Table.Column>
            <Table.Column id="region">Регион</Table.Column>
            <Table.Column id="file">Файл</Table.Column>
            <Table.Column id="status">Статус</Table.Column>
            <Table.Column id="synced">Синхронизировано</Table.Column>
            <Table.Column id="notFound">Не найдено</Table.Column>
            <Table.Column id="actions">Действия</Table.Column>
          </Table.Header>
          <Table.Body>
            {uploadsQuery.data.map((upload) => (
              <Table.Row id={upload._id} key={upload._id}>
                <Table.Cell>{formatDate(upload.createdAt)}</Table.Cell>
                <Table.Cell>{upload.createdByLogin}</Table.Cell>
                <Table.Cell>{upload.totalArticles}</Table.Cell>
                <Table.Cell>{getRegionShortLabel(upload.region)}</Table.Cell>
                <Table.Cell>{upload.fileName}</Table.Cell>
                <Table.Cell><span className="status">{statusLabels[upload.status]}</span></Table.Cell>
                <Table.Cell>{upload.syncedCount}</Table.Cell>
                <Table.Cell>{upload.notFoundCount}</Table.Cell>
                <Table.Cell><Button size="sm" onPress={() => navigate(`/upload/${upload._id}`)}>Перейти</Button></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </DataTable>
      )}
    </section>
  )
}
