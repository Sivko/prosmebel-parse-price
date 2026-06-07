import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Pagination, Table } from '@heroui/react'
import { getUpload, startUpload, subscribeUpload } from '../lib/api'
import { currency, formatDate } from '../lib/format'
import { DataTable } from '../components/DataTable'
import { Info } from '../components/Info'
import { statusLabels } from '../components/statusLabels'

const ITEMS_PER_PAGE = 20

const ADMIN_BASE_URL = (
  import.meta.env.VITE_EXTERNAL_PRICE_API_URL ??
  import.meta.env.EXTERNAL_PRICE_API_URL ??
  'https://prosmebel.limpopo113.ru'
).replace(/\/+$/, '')

function getAdminProductUrl(productId: number) {
  return `${ADMIN_BASE_URL}/bitrix/admin/cat_product_edit.php?IBLOCK_ID=3&type=catalog&lang=ru&ID=${productId}`
}

function getPaginationPages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages])

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page)
  }

  const sortedPages = [...pages].sort((a, b) => a - b)
  return sortedPages.flatMap((page, index) => {
    const previousPage = sortedPages[index - 1]
    return previousPage && page - previousPage > 1 ? [`ellipsis-${previousPage}-${page}`, page] : [page]
  })
}

export function UploadDetailsPage({ token, path }: { token: string; path: string }) {
  const queryClient = useQueryClient()
  const [isNotFoundModalOpen, setIsNotFoundModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const id = path.split('/').pop() ?? ''
  const uploadQuery = useQuery({
    queryKey: ['upload', id, page],
    queryFn: () => getUpload(token, id, { page, limit: ITEMS_PER_PAGE, withProductIdOnly: true }),
    enabled: Boolean(id),
  })

  const startMutation = useMutation({
    mutationFn: () => startUpload(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload', id] })
      queryClient.invalidateQueries({ queryKey: ['uploads'] })
    },
  })

  useEffect(() => {
    setPage(1)
  }, [id])

  useEffect(() => {
    if (!id) return

    return subscribeUpload(
      token,
      id,
      () => {
        queryClient.invalidateQueries({ queryKey: ['upload', id] })
        queryClient.invalidateQueries({ queryKey: ['uploads'] })
      },
      (error) => {
        console.error(error)
      },
    )
  }, [id, queryClient, token])

  if (uploadQuery.isLoading) return <section className="page">Загрузка...</section>
  if (uploadQuery.error) return <section className="page"><div className="error">{uploadQuery.error.message}</div></section>
  if (!uploadQuery.data) return <section className="page">Загрузка не найдена</section>

  const upload = uploadQuery.data
  const itemPage = upload.itemPage ?? {
    page,
    limit: ITEMS_PER_PAGE,
    total: upload.items.filter((item) => item.productId != null).length,
    totalPages: 1,
  }
  const found = itemPage.total
  const notFoundItems = upload.notFoundItems ?? upload.items.filter((item) => !item.found)
  const firstItemNumber = itemPage.total === 0 ? 0 : (itemPage.page - 1) * itemPage.limit + 1
  const lastItemNumber = Math.min(itemPage.page * itemPage.limit, itemPage.total)
  const processed =
    upload.status === 'syncing' || upload.status === 'ready' || upload.status === 'failed'
      ? upload.syncedCount + upload.notFoundCount
      : found + upload.notFoundCount
  const progress = upload.totalArticles ? Math.round((processed / upload.totalArticles) * 100) : 0

  return (
    <section className="page">
      <header className="page-header">
        <h1>{upload.fileName}</h1>
        {(upload.status === 'waiting' || upload.status === 'failed') && (
          <Button className="primary" onPress={() => startMutation.mutate()} isDisabled={startMutation.isPending}>
            {startMutation.isPending ? 'Запускаем...' : upload.status === 'failed' ? 'Повторить' : 'Запустить'}
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
        <Info label="Синхронизировано" value={upload.syncedCount} />
        <Info
          label="Не найдено"
          value={(
            <span className="info-inline">
              {upload.notFoundCount}
              {notFoundItems.length > 0 && (
                <Button size="sm" variant="ghost" onPress={() => setIsNotFoundModalOpen(true)}>
                  Подробнее
                </Button>
              )}
            </span>
          )}
        />
      </div>

      <div className="progress"><span style={{ width: `${progress}%` }} /></div>

      <DataTable label="Детали загрузки">
        <Table.Header>
          <Table.Column id="article" isRowHeader>Артикул</Table.Column>
          <Table.Column id="productId">ID товара</Table.Column>
          <Table.Column id="oldPrice">Старая цена</Table.Column>
          <Table.Column id="newPrice">Новая цена</Table.Column>
          <Table.Column id="status">Статус</Table.Column>
          <Table.Column id="admin">Админка</Table.Column>
          <Table.Column id="history">История изменения цен</Table.Column>
        </Table.Header>
        <Table.Body>
          {upload.items.map((item) => (
            <Table.Row id={item.article} key={item.article}>
              <Table.Cell>{item.article}</Table.Cell>
              <Table.Cell>{item.productId ?? '—'}</Table.Cell>
              <Table.Cell>{item.found ? currency(item.oldPrice) : 'Не найдено'}</Table.Cell>
              <Table.Cell>{currency(item.newPrice)}</Table.Cell>
              <Table.Cell>{item.errorMessage ? item.errorMessage : item.synced ? 'Записано' : item.found ? 'Готово к записи' : 'Ожидает проверки'}</Table.Cell>
              <Table.Cell>
                {item.productId ? (
                  <a className="button-link" target="_blank" rel="noreferrer" href={getAdminProductUrl(item.productId)}>
                    Перейти
                  </a>
                ) : (
                  '—'
                )}
              </Table.Cell>
              <Table.Cell><a target="_blank" rel="noreferrer" href={`/history?q=${encodeURIComponent(item.article)}`}>Открыть</a></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </DataTable>
      <Pagination.Root size="sm" className="pagination-bar" aria-label="Страницы товаров">
        <Pagination.Summary>
          {firstItemNumber}-{lastItemNumber} из {itemPage.total}
        </Pagination.Summary>
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous onPress={() => setPage((currentPage) => Math.max(currentPage - 1, 1))} isDisabled={itemPage.page <= 1}>
              Назад
            </Pagination.Previous>
          </Pagination.Item>
          {getPaginationPages(itemPage.page, itemPage.totalPages).map((paginationPage) => (
            <Pagination.Item key={paginationPage}>
              {typeof paginationPage === 'number' ? (
                <Pagination.Link isActive={paginationPage === itemPage.page} onPress={() => setPage(paginationPage)}>
                  {paginationPage}
                </Pagination.Link>
              ) : (
                <Pagination.Ellipsis />
              )}
            </Pagination.Item>
          ))}
          <Pagination.Item>
            <Pagination.Next onPress={() => setPage((currentPage) => Math.min(currentPage + 1, itemPage.totalPages))} isDisabled={itemPage.page >= itemPage.totalPages}>
              Вперёд
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination.Root>

      {isNotFoundModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsNotFoundModalOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="not-found-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2 id="not-found-title">Не найденные артикулы</h2>
              <Button onPress={() => setIsNotFoundModalOpen(false)}>Закрыть</Button>
            </header>
            <div className="modal-body">
              {notFoundItems.length > 0 ? (
                <ul className="article-list">
                  {notFoundItems.map((item) => (
                    <li key={item.article}>
                      <span>{item.article}</span>
                      {item.errorMessage && <small>{item.errorMessage}</small>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Все артикулы найдены.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
