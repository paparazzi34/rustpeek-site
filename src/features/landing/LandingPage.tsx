import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconTelegram } from '../../components/icons'
import { Button, SearchField, Segmented } from '../../components/ui'
import { searchServers } from '../../lib/api'
import { isNearlyEmpty, thousands, wipeAgeHours } from '../../lib/format'
import type { FilterKey, ServerListItem } from '../../lib/types'
import { ServerRow } from '../servers/ServersPage'
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
          <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] text-ink-3">
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
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1.5 text-[14px]">
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
              className="mt-3 inline-block text-[14px] text-ink-3 transition-colors hover:text-ink"
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
      <span className="num text-[15px] text-ink">{thousands(shown)}</span>
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

  // Тянем с запасом и фильтруем на месте: переключение вкладок тогда
  // мгновенное, без похода на сервер за каждым кликом.
  useEffect(() => {
    let alive = true
    const pull = () => {
      searchServers({ filter: 'all', sort: 'wipe_fresh', calendar: 'today', limit: 80, offset: 0 })
        .then((r) => {
          if (!alive) return
          // Заголовок обещает «за последние сутки» — значит и показать надо
          // ровно это. Отсекаем сами: подпись и содержимое обязаны совпадать.
          // «Куда заходить» — значит туда, где есть люди (2026-10-02): почти
          // пустые серверы с пиком меньше EMPTY_PEAK_24H за сутки сюда не
          // попадают, а из живых первыми идут самые населённые.
          const fresh = (r.servers ?? [])
            .filter((s) => {
              const h = wipeAgeHours(s.wipe_label)
              return h != null && h < 24 && !isNearlyEmpty(s) && !s.frequent_rebirth
            })
            .sort((a, b) => b.online - a.online)

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
      <div className="plate px-4 pt-6 pb-4 sm:px-5">
      <span className="plate-tab" data-tone="good">вайп за последние сутки · есть люди</span>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-2.5">
        <div>
          <h2 className="text-[19px] font-semibold text-ink">Куда заходить сегодня</h2>
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
        <p className="max-w-2xl py-8 text-[15px] text-ink-2">
          {filter === 'all' ? (
            <>
              За последние 24 часа ни один сервер с живым онлайном не вайпался. Это не сбой —
              просто сегодня тихо.{' '}
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
              Свежие вайпы за сутки есть, но среди населённых нет ни одного{' '}
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
          {/* Та же строка, что в списке серверов — один вид на весь сайт */}
          <ul className="-mx-4 mt-2 sm:-mx-5">
            {rows.map((s) => (
              <ServerRow key={s.id} s={s} />
            ))}
          </ul>
          {updatedAt && (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-3">
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
      </div>
    </section>
  )
}


/* -------------------------------------------------------------------- Метод

   Переписано 2026-10-02. Прежний текст описывал старый метод — угадывание
   вайпа по форме кривой онлайна. Сейчас основа другая: сервер сам отдаёт
   время рождения своей карты, и это факт, а не догадка. Три плиты — три
   разных по силе источника, и ярлык на каждой говорит, насколько ему верить. */

const SOURCES: Array<{ tab: string; tone?: 'good'; title: string; body: string }> = [
  {
    tab: 'факт',
    tone: 'good',
    title: 'Сервер сам говорит, когда родилась карта',
    body: 'Каждый Rust-сервер отдаёт время рождения текущей карты. Опрашиваю его напрямую и записываю смену карты с точностью до минуты. Рестарт без новой карты вайпом не считается.',
  },
  {
    tab: 'правило',
    title: 'Глобал — первый четверг месяца',
    body: 'В этот день Facepunch вайпает все серверы принудительно, около 17:45 UTC. Если по своему расписанию сервер вайпнулся бы позже, показываю глобал.',
  },
  {
    tab: 'прогноз',
    title: 'Следующий вайп — из истории смен карты',
    body: 'Интервалы между прошлыми вайпами дают следующий. Где они не складываются в ровный цикл, пишу «цикл не определён», а не выдумываю дату.',
  },
]

function Method() {
  return (
    <section id="method" className="border-y border-rule bg-panel">
      <div className="bleed py-12">
        <div className="eyebrow">как это работает</div>
        <h2 className="mt-3 max-w-3xl text-[23px] leading-tight font-semibold text-ink sm:text-[27px]">
          BattleMetrics — это снимок. RustPeek — это память.
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Снимок показывает, что на сервере сейчас, и устаревает за минуту. Я записываю каждую
          смену карты и по этой истории знаю, когда был вайп и когда будет следующий.
        </p>

        <div className="mt-9 grid gap-x-4 gap-y-7 md:grid-cols-3">
          {SOURCES.map((s) => (
            <div key={s.title} className="plate bg-void px-4 pt-6 pb-5">
              <span className="plate-tab" data-tone={s.tone}>
                {s.tab}
              </span>
              <h3 className="text-[15px] leading-snug font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-ink-3">
          Есть серверы, которые время рождения карты не отдают. У них дата вайпа — оценка по
          провалу онлайна, и рядом с ней стоит «≈». Фактом я её не называю.
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- Что умею
   Сетка плит вместо пяти одинаковых строк: на сайте три раздела, в боте
   ещё два — и это видно по ярлыку, а не по мелкой приписке. */

const ABILITIES: Array<{ title: string; body: string; to?: string }> = [
  {
    title: 'Вайп-календарь',
    body: 'Серверы по дате вайпа: сегодня, завтра, на неделе. Почти пустые не мешают — они ниже.',
    to: '/servers',
  },
  {
    title: 'Карточка сервера',
    body: 'Когда был вайп и когда следующий, календарь вайпов на 5 недель, онлайн и часы пик.',
    to: '/servers',
  },
  {
    title: 'Досье игрока',
    body: 'По SteamID: возраст аккаунта, часы в Rust, баны и Trust Score с разбором, за что сняты баллы.',
    to: '/players',
  },
  {
    title: 'Вочлист',
    body: 'Слежу за конкретными людьми и пишу, когда они заходят на сервер.',
  },
  {
    title: 'Рейд-алерты Rust+',
    body: 'Подключаю Rust+ и пишу в телеграм, когда по базе стучат.',
  },
]

function WhatICan() {
  return (
    <section id="can" className="bleed py-12">
      <div className="eyebrow">что умею</div>
      <div className="mt-6 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {ABILITIES.map((a) => {
          const inner = (
            <>
              <span className="plate-tab">
                {a.to ? 'на сайте' : 'в боте'}
              </span>
              <h3 className="flex items-center justify-between gap-3 text-[15px] font-semibold text-ink">
                {a.title}
                <span aria-hidden className="text-ink-3">
                  →
                </span>
              </h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{a.body}</p>
            </>
          )
          return a.to ? (
            <Link key={a.title} to={a.to} className="plate block px-4 pt-6 pb-5">
              {inner}
            </Link>
          ) : (
            <a
              key={a.title}
              href="https://t.me/RustPeek_Bot"
              target="_blank"
              rel="noopener"
              className="plate block px-4 pt-6 pb-5"
            >
              {inner}
            </a>
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
    'Онлайн, слоты и время рождения карты спрашиваю у каждого сервера напрямую, круглосуточно. Названия и адреса серверов — из BattleMetrics.',
  ],
  [
    'Что считается вайпом',
    'Смена карты: сервер отдал новое время её рождения. Рестарт без новой карты — не вайп. Где смены карты не видно, дата — оценка по провалу онлайна, и рядом стоит «≈».',
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
    'Они показывают, что на сервере сейчас. Я храню историю каждого сервера и по ней отвечаю, когда был вайп и когда будет следующий.',
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
              <dt className="text-[15px] font-semibold text-ink">{q}</dt>
              <dd className="m-0 mt-1.5 text-[15px] leading-relaxed text-ink-2">{a}</dd>
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
        <span className="text-[14px] text-ink-3">
          вочлист и рейд-алерты — пока только в боте
        </span>
      </div>
    </section>
  )
}
