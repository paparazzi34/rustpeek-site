import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { OnlineChart } from '../../components/charts/OnlineChart'
import { PrimeTime } from '../../components/charts/PrimeTime'
import { CycleTrackLarge } from '../../components/CycleTrack'
import { IconArrowLeft } from '../../components/icons'
import { ErrorState, Meter, Segmented, Skeleton, Tag, cx } from '../../components/ui'
import { getHistory, getHourlyProfile, getServer, getWipes } from '../../lib/api'
import {
  WEEKDAYS_SHORT,
  activityLabel,
  intervalText,
  isJunkMapName,
  nextWipe,
  parseSqlDateTime,
  plural,
  relativeWipe,
  serverTypeLabel,
  shortDateTime,
  thousands,
  wipeAgeHours,
} from '../../lib/format'
import type { NextWipe } from '../../lib/format'
import type { HistoryResponse, HourlyProfile, Period, ServerDetail, WipeRow } from '../../lib/types'

/* СТРАНИЦА СЕРВЕРА.

   Порядок продиктован тем, в каком порядке человек задаёт вопросы:
     1. «Стоит туда идти?»      → вердикт одной фразой, крупно, первым делом
     2. «На каком мы этапе?»    → трек фазы цикла во всю ширину
     3. «Сколько там людей?»    → полоса метрик
     4. «Покажи, откуда знаешь» → график с рубцами вайпов
     5. «Когда там людно?»      → прайм-тайм
     6. «А раньше как было?»    → история вайпов
     7. «Технические детали»    → в самом низу, потому что спрашивают редко

   Всё разделено линиями, ни одного блока в рамке: страница читается
   сверху вниз одним движением, а не собирается из плиток. */

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '24h', label: '24 ч' },
  { value: '7d', label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all', label: 'всё' },
]

