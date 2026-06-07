import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button, Input, Table } from '@heroui/react'
import excelExample from './assets/excel-example.png'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

type User = {
  userId: string
  login: string
}

type UploadListItem = {
  _id: string
  createdAt: string
  createdByLogin: string
  totalArticles: number
  fileName: string
  status: UploadStatus
  syncedCount: number
  notFoundCount: number
}

type UploadStatus = 'preparing' | 'waiting' | 'ready' | 'cancelled'

type UploadItem = {
  article: string
  oldPrice: number
  newPrice: number
  found: boolean
}

type UploadDetails = UploadListItem & {
  sheetName: string
  articleColumn: string
  priceColumn: string
  items: UploadItem[]
}

type PreviewSheet = {
  name: string
  columns: string[]
  examples: Record<string, string | number>[]
}

type Preview = {
  fileName: string
  sheets: PreviewSheet[]
}

type HistoryResponse = {
  dates: string[]
  rows: Array<Record<string, string | number>>
}

const statusLabels: Record<UploadStatus, string> = {
  preparing: 'Подготовка',
  waiting: 'Ожидает запуска',
  ready: 'Готово',
  cancelled: 'Отменено',
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  }
}

async function api<T>(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Ошибка запроса')
  }

  return response.json() as Promise<T>
}

function usePath() {
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Prosmebel Price</div>
        <nav>
          <Button className={path === '/' ? 'active' : ''} onPress={() => navigate('/')}>Главная</Button>
          <Button className={path.startsWith('/upload') ? 'active' : ''} onPress={() => navigate('/upload')}>Загрузки</Button>
          <Button className={path.startsWith('/history') ? 'active' : ''} onPress={() => navigate('/history')}>История цен</Button>
          <Button className={path.startsWith('/users') ? 'active' : ''} onPress={() => navigate('/users')}>Пользователи</Button>
        </nav>
        <div className="account">
          <span>{user.login}</span>
          <Button onPress={logout}>Выйти</Button>
        </div>
      </aside>
      <main className="content">
        {path === '/' && <HomePage token={token} navigate={navigate} />}
        {path === '/upload' && <UploadsPage token={token} navigate={navigate} />}
        {path.startsWith('/upload/') && <UploadDetailsPage token={token} path={path} />}
        {path.startsWith('/history') && <HistoryPage token={token} path={path} />}
        {path === '/users' && <UsersPage token={token} />}
      </main>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [login, setLogin] = useState('admin')
  const [password, setPassword] = useState('JQ23@rq')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })

      if (!response.ok) throw new Error('Неверный логин или пароль')
      const data = await response.json()
      onLogin(data.accessToken, data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
    }
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
        {error && <div className="error">{error}</div>}
        <Button className="primary" type="submit">Войти</Button>
      </form>
    </main>
  )
}

