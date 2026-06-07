import { useState } from 'react'
import { usePath } from './hooks/usePath'
import type { User } from './types'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { RollbackPage } from './pages/RollbackPage'
import { UploadDetailsPage } from './pages/UploadDetailsPage'
import { UploadsPage } from './pages/UploadsPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  const { path, navigate } = usePath()
  const [token, setToken] = useState(() => localStorage.getItem('token') ?? '')
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken('')
    setUser(null)
    navigate('/')
  }

  const login = (accessToken: string, nextUser: User) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('user', JSON.stringify(nextUser))
    setToken(accessToken)
    setUser(nextUser)
    navigate('/')
  }

  if (!token || !user) {
    return <LoginPage onLogin={login} />
  }

  return (
    <AppShell path={path} user={user} navigate={navigate} logout={logout}>
      {path === '/' && <HomePage token={token} navigate={navigate} />}
      {path === '/upload' && <UploadsPage token={token} navigate={navigate} />}
      {path.startsWith('/upload/') && <UploadDetailsPage token={token} path={path} />}
      {path.startsWith('/history') && <HistoryPage token={token} path={path} />}
      {path === '/rollback' && <RollbackPage token={token} />}
      {path === '/users' && <UsersPage token={token} />}
    </AppShell>
  )
}
