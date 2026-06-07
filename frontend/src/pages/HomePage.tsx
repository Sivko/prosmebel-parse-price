import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Table } from '@heroui/react'
import { createUpload, previewUpload } from '../lib/api'
import type { Preview } from '../types'
import { DataTable } from '../components/DataTable'
import { InstructionModal } from '../components/InstructionModal'

export function HomePage({ token, navigate }: { token: string; navigate: (to: string) => void }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [sheetName, setSheetName] = useState('')
  const [articleColumn, setArticleColumn] = useState('')
  const [priceColumn, setPriceColumn] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [instructionOpen, setInstructionOpen] = useState(false)

  const sheet = preview?.sheets.find((item) => item.name === sheetName)
  const selectedPreviewRows = sheet?.examples.map((row) => ({
    article: row[articleColumn],
    price: row[priceColumn],
  })) ?? []

  const previewMutation = useMutation({
    mutationFn: (nextFile: File) => previewUpload(token, nextFile),
    onSuccess: (data) => {
      setPreview(data)
      const firstSheet = data.sheets[0]
      setSheetName(firstSheet?.name ?? '')
      setArticleColumn(firstSheet?.columns[0] ?? '')
      setPriceColumn(firstSheet?.columns[1] ?? firstSheet?.columns[0] ?? '')
    },
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Выберите файл')
      return createUpload(token, { file, sheetName, articleColumn, priceColumn })
    },
    onSuccess: async (upload) => {
      await queryClient.invalidateQueries({ queryKey: ['uploads'] })
      navigate(`/upload/${upload._id}`)
    },
  })

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) return
    setFile(nextFile)
    setPreview(null)
    previewMutation.mutate(nextFile)
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
          <span>{previewMutation.isPending ? 'Читаем файл...' : 'или выберите excel файл с компьютера'}</span>
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
          <Button className="primary" onPress={() => createMutation.mutate()} isDisabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создаем...' : 'Запустить поиск'}
          </Button>
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

      {previewMutation.error && <div className="error">{previewMutation.error.message}</div>}
      {createMutation.error && <div className="error">{createMutation.error.message}</div>}
      {instructionOpen && <InstructionModal onClose={() => setInstructionOpen(false)} />}
    </section>
  )
}
