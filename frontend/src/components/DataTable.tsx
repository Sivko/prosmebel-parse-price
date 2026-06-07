import type { ReactNode } from 'react'
import { Table } from '@heroui/react'

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <Table className="min-w-[780px]">
      <Table.ScrollContainer className="table-wrap">
        <Table.Content>{children}</Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
