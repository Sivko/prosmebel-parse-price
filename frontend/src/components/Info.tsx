export function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="info"><span>{label}</span><strong>{value}</strong></div>
}
