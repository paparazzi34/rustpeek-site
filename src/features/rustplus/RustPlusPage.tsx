import { useState } from 'react'
import { Card, CardHeader, StatusPill, cx } from '../../components/ui'

/* Лента Rust+. Типы событий различаются иконкой и подписью, а не только
   цветом — рейд от смерти отличается словом «РЕЙД», а не оттенком. */

type Kind = 'raid' | 'alarm' | 'death' | 'event'

const FEED: Array<{ kind: Kind; title: string; detail: string; server: string; time: string }> = [
  {
    kind: 'raid',
    title: 'Рейд',
    detail: 'Взрыв у базы — сработал Smart Alarm «Главная дверь»',
    server: 'Hustle Rust',
    time: 'сегодня 14:32',
  },
  {
    kind: 'alarm',
    title: 'Smart Alarm',
    detail: '«Ловушка в гараже» — движение',
    server: 'Hustle Rust',
    time: 'сегодня 11:07',
  },
  {
    kind: 'death',
    title: 'Смерть',
    detail: 'ShadowKiller_228 — AK-47, 87 м',
    server: 'Hustle Rust',
    time: 'вчера 23:48',
  },
  {
    kind: 'event',
    title: 'Событие карты',
    detail: 'Патрульный вертолёт вошёл на карту',
    server: 'Hustle Rust',
    time: 'вчера 21:15',
  },
]

const GLYPH: Record<Kind, string> = { raid: '!', alarm: '~', death: '×', event: '↗' }

export function RustPlusPage() {
  const [loud, setLoud] = useState(true)

  return (
    <div className="fade-up">
      <h1 className="text-[22px] leading-tight font-semibold tracking-tight">Rust+</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-ink-2">
        Рейды, алармы, смерти и события карты — сюда и в Telegram, даже когда официальное
        приложение лежит. Свой канал пушей, не через их сервер.
      </p>

      <Card className="mt-4 flex flex-wrap items-center gap-4 px-4 py-3">
        <span className="size-2 rounded-full bg-good animate-live" />
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium">Rust+ подключён</div>
          <div className="truncate text-[12px] text-ink-3">
            Hustle Rust - [2X, VANILLA] · пара активна
          </div>
        </div>
        <button
          onClick={() => setLoud((v) => !v)}
          className="flex items-center gap-2.5 text-[12.5px] text-ink-2"
          aria-pressed={loud}
        >
          Громкий режим
          <span
            className={cx(
              'relative h-5 w-9 rounded-full transition-colors duration-150',
              loud ? 'bg-rust' : 'bg-surface-3',
            )}
          >
            <span
              className={cx(
                'absolute top-0.5 size-4 rounded-full bg-white transition-[left] duration-150',
                loud ? 'left-[18px]' : 'left-0.5',
              )}
            />
          </span>
        </button>
      </Card>
      <p className="mt-1.5 text-[12px] text-ink-3">
        Громкий режим — серия алертов подряд на рейд, чтобы телефон разбудил ночью.
      </p>

      <Card className="mt-5">
        <CardHeader title="Лента событий" sub="Последние сутки" />
        <div className="divide-y divide-line/70">
          {FEED.map((e, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <span
                className={cx(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[4px] border text-[13px] font-semibold',
                  e.kind === 'raid' && 'border-danger/40 bg-danger/10 text-danger',
                  e.kind === 'alarm' && 'border-rust/40 bg-rust/10 text-rust-hot',
                  e.kind === 'death' && 'border-line bg-surface-2 text-ink-2',
                  e.kind === 'event' && 'border-line bg-surface-2 text-ink-3',
                )}
                aria-hidden
              >
                {GLYPH[e.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] text-ink">
                  <span className="font-semibold">{e.title}.</span> {e.detail}
                </div>
                <div className="mt-0.5 text-[11.5px] text-ink-3">{e.server}</div>
              </div>
              <span className="tnum shrink-0 text-[12px] text-ink-3">{e.time}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-4 flex items-center gap-2">
        <StatusPill tone="muted">демо-лента</StatusPill>
        <span className="text-[12px] text-ink-3">
          Живые события появятся после привязки пары Rust+ в боте.
        </span>
      </div>
    </div>
  )
}
