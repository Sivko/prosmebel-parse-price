import type { ReactNode } from 'react'
import { Button } from '@heroui/react'
import type { User } from '../types'

type AppShellProps = {
  children: ReactNode
  path: string
  user: User
  navigate: (to: string) => void
  logout: () => void
}

export function AppShell({ children, path, user, navigate, logout }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Prosmebel Price</div>
        <nav>
          <Button className={path === '/' ? 'active' : ''} onPress={() => navigate('/')}>Главная</Button>
          <Button className={path.startsWith('/upload') ? 'active' : ''} onPress={() => navigate('/upload')}>Загрузки</Button>
          <Button className={path.startsWith('/history') ? 'active' : ''} onPress={() => navigate('/history')}>История цен</Button>
          <Button className={path.startsWith('/rollback') ? 'active' : ''} onPress={() => navigate('/rollback')}>Откат</Button>
          <Button className={path.startsWith('/users') ? 'active' : ''} onPress={() => navigate('/users')}>Пользователи</Button>
        </nav>
        <div className="account">
          <span>{user.login}</span>
          <Button onPress={logout}>Выйти</Button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
