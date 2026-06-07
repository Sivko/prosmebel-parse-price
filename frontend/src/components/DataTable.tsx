import type { ReactNode } from 'react'
import { Table } from '@heroui/react'

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Table aria-label={label} className="min-w-[780px]">
      <Table.ScrollContainer className="table-wrap">
        <Table.Content>{children}</Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}
