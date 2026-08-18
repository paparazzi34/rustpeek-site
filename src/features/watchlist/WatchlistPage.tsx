import { useState } from 'react'
import { Button, Card, CardHeader, SearchField, StatusPill, cx } from '../../components/ui'

/* Вочлист пока на демо-данных: вход через Telegram появится вместе с бэкендом.
   Говорим об этом прямо в интерфейсе, а не делаем вид, что это чей-то список. */

type Target = { id: number; nick: string; state: 'on' | 'hidden' | 'off'; where: string; when: string }

const DEMO: Target[] = [
  { id: 1, nick: 'ShadowKiller_228', state: 'on', where: 'Hustle Rust - [2X, VANILLA]', when: 'зашёл 40 минут назад' },
  { id: 2, nick: 'xX_Raider_Xx', state: 'on', where: 'Magic Rust #4', when: 'зашёл 2 часа назад' },
  { id: 3, nick: 'НагибаторВаня', state: 'hidden', where: 'Vital Rust · вижу через A2S', when: 'зашёл 15 минут назад' },
  { id: 4, nick: 'sleepy_bob', state: 'off', where: 'офлайн', when: 'был вчера в 23:10' },
]

const ORDER = { on: 0, hidden: 1, off: 2 }

export function WatchlistPage() {
  const [targets, setTargets] = useState(DEMO)
  const [input, setInput] = useState('')
  const sorted = [...targets].sort((a, b) => ORDER[a.state] - ORDER[b.state])
  const onlineCount = targets.filter((t) => t.state !== 'off').length

  return (
    <div className="fade-up">
      <h1 className="text-[22px] leading-tight font-semibold tracking-tight">Вочлист</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-ink-2">
        Цели под наблюдением 24/7. Зашёл на сервер — пуш прилетает в Telegram в ту же секунду,
        даже если ты спишь.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-[5px] border border-rust/25 bg-rust/8 px-3 py-2 text-[12.5px] text-rust-hot">
        Демо-список. Свой появится после входа через Telegram — он в работе.
      </div>

      <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-2">
        <div className="min-w-[260px] flex-1">
          <SearchField value={input} onChange={setInput} placeholder="Ник или SteamID64 цели" />
        </div>
        <Button variant="solid" disabled>
          Следить
        </Button>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Под наблюдением"
          sub="Онлайн — сверху, офлайн — вниз. Глазами искать ничего не надо"
          right={
            <StatusPill tone="good" dot>
              {onlineCount} в сети
            </StatusPill>
          }
        />
        <div className="divide-y divide-line/70">
          {sorted.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={cx(
                  'size-2 shrink-0 rounded-full',
                  t.state === 'on' && 'bg-good animate-live',
                  t.state === 'hidden' && 'bg-rust',
                  t.state === 'off' && 'bg-ink-3/50',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{t.nick}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{t.where}</span>
              </span>
              <span className="hidden text-[12px] text-ink-3 sm:block">{t.when}</span>
              <button
                onClick={() => setTargets((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-[12px] text-ink-3 transition-colors hover:text-danger"
              >
                убрать
              </button>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="px-4 py-10 text-center text-[13px] text-ink-3">
              Список пуст. Добавь цель — и я начну смотреть.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