export function ServerDetailPage() {
  const { id } = useParams()
  const serverId = Number(id)

  const [server, setServer] = useState<ServerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>('7d')
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [wipes, setWipes] = useState<WipeRow[] | null>(null)
  const [hourly, setHourly] = useState<HourlyProfile | null>(null)

  useEffect(() => {
    let alive = true
    setServer(null)
    setError(null)
    getServer(serverId)
      .then((s) => alive && setServer(s))
      .catch(() => alive && setError('Сервер не найден или бэкенд молчит.'))
    getWipes(serverId)
      .then((r) => alive && setWipes(r.wipes ?? []))
      .catch(() => alive && setWipes([]))
    getHourlyProfile(serverId)
      .then((r) => alive && setHourly(r))
      .catch(() => alive && setHourly(null))
    return () => {
      alive = false
    }
  }, [serverId])

  useEffect(() => {
    let alive = true
    setHistory(null)
    getHistory(serverId, period)
      .then((h) => alive && setHistory(h))
      .catch(() => alive && setHistory({ points: [] }))
    return () => {
      alive = false
    }
  }, [serverId, period])

  if (error) {
    return (
      <div className="bleed pt-6">
        <ErrorState title={error} />
        <Link to="/servers" className="btn mt-4 h-8">
          Ко всем серверам
        </Link>
      </div>
    )
  }

  // Сквозной номер подтверждённого вайпа — общий для рубцов на графике и
  // строк таблицы: подпись под графиком обещает, что они совпадают.
  const wipeNumbers = useMemo(() => {
    const confirmed = (wipes ?? [])
      .filter((w) => !w.suspicious)
      .map((w) => w.wipe_time)
      .sort()
    return new Map(confirmed.map((t, i) => [t, i + 1]))
  }, [wipes])

  if (!server) {
    return (
      <div className="bleed space-y-3 pt-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  const since = wipeAgeHours(server.wipe)
  const next = nextWipe(server.next_wipe_estimate)
  // Цикл неизвестен, но глобал близко — честная граница «не позже».
  const bound = next.tone === 'unknown' ? forcedBound(server) : null
  const fresh = since != null && since < 24
  const fill = server.max > 0 ? server.online / server.max : 0

  return (
    <>
      <Header server={server} />

      <Verdict server={server} since={since} next={next} bound={bound} fill={fill} fresh={fresh} />

      {/* ---- Фаза цикла: подписной элемент, во всю ширину ---- */}
      <section className="bleed border-b border-rule py-5">
        <CycleTrackLarge
          sinceHours={since}
          untilHours={bound ? bound.hours : next.hours}
          wipedAt={server.wipe ?? 'нет данных'}
          nextAt={shortDateTime(bound ? server.forced_wipe : server.next_wipe_estimate) ?? '—'}
          forced={server.next_wipe_forced}
          upperBound={bound != null}
        />
      </section>

      <Metrics server={server} />

      {/* ---- График онлайна ---- */}
      <section className="bleed border-b border-rule py-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">онлайн по времени</div>
            <p className="mt-1.5 max-w-xl text-[13px] text-ink-2">
              Вертикальные рубцы — подтверждённые вайпы. Номер на рубце совпадает с номером
              строки в истории ниже.
            </p>
          </div>
          <Segmented value={period} options={PERIODS} onChange={setPeriod} ariaLabel="Период" />
        </div>
        {history == null ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <OnlineChart
            points={history.points}
            wipes={history.wipes}
            granularity={history.granularity}
            wipeNumbers={wipeNumbers}
          />
        )}
      </section>

      {/* ---- Прайм-тайм ---- */}
      <section className="bleed border-b border-rule py-6">
        <div className="eyebrow mb-4">когда там людно · средний онлайн по часам, 30 дней</div>
        {hourly ? (
          <PrimeTime hours={hourly.hours} peakHour={hourly.peak_hour} />
        ) : (
          <Skeleton className="h-[104px] w-full" />
        )}
      </section>

      {/* ---- История вайпов + техданные ---- */}
      <div className="grid lg:grid-cols-[1fr_300px]">
        <WipeHistory wipes={wipes} wipeNumbers={wipeNumbers} />
        <TechPanel server={server} />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ Шапка */

function Header({ server }: { server: ServerDetail }) {
  const activity = activityLabel(server.activity_status)
  const map = isJunkMapName(server.map_name) ? null : server.map_name

  return (
    <div className="bleed border-b border-rule pt-4 pb-5">
      <Link
        to="/servers"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink"
      >
        <IconArrowLeft size={13} />
        Ко всем серверам
      </Link>

      <h1
        className="mt-3 text-[26px] leading-tight font-semibold text-ink sm:text-[32px]"
        style={{ letterSpacing: '-0.01em' }}
      >
        {server.name}
      </h1>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
        <span>{serverTypeLabel(server.type)}</span>
        {server.rate && <span className="num">{server.rate}</span>}
        {activity && <span>{activity}</span>}
        {map && <span>{map}</span>}
        {server.map_size && <span className="num">карта {server.map_size}</span>}
        {server.ip && (
          <span className="num">
            {server.ip}
            {server.port ? ':' + server.port : ''}
          </span>
        )}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Вердикт
   Одна фраза человеческим языком. Это первое, что читают, и часто
   единственное, что читают — поэтому она набрана крупно и стоит выше
   любых графиков. Цифры внутри фразы — моноширинные, слова — обычные. */

function Verdict({
  server,
  since,
  next,
  fill,
  fresh,
  bound,
}: {
  server: ServerDetail
  since: number | null
  next: ReturnType<typeof nextWipe>
  fill: number
  fresh: boolean
  bound: NextWipe | null
}) {
  const state =
    server.online_stale
      ? 'нет свежих данных'
      : fill >= 0.95
        ? 'забит под завязку'
        : fill >= 0.75
          ? 'почти полный'
          : server.activity_status === 'growing'
            ? 'заполняется'
            : server.activity_status === 'draining'
              ? 'пустеет'
              : fill < 0.1
                ? 'практически пустой'
                : 'ровный онлайн'

  return (
    <section
      className={cx(
        'bleed border-b border-rule py-6',
        fresh ? 'border-l-2 border-l-good' : 'border-l-2 border-l-transparent',
      )}
    >
      <div className="eyebrow">вердикт</div>
      <p className="mt-3 max-w-4xl text-[19px] leading-snug text-ink sm:text-[23px]">
        {since == null ? (
          <>Подтверждённого вайпа в памяти пока нет.</>
        ) : (
          <>
            Вайпнулся{' '}
            <span className={fresh ? 'text-good' : undefined}>{relativeWipe(server.wipe)}</span>
          </>
        )}
        {' · '}
        {state}
        {!server.online_stale && (
          <>
            ,{' '}
            <span className="num">{thousands(server.online)}</span> из{' '}
            <span className="num">{thousands(server.max)}</span>
          </>
        )}
        {' · '}
        {next.tone === 'unknown' && bound ? (
          <>
            следующий не позже чем{' '}
            <span className={bound.tone === 'soon' ? 'text-warn' : undefined}>{bound.text}</span>
            <span className="text-ink-3"> — глобальный вайп</span>
          </>
        ) : next.tone === 'unknown' ? (
          <span className="text-ink-3">следующий вайп — цикл не определён</span>
        ) : (
          <>
            следующий{' '}
            <span className={next.tone === 'soon' ? 'text-warn' : undefined}>{next.text}</span>
            {server.next_wipe_forced && <span className="text-ink-3"> — глобальный вайп</span>}
          </>
        )}
      </p>

      <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-ink-2">
        {next.tone === 'unknown' ? (
          <>
            Интервалы между вайпами на этом сервере не складываются в ровный цикл — либо админ
            вайпает нерегулярно, либо наблюдение началось недавно. Придумать дату можно, опереться
            на неё нельзя.
            {bound && (
              <>
                {' '}
                Одно известно точно: в первый четверг месяца Facepunch вайпает все серверы
                принудительно, так что не позже{' '}
                <span className="num text-ink">{shortDateTime(server.forced_wipe)}</span> карта
                сменится и здесь.
              </>
            )}
          </>
        ) : server.cycle && server.cycle_source === 'name' ? (
          <>
            Цикл <DaysValue text={server.cycle} className="text-ink" /> заявил админ в названии
            сервера. Своих подтверждённых вайпов для проверки пока мало, но те, что есть, ему не
            противоречат.
          </>
        ) : server.cycle ? (
          <>
            Цикл <DaysValue text={server.cycle} className="text-ink" /> — это не слова админа, а
            среднее по интервалам между подтверждёнными вайпами из таблицы ниже.
          </>
        ) : (
          <>Прогноз построен по интервалам между подтверждёнными вайпами, а не по полю «last wipe».</>
        )}
        {server.next_wipe_forced && (
          <>
            {' '}
            Ближайший вайп — глобальный: в первый четверг месяца Facepunch вайпает все серверы
            принудительно, раньше собственного расписания.
          </>
        )}
      </p>
    </section>
  )
}

/* ----------------------------------------------------------- Полоса метрик
   Не плитки с рамками, а ряд значений через вертикальные линии. */

function Metrics({ server }: { server: ServerDetail }) {
  const cells: Array<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> = [
    {
      label: 'онлайн сейчас',
      value: server.online_stale ? (
        <span className="text-[17px] text-ink-3">нет данных</span>
      ) : (
        <>
          <span className="num">{thousands(server.online)}</span>
          <span className="num text-[15px] text-ink-3"> / {thousands(server.max)}</span>
        </>
      ),
      sub: server.online_stale ? 'последний замер не прошёл' : <Meter value={server.online} max={server.max} />,
    },
    {
      label: 'пик за всё наблюдение',
      value: <span className="num">{thousands(server.peak)}</span>,
      sub: server.avg != null ? <>средний {thousands(server.avg)}</> : undefined,
    },
    {
      label: 'цикл',
      value: server.cycle ? (
        <DaysValue text={server.cycle} />
      ) : (
        <span className="text-[17px] text-ink-3 italic">не определён</span>
      ),
      sub: server.cycle
        ? server.cycle_source === 'name'
          ? 'заявлен в названии'
          : 'по интервалам между вайпами'
        : 'интервалы разъезжаются',
    },
    {
      label: 'в базе',
      value: (
        <>
          <span className="num">{server.history_span_days ?? '—'}</span> дней
        </>
      ),
      sub: server.total_measurements != null ? (
        <>
          <span className="num">{thousands(server.total_measurements)}</span> замеров
        </>
      ) : undefined,
    },
  ]

  return (
    <section className="bleed border-b border-rule">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={cx(
              'py-4 pr-5',
              // На узком экране сетка 2×2: вертикальная линия только между
              // колонками, горизонтальная — между рядами. На широком —
              // один ряд из четырёх, линии только вертикальные.
              i % 2 === 1 ? 'border-l border-rule pl-5' : 'lg:border-l lg:border-rule lg:pl-5',
              i === 0 && 'lg:border-l-0 lg:pl-0',
              i >= 2 && 'border-t border-rule lg:border-t-0',
            )}
          >
            <div className="eyebrow">{c.label}</div>
            <div className="mt-2 text-[22px] leading-none font-semibold text-ink">{c.value}</div>
            <div className="mt-2 text-[11.5px] text-ink-3">{c.sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* --------------------------------------------------------- История вайпов
   Подозрительные записи не выбрасываются — это часть договора с читателем:
   показываю всё, что нашёл, включая то, в чём сомневаюсь. Но по умолчанию
   они свёрнуты: у серверов с ежедневным рестартом отбракованных строк в
   разы больше настоящих, и таблица превращалась в стену красных меток
   (у [US East] Facepunch 1 страница вырастала до 13 000 px). Интервалы
   считаются между показанными строками — иначе у настоящего вайпа стоял бы
   интервал до соседнего рестарта. */

function WipeHistory({
  wipes,
  wipeNumbers,
}: {
  wipes: WipeRow[] | null
  wipeNumbers: Map<string, number>
}) {
  const [showRejected, setShowRejected] = useState(false)
  const rejectedCount = useMemo(() => (wipes ?? []).filter((w) => w.suspicious).length, [wipes])
  const rows = useMemo(() => {
    const shown = (wipes ?? [])
      .filter((w) => showRejected || !w.suspicious)
      .slice()
      .sort((a, b) => (a.wipe_time < b.wipe_time ? -1 : 1))
    let prev: Date | null = null
    const withIntervals = shown.map((w) => {
      const d = parseSqlDateTime(w.wipe_time)
      const interval_hours = d && prev ? (d.getTime() - prev.getTime()) / 3_600_000 : null
      if (d) prev = d
      return { ...w, interval_hours }
    })
    return withIntervals.reverse()
  }, [wipes, showRejected])

  return (
    <section className="bleed border-b border-rule py-6 lg:border-r">
      <div className="eyebrow mb-4">
        история вайпов · {showRejected ? 'все записи, с отбракованными' : 'подтверждённые'}
      </div>

      {wipes == null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-[13.5px] text-ink-2">
          Подтверждённых вайпов пока нет. Наблюдение за этим сервером началось недавно — как
          только кривая покажет провал и рост, строка появится здесь.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="eyebrow w-8 pb-2 font-normal">#</th>
              <th className="eyebrow pb-2 font-normal">когда</th>
              <th className="eyebrow pb-2 font-normal">день</th>
              <th className="eyebrow pb-2 font-normal">интервал</th>
              <th className="eyebrow pb-2 text-right font-normal">пик за сутки</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const d = parseSqlDateTime(w.wipe_time)
              const n = wipeNumbers.get(w.wipe_time)
              return (
                <tr key={w.wipe_time} className="row border-b border-rule">
                  <td className="num w-8 py-2.5 pr-3 text-[12px] text-ink-3">{n ?? '·'}</td>
                  <td className="py-2.5">
                    <span className="num text-[13px] text-ink">{shortDateTime(w.wipe_time)}</span>
                    {w.suspicious && (
                      <Tag tone="bad" className="ml-3">
                        похоже на сбой замера
                      </Tag>
                    )}
                    {w.source_note && (
                      <span className="ml-3 text-[11.5px] text-ink-3">{w.source_note}</span>
                    )}
                  </td>
                  <td className="py-2.5 text-[12.5px] text-ink-2">
                    {d ? WEEKDAYS_SHORT[d.getDay()] : '—'}
                  </td>
                  <td className="num py-2.5 text-[12.5px] text-ink-2">
                    {w.interval_hours == null ? (
                      <span className="text-ink-3">первый в памяти</span>
                    ) : (
                      intervalText(w.interval_hours)
                    )}
                  </td>
                  <td className="num py-2.5 text-right text-[12.5px] text-ink-2">
                    {w.peak_after_24h == null ? '—' : thousands(w.peak_after_24h)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {wipes != null && rejectedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowRejected((v) => !v)}
          className="mt-4 text-[12.5px] text-ink-3 underline decoration-rule underline-offset-4 transition-colors hover:text-ink"
        >
          {showRejected
            ? 'Скрыть отбракованные записи'
            : `Ещё ${thousands(rejectedCount)} ${plural(rejectedCount, 'запись отбракована', 'записи отбраковано', 'записей отбраковано')} — рестарты и сбои замера. Показать`}
        </button>
      )}
    </section>
  )
}

/* ------------------------------------------------------------- Техданные */

function TechPanel({ server }: { server: ServerDetail }) {
  const map = isJunkMapName(server.map_name) ? null : server.map_name
  const rows: Array<[string, React.ReactNode]> = [
    ['Адрес', server.ip ? <span className="num">{server.ip}{server.port ? ':' + server.port : ''}</span> : '—'],
    ['Страна', server.country ? <span className="num uppercase">{server.country}</span> : '—'],
    ['Карта', map ?? '—'],
    ['Размер карты', server.map_size ? <span className="num">{server.map_size}</span> : '—'],
    ['Лимит группы', server.team_limit ?? '—'],
    ['Вайп чертежей', server.bp_wipe ?? '—'],
  ]

  return (
    <section className="bleed border-b border-rule py-6">
      <div className="eyebrow mb-4">сервер</div>
      <dl className="m-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-rule py-2">
            <dt className="text-[12.5px] text-ink-3">{k}</dt>
            <dd className="m-0 max-w-[60%] text-right text-[12.5px] text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
      <a
        href="https://t.me/RustPeek_Bot"
        target="_blank"
        rel="noopener"
        className="btn mt-4 w-full"
      >
        Следить за вайпами в боте
      </a>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-3">
        Бот напишет в телеграм, когда здесь подтвердится вайп. На сайте подписки пока нет.
      </p>
    </section>
  )
}

/* Число — моноширинным, слово — обычным: иначе «7 дней» набиралось цифровым
   шрифтом целиком, и пробел выходил вдвое шире. */
function DaysValue({ text, className }: { text?: string | null; className?: string }) {
  const m = /^(\d+)\s+(.*)$/.exec(text ?? '')
  if (!m) return <span className={className}>{text}</span>
  return (
    <span className={className}>
      <span className="num">{m[1]}</span> {m[2]}
    </span>
  )
}

/** Ближайший глобал как граница «не позже» — только если он в пределах 10 суток:
    за месяц до глобала такая граница ничего не говорит. */
function forcedBound(server: ServerDetail): NextWipe | null {
  const bound = nextWipe(server.forced_wipe)
  if (bound.tone === 'unknown' || bound.hours == null || bound.hours > 240) return null
  return bound
}
