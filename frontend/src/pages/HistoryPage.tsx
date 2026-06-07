import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Table } from '@heroui/react'
import { getHistory } from '../lib/api'
import { currency } from '../lib/format'
import { DataTable } from '../components/DataTable'

export function HistoryPage({ token, path }: { token: string; path: string }) {
  const query = new URLSearchParams(path.split('?')[1] ?? '').get('q') ?? ''
  const [search, setSearch] = useState(query)
  const historyQuery = useQuery({
    queryKey: ['history', query],
    queryFn: () => getHistory(token, query),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    window.history.pushState({}, '', `/history${search ? `?q=${encodeURIComponent(search)}` : ''}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>История изменений цен</h1>
        <form className="search" onSubmit={submit}>
          <Input placeholder="Артикул" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button type="submit">Найти</Button>
        </form>
      </header>
      {historyQuery.isLoading && <div>Загрузка...</div>}
      {historyQuery.error && <div className="error">{historyQuery.error.message}</div>}
      {historyQuery.data && (
        <DataTable label="История изменений цен">
          <Table.Header>
            <Table.Column id="article" isRowHeader>Артикулы</Table.Column>
            {historyQuery.data.dates.map((date) => <Table.Column id={date} key={date}>{date}</Table.Column>)}
          </Table.Header>
          <Table.Body>
            {historyQuery.data.rows.map((row) => (
              <Table.Row id={String(row.article)} key={String(row.article)}>
                <Table.Cell>{row.article}</Table.Cell>
                {historyQuery.data.dates.map((date) => <Table.Cell key={date}>{row[date] ? currency(Number(row[date])) : '-'}</Table.Cell>)}
              </Table.Row>
            ))}
          </Table.Body>
        </DataTable>
      )}
    </section>
  )
}
