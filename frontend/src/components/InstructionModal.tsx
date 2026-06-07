import { useState } from 'react'
import { Button } from '@heroui/react'
import excelExample from '../assets/excel-example.png'

export function InstructionModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const steps = [
    {
      title: 'Шаг 1',
      content: (
        <>
          <img className="instruction-image" src={excelExample} alt="Пример excel файла" />
          <p>Подготовьте excel файл: данные должны быть в рамках одной таблицы.</p>
        </>
      ),
    },
    { title: 'Шаг 2', content: <p>Выберите страницу, колонку с артикулом и итоговой ценой.</p> },
    { title: 'Шаг 3', content: <p>Проверьте найденные записи и пример строк перед запуском.</p> },
    { title: 'Шаг 4', content: <p>Запустите процесс поиска для синхронизации цен.</p> },
    { title: 'Шаг 5', content: <p>Следите за счетчиками найденных и ненайденных записей.</p> },
    { title: 'Шаг 6', content: <p>Ознакомьтесь с будущими изменениями и запустите процесс.</p> },
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
