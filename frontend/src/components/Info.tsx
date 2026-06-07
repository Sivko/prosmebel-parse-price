import type { ReactNode } from 'react'

export function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div className="info"><span>{label}</span><div className="info-value">{value}</div></div>
}
