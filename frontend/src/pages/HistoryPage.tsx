import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Table } from '@heroui/react'
import { getHistory } from '../lib/api'
import { currency } from '../lib/format'
import { getRegionShortLabel, PRICE_REGIONS, type PriceRegion } from '../lib/price-region'
import { DataTable } from '../components/DataTable'

function parseRegion(value: string | null): PriceRegion | undefined {
  return PRICE_REGIONS.includes(value as PriceRegion) ? (value as PriceRegion) : undefined
}

export function HistoryPage({ token, path }: { token: string; path: string }) {
  const searchParams = new URLSearchParams(path.split('?')[1] ?? '')
  const query = searchParams.get('q') ?? ''
  const region = parseRegion(searchParams.get('region'))
  const [search, setSearch] = useState(query)
  const [selectedRegion, setSelectedRegion] = useState<PriceRegion | ''>(region ?? '')
  const historyQuery = useQuery({
    queryKey: ['history', query, region],
    queryFn: () => getHistory(token, query, region),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (selectedRegion) params.set('region', selectedRegion)
    const queryString = params.toString()
    window.history.pushState({}, '', `/history${queryString ? `?${queryString}` : ''}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>История изменений цен</h1>
        <form className="search" onSubmit={submit}>
          <Input placeholder="Артикул" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value as PriceRegion | '')}>
            <option value="">Все регионы</option>
            {PRICE_REGIONS.map((item) => (
              <option key={item} value={item}>{getRegionShortLabel(item)}</option>
            ))}
          </select>
          <Button type="submit">Найти</Button>
        </form>
      </header>
      {historyQuery.isLoading && <div>Загрузка...</div>}
      {historyQuery.error && <div className="error">{historyQuery.error.message}</div>}
      {historyQuery.data && (
        <DataTable label="История изменений цен">
          <Table.Header>
            <Table.Column id="region" isRowHeader>Регион</Table.Column>
            <Table.Column id="article">Артикулы</Table.Column>
            {historyQuery.data.dates.map((date) => <Table.Column id={date} key={date}>{date}</Table.Column>)}
          </Table.Header>
          <Table.Body>
            {historyQuery.data.rows.map((row) => (
              <Table.Row id={`${String(row.region)}-${String(row.article)}`} key={`${String(row.region)}-${String(row.article)}`}>
                <Table.Cell>{getRegionShortLabel(String(row.region) as PriceRegion)}</Table.Cell>
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
