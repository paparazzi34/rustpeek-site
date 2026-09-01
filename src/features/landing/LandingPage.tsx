import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Signature } from '../../components/charts/Signature'
import { CycleTrack } from '../../components/CycleTrack'
import { IconTelegram } from '../../components/icons'
import { Button, Meter, SearchField, Tag } from '../../components/ui'
import { searchServers } from '../../lib/api'
import {
  nextWipe,
  relativeWipe,
  serverTypeLabel,
  thousands,
  wipeAgeHours,
} from '../../lib/format'
import type { ServerListItem } from '../../lib/types'
import { Ticker } from './Ticker'

const HINTS = ['Rustafied', 'Atlas', 'Magic Rust', 'Bestrust', 'Rustoria']

export function LandingPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <>
      <Hero q={q} setQ={setQ} onSubmit={() => navigate('/servers?q=' + encodeURIComponent(q.trim()))} />
      <Ticker />
      <FreshToday />
      <Method />
      <WhatICan />
      <Faq />
      <Cta />
    </>
  )
}

/* ------------------------------------------------------------------- Герой
   Не «крупное число + подпись + градиент». Экран открывает утверждение и
   сразу под ним — предмет разговора: настоящая форма кривой с подписанным
   моментом вайпа. Метод объяснён раньше, чем про него спросили. */

function Hero({
  q,
  setQ,
  onSubmit,
}: {
  q: string
  setQ: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <section className="bleed border-b border-rule pt-8 pb-7 sm:pt-11">
      <h1
        className="stencil font-semibold text-ink"
        style={{ fontSize: 'clamp(27px, 4.3vw, 58px)', lineHeight: 0.98, letterSpacing: '0.01em' }}
      >
        Вайп видно по кривой.
        <br />
        <span className="text-ink-3">Не по названию сервера.</span>
      </h1>

      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        На всех мониторингах дату вайпа вписывает админ сервера — руками, когда вспомнит.
        Я её не спрашиваю: круглосуточно замеряю онлайн и вижу вайп по форме кривой.
        Эту подпись подделать нельзя.
      </p>

      <div className="mt-8 max-w-2xl">
        <SearchField
          value={q}
          onChange={setQ}
          onSubmit={onSubmit}
          size="lg"
          placeholder="Название сервера"
          action={
            <Button variant="solid" onClick={onSubmit} className="h-9 shrink-0">
              Найти
            </Button>
          }
        />
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-[12.5px]">
          <span className="text-ink-3">часто ищут</span>
          {HINTS.map((h) => (
            <button
              key={h}
              onClick={() => {
                setQ(h)
                setTimeout(onSubmit, 0)
              }}
              className="text-ink-2 underline decoration-rule-2 underline-offset-4 transition-colors hover:text-rust-hot hover:decoration-rust"
            >
              {h}
            </button>
          ))}
          <Link
            to="/players"
            className="ml-auto text-ink-3 transition-colors hover:text-ink"
          >
            или пробить игрока по SteamID →
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-2 flex items-baseline justify-between border-b border-rule pb-1.5">
          <span className="eyebrow">подпись вайпа · так это выглядит в данных</span>
          <span className="num hidden text-[11px] text-ink-3 sm:inline">
            онлайн, 14 суток
          </span>
        </div>
        <Signature />
      </div>
    </section>
  )
}

/* ------------------------------------------------ Свежие вайпы, живой срез
   Продукт лучше показать, чем описать. Это те же строки, что в списке
   серверов, только пять штук. Если подтверждённых вайпов за сутки нет —
   так и написано, с причиной. */

