import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Input } from '@heroui/react'
import { loginRequest } from '../lib/api'
import type { User } from '../types'

export function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [login, setLogin] = useState('admin')
  const [password, setPassword] = useState('JQ23@rq')

  const loginMutation = useMutation({
    mutationFn: () => loginRequest(login, password),
    onSuccess: (data) => onLogin(data.accessToken, data.user),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    loginMutation.mutate()
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={submit}>
        <h1>Вход</h1>
        <label>
          Логин
          <Input value={login} onChange={(event) => setLogin(event.target.value)} />
        </label>
        <label>
          Пароль
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {loginMutation.error && <div className="error">{loginMutation.error.message}</div>}
        <Button className="primary" type="submit" isDisabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Входим...' : 'Войти'}
        </Button>
      </form>
    </main>
  )
}
