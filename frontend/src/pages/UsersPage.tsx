import { useQuery } from '@tanstack/react-query'
import { Table } from '@heroui/react'
import { getUsers } from '../lib/api'
import { formatDate } from '../lib/format'
import { DataTable } from '../components/DataTable'

export function UsersPage({ token }: { token: string }) {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(token),
  })

  return (
    <section className="page">
      <header className="page-header"><h1>Пользователи</h1></header>
      {usersQuery.isLoading && <div>Загрузка...</div>}
      {usersQuery.error && <div className="error">{usersQuery.error.message}</div>}
      {usersQuery.data && (
        <DataTable label="Пользователи">
          <Table.Header>
            <Table.Column id="login" isRowHeader>Логин</Table.Column>
            <Table.Column id="createdAt">Дата создания</Table.Column>
          </Table.Header>
          <Table.Body>
            {usersQuery.data.map((user) => (
              <Table.Row id={user._id} key={user._id}>
                <Table.Cell>{user.login}</Table.Cell>
                <Table.Cell>{formatDate(user.createdAt)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </DataTable>
      )}
    </section>
  )
}