function HomePage({ token, navigate }: { token: string; navigate: (to: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [articleColumn, setArticleColumn] = useState('')
  const [priceColumn, setPriceColumn] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [instructionOpen, setInstructionOpen] = useState(false)
  const [error, setError] = useState('')

  const sheet = preview?.sheets.find((item) => item.name === sheetName)
  const selectedPreviewRows = sheet?.examples.map((row) => ({
    article: row[articleColumn],
    price: row[priceColumn],
  })) ?? []

  const selectFile = async (nextFile: File | null) => {
    if (!nextFile) return
    setFile(nextFile)
    setError('')
    const formData = new FormData()
    formData.append('file', nextFile)

    try {
      const data = await api<Preview>('/uploads/preview', token, {
        method: 'POST',
        body: formData,
      })
      setPreview(data)
      const firstSheet = data.sheets[0]
      setSheetName(firstSheet?.name ?? '')
      setArticleColumn(firstSheet?.columns[0] ?? '')
      setPriceColumn(firstSheet?.columns[1] ?? firstSheet?.columns[0] ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось прочитать файл')
    }
  }

  const createUpload = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('sheetName', sheetName)
    formData.append('articleColumn', articleColumn)
    formData.append('priceColumn', priceColumn)

    try {
      const upload = await api<UploadDetails>('/uploads', token, {
        method: 'POST',
        body: formData,
      })
      navigate(`/upload/${upload._id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать загрузку')
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Загрузка excel файла</h1>
        <Button onPress={() => setInstructionOpen(true)}>Подробнее как это работает</Button>
      </header>

      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          selectFile(event.dataTransfer.files[0])
        }}
      >
        <input id="file-input" type="file" accept=".xlsx,.xls" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
        <label htmlFor="file-input">
          <strong>{file ? file.name : 'Перетащите файл сюда'}</strong>
          <span>или выберите excel файл с компьютера</span>
        </label>
      </div>

      {preview && sheet && (
        <div className="setup-grid">
          <label>
            Страница
            <select value={sheetName} onChange={(event) => setSheetName(event.target.value)}>
              {preview.sheets.map((item) => <option key={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Колонка с артикулом
            <select value={articleColumn} onChange={(event) => setArticleColumn(event.target.value)}>
              {sheet.columns.map((column) => <option key={column}>{column}</option>)}
            </select>
          </label>
          <label>
            Колонка с итоговой ценой
            <select value={priceColumn} onChange={(event) => setPriceColumn(event.target.value)}>
              {sheet.columns.map((column) => <option key={column}>{column}</option>)}
            </select>
          </label>
          <Button className="primary" onPress={createUpload}>Запустить поиск</Button>
        </div>
      )}

      {sheet && (
        <>
          <section className="table-section">
            <h2>Предпросмотр выбранных колонок</h2>
            <DataTable>
              <Table.Header>
                <Table.Column id="article">Артикул</Table.Column>
                <Table.Column id="price">Цена</Table.Column>
              </Table.Header>
              <Table.Body>
                {selectedPreviewRows.map((row, index) => (
                  <Table.Row id={`${row.article}-${index}`} key={`${row.article}-${index}`}>
                    <Table.Cell>{row.article}</Table.Cell>
                    <Table.Cell>{row.price}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </DataTable>
          </section>

          <section className="table-section">
            <h2>Предпросмотр листа</h2>
            <DataTable>
              <Table.Header>
                {sheet.columns.map((column) => <Table.Column id={column} key={column}>{column}</Table.Column>)}
              </Table.Header>
              <Table.Body>
                {sheet.examples.map((row, index) => (
                  <Table.Row id={String(index)} key={index}>
                    {sheet.columns.map((column) => <Table.Cell key={column}>{row[column]}</Table.Cell>)}
                  </Table.Row>
                ))}
              </Table.Body>
            </DataTable>
          </section>
        </>
      )}

      {error && <div className="error">{error}</div>}
      {instructionOpen && <InstructionModal onClose={() => setInstructionOpen(false)} />}
    </section>
  )
}

function InstructionModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const steps = [
    {
      title: 'Шаг 1',
      content: (
        <>
          <img className="instruction-image" src={excelExample} alt="Пример excel файла" />
          <p>подготовьте excel файл (ожидается что данные будут в рамках одной таблицы)</p>
        </>
      ),
    },
    { title: 'Шаг 2', content: <p>Выберите страницу, колонку с артикулом и итоговой ценой</p> },
    { title: 'Шаг 3', content: <p>Вам Выведется информация, сколько найдено записей и пример нескольких записей. Можно перейти на прошлый шаг и загрузить другой файл</p> },
    { title: 'Шаг 4', content: <p>Запустите процесс поиска для синхронизации. После запуска откроется страница записи загрузки</p> },
    { title: 'Шаг 5', content: <p>Здесь выводится процесс поиска соответствующих записей. Счетчики: Найдено | Не найдено</p> },
    { title: 'Шаг 6', content: <p>Можно ознакомиться с будущими изменениями и запустить процесс</p> },
  ]

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <header>
          <h2>{steps[step].title}</h2>
          <Button onPress={onClose}>Закрыть</Button>
        </header>
        <div className="modal-body">{steps[step].content}</div>
        <footer>
          <Button isDisabled={step === 0} onPress={() => setStep((value) => value - 1)}>Назад</Button>
          <span>{step + 1} / {steps.length}</span>
          <Button isDisabled={step === steps.length - 1} onPress={() => setStep((value) => value + 1)}>Вперед</Button>
        </footer>
      </div>
    </div>
  )
}

function UploadsPage({ token, navigate }: { token: string; navigate: (to: string) => void }) {
  const [uploads, setUploads] = useState<UploadListItem[]>([])

  useEffect(() => {
    api<UploadListItem[]>('/uploads', token).then(setUploads).catch(console.error)
  }, [token])

  return (
    <section className="page">
      <header className="page-header"><h1>Загрузки</h1></header>
      <DataTable>
        <Table.Header>
          <Table.Column id="date">Дата</Table.Column>
          <Table.Column id="createdBy">Кто запустил</Table.Column>
          <Table.Column id="articles">Кол-во артикулов</Table.Column>
          <Table.Column id="file">Файл</Table.Column>
          <Table.Column id="status">Статус</Table.Column>
          <Table.Column id="synced">Синхронизировано</Table.Column>
          <Table.Column id="notFound">Не найдено</Table.Column>
          <Table.Column id="actions">Действия</Table.Column>
        </Table.Header>
        <Table.Body>
          {uploads.map((upload) => (
            <Table.Row id={upload._id} key={upload._id}>
              <Table.Cell>{formatDate(upload.createdAt)}</Table.Cell>
              <Table.Cell>{upload.createdByLogin}</Table.Cell>
              <Table.Cell>{upload.totalArticles}</Table.Cell>
              <Table.Cell>{upload.fileName}</Table.Cell>
              <Table.Cell><span className="status">{statusLabels[upload.status]}</span></Table.Cell>
              <Table.Cell>{upload.syncedCount}</Table.Cell>
              <Table.Cell>{upload.notFoundCount}</Table.Cell>
              <Table.Cell><Button size="sm" onPress={() => navigate(`/upload/${upload._id}`)}>Перейти</Button></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </DataTable>
    </section>
  )
}

function UploadDetailsPage({ token, path }: { token: string; path: string }) {
  const id = path.split('/').pop() ?? ''
  const [upload, setUpload] = useState<UploadDetails | null>(null)

  useEffect(() => {
    api<UploadDetails>(`/uploads/${id}`, token).then(setUpload).catch(console.error)
  }, [id, token])

  const start = async () => {
    alert('go')
    const updated = await api<UploadDetails>(`/uploads/${id}/start`, token, { method: 'POST' })
    setUpload(updated)
  }

  if (!upload) return <section className="page">Загрузка...</section>

  const found = upload.items.filter((item) => item.found).length
  const progress = upload.totalArticles ? Math.round((found / upload.totalArticles) * 100) : 0

  return (
    <section className="page">
      <header className="page-header">
        <h1>{upload.fileName}</h1>
        {upload.status === 'waiting' && <Button className="primary" onPress={start}>Запустить процесс</Button>}
      </header>

      <div className="summary-grid">
        <Info label="Дата" value={formatDate(upload.createdAt)} />
        <Info label="Кто запустил" value={upload.createdByLogin} />
        <Info label="Страница" value={upload.sheetName} />
        <Info label="Статус" value={statusLabels[upload.status]} />
        <Info label="Артикулы" value={upload.totalArticles} />
        <Info label="Найдено" value={found} />
        <Info label="Не найдено" value={upload.notFoundCount} />
      </div>

      <div className="progress"><span style={{ width: `${progress}%` }} /></div>

      <DataTable>
        <Table.Header>
          <Table.Column id="article">Артикул</Table.Column>
          <Table.Column id="oldPrice">Старая цена</Table.Column>
          <Table.Column id="newPrice">Новая цена</Table.Column>
          <Table.Column id="history">История изменения цен</Table.Column>
        </Table.Header>
        <Table.Body>
          {upload.items.map((item) => (
            <Table.Row id={item.article} key={item.article}>
              <Table.Cell>{item.article}</Table.Cell>
              <Table.Cell>{item.found ? currency(item.oldPrice) : 'Не найдено'}</Table.Cell>
              <Table.Cell>{currency(item.newPrice)}</Table.Cell>
              <Table.Cell><a target="_blank" href={`/history?q=${encodeURIComponent(item.article)}`}>Открыть</a></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </DataTable>
    </section>
  )
}

function HistoryPage({ token, path }: { token: string; path: string }) {
  const query = new URLSearchParams(path.split('?')[1] ?? '').get('q') ?? ''
  const [search, setSearch] = useState(query)
  const [history, setHistory] = useState<HistoryResponse>({ dates: [], rows: [] })

  useEffect(() => {
    api<HistoryResponse>(`/history${query ? `?q=${encodeURIComponent(query)}` : ''}`, token)
      .then(setHistory)
      .catch(console.error)
  }, [query, token])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    window.history.pushState({}, '', `/history${search ? `?q=${encodeURIComponent(search)}` : ''}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>История изменений цен</h1>
        <form className="search" onSubmit={submit}>
          <Input placeholder="Артикул" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button type="submit">Найти</Button>
        </form>
      </header>
      <DataTable>
        <Table.Header>
          <Table.Column id="article">Артикулы</Table.Column>
          {history.dates.map((date) => <Table.Column id={date} key={date}>{date}</Table.Column>)}
        </Table.Header>
        <Table.Body>
          {history.rows.map((row) => (
            <Table.Row id={String(row.article)} key={String(row.article)}>
              <Table.Cell>{row.article}</Table.Cell>
              {history.dates.map((date) => <Table.Cell key={date}>{row[date] ? currency(Number(row[date])) : '-'}</Table.Cell>)}
            </Table.Row>
          ))}
        </Table.Body>
      </DataTable>
    </section>
  )
}

function UsersPage({ token }: { token: string }) {
  const [users, setUsers] = useState<Array<{ _id: string; login: string; createdAt: string }>>([])

  useEffect(() => {
    api<Array<{ _id: string; login: string; createdAt: string }>>('/users', token).then(setUsers).catch(console.error)
  }, [token])

  return (
    <section className="page">
      <header className="page-header"><h1>Пользователи</h1></header>
      <DataTable>
        <Table.Header>
          <Table.Column id="login">Логин</Table.Column>
          <Table.Column id="createdAt">Дата создания</Table.Column>
        </Table.Header>
        <Table.Body>
          {users.map((user) => (
            <Table.Row id={user._id} key={user._id}>
              <Table.Cell>{user.login}</Table.Cell>
              <Table.Cell>{formatDate(user.createdAt)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </DataTable>
    </section>
  )
}

function DataTable({ children }: { children: ReactNode }) {
  return (
    <Table className="min-w-[780px]">
      <Table.ScrollContainer className="table-wrap">
        <Table.Content>{children}</Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="info"><span>{label}</span><strong>{value}</strong></div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function currency(value: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)
}