function FreshToday() {
  const [rows, setRows] = useState<ServerListItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    searchServers({ filter: 'all', sort: 'wipe_fresh', calendar: 'today', limit: 5, offset: 0 })
      .then((r) => {
        if (!alive) return
        // Заголовок обещает «за последние сутки» — значит и показать надо
        // ровно это. Отсекаем сами, а не надеемся на параметр запроса:
        // подпись и содержимое обязаны совпадать.
        const fresh = (r.servers ?? []).filter((s) => {
          const h = wipeAgeHours(s.wipe_label)
          return h != null && h < 24
        })
        setRows(fresh.slice(0, 5))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  if (failed) return null

  return (
    <section className="bleed py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-2.5">
        <div>
          <div className="eyebrow">вайпнулись за последние сутки</div>
          <h2 className="mt-2 text-[19px] font-semibold text-ink">Куда заходить сегодня</h2>
        </div>
        <Link to="/servers?calendar=today" className="btn h-8">
          Весь вайп-календарь
        </Link>
      </div>

      {rows == null ? (
        <div className="space-y-px pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[52px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="max-w-2xl py-8 text-[13.5px] text-ink-2">
          За последние 24 часа ни на одном сервере не было подтверждённого вайпа. Это не сбой —
          просто сегодня тихо.{' '}
          <Link to="/servers?calendar=tomorrow" className="text-rust-hot underline underline-offset-4">
            Посмотри, кто вайпается завтра
          </Link>
          .
        </p>
      ) : (
        <ul className="pt-1">
          {rows.map((s, i) => (
            <FreshRow key={s.id} s={s} rank={i + 1} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FreshRow({ s, rank }: { s: ServerListItem; rank: number }) {
  const since = wipeAgeHours(s.wipe_label)
  const next = nextWipe(s.next_wipe_estimate)
  return (
    <li className="row border-b border-rule" data-flag={since != null && since < 24 ? 'fresh' : undefined}>
      <Link
        to={`/servers/${s.id}`}
        className="grid grid-cols-[26px_1fr_auto] items-center gap-x-4 py-3 pl-3 sm:grid-cols-[26px_1fr_150px_180px]"
      >
        <span className="num text-[12px] text-ink-3">{rank}</span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-ink">{s.name}</span>
          <span className="mt-0.5 block text-[11.5px] text-ink-3">
            {serverTypeLabel(s.type)}
            {s.rate && ` · ${s.rate}`} · вайп {relativeWipe(s.wipe_label)}
          </span>
        </span>
        <span className="hidden sm:block">
          <span className="num block text-[13px] text-ink">
            {thousands(s.online)}
            <span className="text-ink-3"> / {thousands(s.max)}</span>
          </span>
          <span className="mt-1 block">
            <Meter value={s.online} max={s.max} />
          </span>
        </span>
        <span className="hidden sm:block">
          <CycleTrack sinceHours={since} untilHours={next.hours} height={16} />
          <span className="mt-1 block text-right text-[11.5px] text-ink-3">{next.text}</span>
        </span>
      </Link>
    </li>
  )
}

/* -------------------------------------------------------------------- Метод
   Метод объясняется противопоставлением, а не нумерованным списком:
   у продукта ровно один конкурентный тезис, и он про разницу между тем,
   что написано, и тем, что измерено. */

const CONTRAST: Array<[string, string]> = [
  ['Поле «последний вайп»', 'Форма кривой онлайна'],
  ['Заполняет админ сервера руками', 'Считается автоматически, круглосуточно'],
  ['«JUST WIPED» в названии висит месяцами', 'Провал до нуля виден один раз и в конкретный час'],
  ['Прогноза нет — только последняя дата', 'Интервалы между вайпами дают следующий'],
  ['Врать выгодно: свежесть притягивает онлайн', 'Врать нечем: кривую рисуют сами игроки'],
]

function Method() {
  return (
    <section id="method" className="border-y border-rule bg-panel">
      <div className="bleed py-12">
        <div className="eyebrow">метод</div>
        <h2 className="mt-3 max-w-3xl text-[26px] leading-tight font-semibold text-ink sm:text-[32px]">
          Слова админа и показания прибора — это разные источники
        </h2>

        <div className="mt-9 grid gap-px sm:grid-cols-2">
          <div className="pr-0 sm:pr-8">
            <div className="eyebrow border-b border-rule pb-2">так делают остальные</div>
            <ul>
              {CONTRAST.map(([a]) => (
                <li key={a} className="border-b border-rule py-3 text-[13.5px] text-ink-3">
                  {a}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-l-0 border-rule sm:border-l sm:pl-8">
            <div className="eyebrow border-b border-rule pb-2" style={{ color: 'var(--color-rust-hot)' }}>
              так делаю я
            </div>
            <ul>
              {CONTRAST.map(([, b]) => (
                <li key={b} className="border-b border-rule py-3 text-[13.5px] text-ink">
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          Побочный эффект метода: иногда кривая не складывается в цикл — сервер вайпается
          нерегулярно или наблюдение началось недавно. Тогда в прогнозе стоит{' '}
          <span className="text-ink">«цикл не определён»</span>, а не выдуманное число. Это
          неудобно, зато на это можно опереться.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- Что умею */

const ABILITIES: Array<{ title: string; body: string; to?: string; soon?: boolean }> = [
  {
    title: 'Вайп-календарь',
    body: 'Список серверов, собранный не по онлайну, а по тому, когда там вайп: сегодня, завтра, на неделе.',
    to: '/servers',
  },
  {
    title: 'Карточка сервера',
    body: 'Вердикт одной фразой, график онлайна с отметками подтверждённых вайпов, прайм-тайм по часам и вся история вайпов.',
    to: '/servers',
  },
  {
    title: 'Досье игрока',
    body: 'По SteamID: возраст аккаунта, часы в Rust, баны, Trust Score с разбором по факторам и где этого человека видели.',
    to: '/players',
  },
  {
    title: 'Вочлист',
    body: 'Слежу за конкретными людьми и говорю, когда они заходят на сервер. Нужна авторизация через телеграм.',
    soon: true,
  },
  {
    title: 'Рейд-алерты Rust+',
    body: 'Подключаю Rust+ и пишу в телеграм, когда по базе стучат. Нужна авторизация через телеграм.',
    soon: true,
  },
]

function WhatICan() {
  return (
    <section id="can" className="bleed py-12">
      <div className="eyebrow">что умею</div>
      <div className="mt-5 border-t border-rule">
        {ABILITIES.map((a) => {
          const inner = (
            <div className="grid gap-x-8 gap-y-1.5 py-4 sm:grid-cols-[240px_1fr] sm:items-baseline">
              <h3 className="flex items-baseline gap-2.5 text-[15px] font-semibold text-ink">
                {a.title}
                {a.soon && (
                  <span className="eyebrow" style={{ letterSpacing: '0.1em' }}>
                    в боте
                  </span>
                )}
              </h3>
              <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-2">{a.body}</p>
            </div>
          )
          return a.to ? (
            <Link
              key={a.title}
              to={a.to}
              className="row block border-b border-rule px-3 transition-colors"
            >
              {inner}
            </Link>
          ) : (
            <div key={a.title} className="border-b border-rule px-3 opacity-70">
              {inner}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Вопросы */

const FAQ: Array<[string, string]> = [
  [
    'Откуда берутся данные',
    'Онлайн снимается круглосуточно: BattleMetrics API для широкого охвата и прямой A2S-запрос к топ-500 серверов. Сейчас в базе около 2 600 серверов и больше двух миллионов замеров.',
  ],
  [
    'Что считается вайпом',
    'Три события подряд: сервер жил суточной волной, онлайн обвалился почти в ноль, следом пошёл резкий рост. Одиночный рестарт или ночное затишье под это не подходят.',
  ],
  [
    'Почему у некоторых серверов нет прогноза',
    'Потому что интервалы между вайпами разъезжаются или наблюдение началось недавно. Придумать число можно, опереться на него нельзя — поэтому там честное «цикл не определён».',
  ],
  [
    'Поиск по нику работает',
    'Нет. Игрока ищу по SteamID64 или по ссылке на профиль Steam. Если в ссылке ник вместо цифр — вставляй ссылку целиком, разберусь сам.',
  ],
  [
    'Чем это отличается от BattleMetrics',
    'BattleMetrics отвечает на вопрос «что на сервере сейчас». Я отвечаю на вопрос «что там было и что будет» — потому что храню историю и считаю по ней циклы.',
  ],
]

function Faq() {
  return (
    <section id="faq" className="border-t border-rule bg-panel">
      <div className="bleed py-12">
        <div className="eyebrow">вопросы</div>
        <dl className="mt-5 border-t border-rule">
          {FAQ.map(([q, a]) => (
            <div
              key={q}
              className="grid gap-x-8 gap-y-1.5 border-b border-rule py-4 sm:grid-cols-[300px_1fr]"
            >
              <dt className="text-[14px] font-semibold text-ink">{q}</dt>
              <dd className="m-0 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- CTA */

function Cta() {
  return (
    <section className="bleed border-t border-rule py-14">
      <h2
        className="stencil font-semibold text-ink"
        style={{ fontSize: 'clamp(26px, 4.4vw, 54px)', lineHeight: 1 }}
      >
        Сначала посмотри данные.
        <br />
        <span className="text-ink-3">Потом решай, куда заходить.</span>
      </h2>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link to="/servers" className="btn btn-solid h-10 px-5">
          Открыть список серверов
        </Link>
        <a
          href="https://t.me/RustPeek_Bot"
          target="_blank"
          rel="noopener"
          className="btn h-10 px-5"
        >
          <IconTelegram size={14} />
          Тот же мониторинг в телеграме
        </a>
        <Tag tone="mute" className="ml-1">
          вочлист и рейд-алерты — пока только в боте
        </Tag>
      </div>
    </section>
  )
}
