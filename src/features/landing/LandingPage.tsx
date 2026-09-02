import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Signature } from '../../components/charts/Signature'
import { CycleTrack } from '../../components/CycleTrack'
import { IconTelegram } from '../../components/icons'
import { Button, Meter, SearchField, Segmented, cx } from '../../components/ui'
import { searchServers } from '../../lib/api'
import { nextWipe, relativeWipe, serverTypeLabel, thousands, wipeAgeHours } from '../../lib/format'
import type { FilterKey, ServerListItem } from '../../lib/types'
import { LiveSample } from './LiveSample'
import { LiveStrip, useCountUp, useSiteStats } from './LiveStrip'

const HINTS = ['Rustafied', 'Atlas', 'Magic Rust', 'Bestrust', 'Rustoria']

export function LandingPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <>
      <Hero q={q} setQ={setQ} onSubmit={() => navigate('/servers?q=' + encodeURIComponent(q.trim()))} />
      <LiveStrip />
      <FreshToday />
      <Method />
      <WhatICan />
      <Faq />
      <Cta />
    </>
  )
}

/* ------------------------------------------------------------------- Герой

   Две колонки, не одна. Слева — что это за сервис и поиск, справа настоящий
   сервер с настоящей кривой. Первый экран занят целиком, а обещание и его
   доказательство стоят рядом и читаются вместе.

   Заголовок назван по задаче игрока, а не по методу: человек приходит с
   вопросом «куда зайти», а не «как вы считаете вайпы». Цифры наблюдения
   ушли в строку под заголовком — они остались, но перестали кричать. */

function Hero({
  q,
  setQ,
  onSubmit,
}: {
  q: string
  setQ: (v: string) => void
  onSubmit: () => void
}) {
  const stats = useSiteStats()

  return (
    <section className="bleed border-b border-rule py-9 lg:py-12">
      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)]">
        <div className="min-w-0">
          <h1
            className="stencil font-semibold text-ink"
            style={{ fontSize: 'clamp(26px, 3.2vw, 44px)', lineHeight: 1.04 }}
          >
            Вайп-календарь Rust
          </h1>

          <p className="mt-4 text-[17px] leading-snug text-ink-2">
            Где вайп был сегодня, где будет завтра.
          </p>

          {/* Цифры не исчезли, а перестали кричать: теперь это строка
              под заголовком, а не сам заголовок. Значения живые. */}
          <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12.5px] text-ink-3">
            <Stat value={stats.servers_total} label="серверов" />
            <span className="text-rule-2">·</span>
            <Stat value={stats.online_measurements} label="замеров" />
            <span className="text-rule-2">·</span>
            <Stat value={stats.wipes} label="вайпов подтверждено" />
          </p>

          <div className="mt-7 max-w-xl">
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
            </div>
            <Link
              to="/players"
              className="mt-3 inline-block text-[12.5px] text-ink-3 transition-colors hover:text-ink"
            >
              или пробить игрока по SteamID →
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <LiveSample />
        </div>
      </div>
    </section>
  )
}

/** Цифра в строке под заголовком: докручивается до настоящего значения. */
function Stat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value)
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="num text-[13.5px] text-ink">{thousands(shown)}</span>
      <span>{label}</span>
    </span>
  )
}

/* ------------------------------------------------ Свежие вайпы, живой срез */

const QUICK: Array<{ value: FilterKey; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'mod', label: 'Моды' },
]

const MAX_ROWS = 5
const REFRESH_MS = 60_000

