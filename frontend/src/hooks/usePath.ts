import { useEffect, useState } from 'react'

export function usePath() {
  const [path, setPath] = useState(window.location.pathname + window.location.search)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname + window.location.search)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const navigate = (to: string) => {
    window.history.pushState({}, '', to)
    setPath(to)
  }

  return { path, navigate }
}