function FreshToday() {
  const [all, setAll] = useState<ServerListItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const prev = useRef(new Map<number, number>())
  const [changed, setChanged] = useState<Set<number>>(new Set())

  // Тянем с запасом и фильтруем на месте: переключение вкладок тогда
  // мгновенное, без похода на сервер за каждым кликом.
  useEffect(() => {
    let alive = true
    const pull = () => {
      searchServers({ filter: 'all', sort: 'wipe_fresh', calendar: 'today', limit: 30, offset: 0 })
        .then((r) => {
          if (!alive) return
          // Заголовок обещает «за последние сутки» — значит и показать надо
          // ровно это. Отсекаем сами: подпись и содержимое обязаны совпадать.
          const fresh = (r.servers ?? []).filter((s) => {
            const h = wipeAgeHours(s.wipe_label)
            return h != null && h < 24
          })

          // Отмечаем строки, у которых онлайн изменился с прошлого замера —
          // они мигнут. Движение здесь означает «пришли новые данные»,
          // а не «нам захотелось анимации».
          const moved = new Set<number>()
          for (const s of fresh) {
            const was = prev.current.get(s.id)
            if (was != null && was !== s.online) moved.add(s.id)
            prev.current.set(s.id, s.online)
          }
          setChanged(moved)
          setAll(fresh)
          setUpdatedAt(new Date())
        })
        .catch(() => alive && setFailed(true))
    }
    pull()
    const t = setInterval(pull, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  if (failed) return null

  const rows =
    all == null
      ? null
      : all.filter((s) => filter === 'all' || s.type === filter).slice(0, MAX_ROWS)

  return (
    <section className="bleed py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-2.5">
        <div>
          <div className="eyebrow">вайпнулись за последние сутки</div>
          <h2 className="mt-2 text-[19px] font-semibold text-ink">Куда заходить сегодня</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={filter}
            options={QUICK}
            onChange={setFilter}
            ariaLabel="Быстрый фильтр"
          />
          <Link to="/servers?calendar=today" className="btn h-8">
            Весь календарь
          </Link>
        </div>
      </div>

      {rows == null ? (
        <div className="pt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton mb-px h-[52px]" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="max-w-2xl py-8 text-[13.5px] text-ink-2">
          {filter === 'all' ? (
            <>
              За последние 24 часа ни на одном сервере не было подтверждённого вайпа. Это не
              сбой — просто сегодня тихо.{' '}
              <Link
                to="/servers?calendar=tomorrow"
                className="text-rust-hot underline underline-offset-4"
              >
                Посмотри, кто вайпается завтра
              </Link>
              .
            </>
          ) : (
            <>
              Свежие вайпы за сутки есть, но среди них нет ни одного{' '}
              {filter === 'vanilla' ? 'ванильного' : 'модового'} сервера.{' '}
              <button
                className="text-rust-hot underline underline-offset-4"
                onClick={() => setFilter('all')}
              >
                Показать все
              </button>
              .
            </>
          )}
        </p>
      ) : (
        <>
          <ul className="pt-1">
            {rows.map((s, i) => (
              <FreshRow key={s.id} s={s} rank={i + 1} flash={changed.has(s.id)} />
            ))}
          </ul>
          {updatedAt && (
            <p className="mt-3 flex items-center gap-2 text-[11.5px] text-ink-3">
              <span className="live-dot block size-1.5 bg-good" />
              обновляется само · последний замер{' '}
              <span className="num">
                {String(updatedAt.getHours()).padStart(2, '0')}:
                {String(updatedAt.getMinutes()).padStart(2, '0')}
              </span>
            </p>
          )}
        </>
      )}
    </section>
  )
}

function FreshRow({ s, rank, flash }: { s: ServerListItem; rank: number; flash?: boolean }) {
  const since = wipeAgeHours(s.wipe_label)
  const next = nextWipe(s.next_wipe_estimate)
  return (
    <li
      key={`${s.id}-${s.online}`}
      className={cx('row border-b border-rule', flash && 'flash')}
      data-flag="fresh"
    >
      <Link
        to={`/servers/${s.id}`}
        className="grid grid-cols-[26px_1fr] items-center gap-x-5 gap-y-2 py-3 pl-3 sm:grid-cols-[26px_1fr_150px_200px]"
      >
        <span className="num text-[12px] text-ink-3">{rank}</span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-ink">{s.name}</span>
          <span className="mt-0.5 block text-[11.5px] text-ink-3">
            {serverTypeLabel(s.type)}
            {s.rate && ` · ${s.rate}`} · вайп{' '}
            <span className="text-good">{relativeWipe(s.wipe_label)}</span>
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
        <span className="hidden pr-1 sm:block">
          <CycleTrack sinceHours={since} untilHours={next.hours} height={16} />
          <span className="mt-1 block text-right text-[11.5px] text-ink-3">{next.text}</span>
        </span>
      </Link>
    </li>
  )
}

/* -------------------------------------------------------------------- Метод

   Раньше здесь стояли две колонки по пять строк — двадцать одинаковых
   реплик подряд, стена. Теперь метод объясняет схема кривой, потому что
   весь метод и есть форма кривой, а слева от неё три строки различия.
   Три, а не пять: остальные две были пересказом этих же. */

const CONTRAST: Array<[string, string]> = [
  ['Дату вайпа вписывает админ', 'Дата считается по форме кривой'],
  ['«JUST WIPED» висит месяцами', 'Провал до нуля виден в конкретный час'],
  ['Прогноза нет — только последняя дата', 'Интервалы между вайпами дают следующий'],
]

function Method() {
  return (
    <section id="method" className="border-y border-rule bg-panel">
      <div className="bleed py-12">
        <div className="grid gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,34%)_minmax(0,1fr)]">
          <div>
            <div className="eyebrow">как это работает</div>
            <h2 className="mt-3 text-[23px] leading-tight font-semibold text-ink sm:text-[27px]">
              У настоящего вайпа есть форма
            </h2>
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">
              Сервер жил суточной волной. Онлайн обвалился почти в ноль — карту стёрли, всех
              выкинуло. Следом резкий рост: все зашли заново. Три события подряд, и только они
              считаются вайпом. Одиночный рестарт или ночное затишье под это не подходят.
            </p>

            <dl className="mt-7 m-0 border-t border-rule">
              {CONTRAST.map(([a, b]) => (
                <div key={a} className="border-b border-rule py-3">
                  <dt className="text-[12.5px] text-ink-3 line-through decoration-rule-2">{a}</dt>
                  <dd className="m-0 mt-1 text-[13.5px] text-ink">{b}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="min-w-0">
            <Signature />
            <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-ink-2">
              Побочный эффект метода: иногда кривая не складывается в цикл — сервер вайпается
              нерегулярно или наблюдение началось недавно. Тогда в прогнозе стоит{' '}
              <span className="text-ink">«цикл не определён»</span>, а не выдуманное число.
              Это неудобно, зато на это можно опереться.
            </p>
          </div>
        </div>
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
            <div className="grid gap-x-10 gap-y-1.5 py-4 sm:grid-cols-[260px_1fr] sm:items-baseline">
              <h3 className="flex items-baseline gap-2.5 text-[15px] font-semibold text-ink">
                {a.title}
                {a.soon && (
                  <span className="eyebrow" style={{ letterSpacing: '0.1em' }}>
                    в боте
                  </span>
                )}
              </h3>
              <p className="max-w-3xl text-[13.5px] leading-relaxed text-ink-2">{a.body}</p>
            </div>
          )
          return a.to ? (
            <Link key={a.title} to={a.to} className="row block border-b border-rule px-3">
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
    'Онлайн снимается круглосуточно: BattleMetrics API для широкого охвата и прямой A2S-запрос к топ-500 серверов.',
  ],
  [
    'Что считается вайпом',
    'Три события подряд: суточная волна, обвал почти в ноль, резкий рост. Одиночный рестарт или ночное затишье под это не подходят.',
  ],
  [
    'Почему у некоторых серверов нет прогноза',
    'Интервалы между вайпами разъезжаются или наблюдение началось недавно. Придумать число можно, опереться на него нельзя — поэтому там честное «цикл не определён».',
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
        <dl className="mt-5 m-0 grid gap-x-12 border-t border-rule lg:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="border-b border-rule py-4">
              <dt className="text-[14px] font-semibold text-ink">{q}</dt>
              <dd className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-ink-2">{a}</dd>
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
        style={{ fontSize: 'clamp(24px, 4vw, 48px)', lineHeight: 1.02 }}
      >
        Сначала посмотри данные.
        <br />
        <span className="text-ink-3">Потом решай, куда заходить.</span>
      </h2>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link to="/servers" className="btn btn-solid h-10 px-5">
          Открыть список серверов
        </Link>
        <a href="https://t.me/RustPeek_Bot" target="_blank" rel="noopener" className="btn h-10 px-5">
          <IconTelegram size={14} />
          Тот же мониторинг в телеграме
        </a>
        <span className="text-[12.5px] text-ink-3">
          вочлист и рейд-алерты — пока только в боте
        </span>
      </div>
    </section>
  )
}
