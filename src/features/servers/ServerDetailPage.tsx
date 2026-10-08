import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { OnlineChart } from '../../components/charts/OnlineChart'
import { PrimeTime } from '../../components/charts/PrimeTime'
import { IconArrowLeft } from '../../components/icons'
import { ErrorState, Meter, Segmented, Skeleton, Tag, cx } from '../../components/ui'
import { WipeCalendar } from '../../components/WipeCalendar'
import { getHistory, getHourlyProfile, getServer, getWipes } from '../../lib/api'
import {
  EMPTY_PEAK_24H,
  WEEKDAYS_SHORT,
  activityLabel,
  intervalText,
  isJunkMapName,
  longDateTime,
  nextWipe,
  parseSqlDateTime,
  parseWipeLabel,
  plural,
  relativeWipe,
  serverTypeLabel,
  shortDateTime,
  thousands,
  wipeAgeHours,
} from '../../lib/format'
import type { NextWipe } from '../../lib/format'
import type { HistoryResponse, HourlyProfile, Period, ServerDetail, WipeRow } from '../../lib/types'

/* СТРАНИЦА СЕРВЕРА (редизайн v4, 2026-10-07).

   Прежняя версия отвечала на вопрос «когда вайп» трижды — фразой, треком
   и полосой цифр — и при этом ни разу крупно. Теперь ответ один и сверху:
   панель «Ответ» с тремя крупными значениями (последний вайп, следующий,
   онлайн) и календарём вайпов рядом. Всё остальное — доказательства и
   подробности, ниже и спокойнее. */

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '24h', label: '24 ч' },
  { value: '7d', label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all', label: 'всё' },
]

const HISTORY_ROWS = 8

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

  // Сквозной номер подтверждённого вайпа — общий для рубцов на графике и
  // строк таблицы.
  const wipeNumbers = useMemo(() => {
    const confirmed = (wipes ?? [])
      .filter((w) => !w.suspicious)
      .map((w) => w.wipe_time)
      .sort()
    return new Map(confirmed.map((t, i) => [t, i + 1]))
  }, [wipes])

  const confirmedDates = useMemo(
    () =>
      (wipes ?? [])
        .filter((w) => !w.suspicious)
        .map((w) => parseSqlDateTime(w.wipe_time))
        .filter((d): d is Date => d != null),
    [wipes],
  )

  if (error) {
    return (
      <div className="bleed pt-8">
        <ErrorState title={error} />
        <Link to="/servers" className="btn mt-4">
          Ко всем серверам
        </Link>
      </div>
    )
  }

  if (!server) {
    return (
      <div className="bleed space-y-4 pt-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-[340px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  const since = wipeAgeHours(server.wipe)
  const next = nextWipe(server.next_wipe_estimate)
  const bound = next.tone === 'unknown' ? forcedBound(server) : null
  const observed = !server.wipe_basis || server.wipe_basis === 'map'
  const fresh = observed && since != null && since < 24

  return (
    <div className="bleed pt-6 pb-4">
      <Header server={server} />

      <Answer
        server={server}
        since={since}
        next={next}
        bound={bound}
        observed={observed}
        fresh={fresh}
        wipes={confirmedDates}
      />

      {/* ---- График онлайна ---- */}
      <section className="plate mt-6 p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="stencil text-[19px] text-ink">Онлайн</h2>
            <p className="mt-0.5 text-[14px] text-ink-3">
              Зелёные отметки — подтверждённые вайпы, номер совпадает с историей ниже.
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

      {/* ---- Часы пик + о сервере ---- */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="plate p-4 sm:p-6">
          <h2 className="stencil text-[19px] text-ink">Когда там людно</h2>
          <p className="mt-0.5 mb-5 text-[14px] text-ink-3">
            Средний онлайн по часам за 30 дней, в твоём времени.
          </p>
          {hourly ? (
            <PrimeTime hours={hourly.hours} peakHour={hourly.peak_hour} />
          ) : (
            <Skeleton className="h-[104px] w-full" />
          )}
        </section>
        <Facts server={server} />
      </div>

      <WipeHistory wipes={wipes} wipeNumbers={wipeNumbers} />
    </div>
  )
}

/* ------------------------------------------------------------------ Шапка */

function Header({ server }: { server: ServerDetail }) {
  const activity = activityLabel(server.activity_status)
  return (
    <div className="mb-6">
      <Link
        to="/servers"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-3 transition-colors hover:text-ink"
      >
        <IconArrowLeft size={14} />
        Все серверы
      </Link>
      <h1 className="mt-3 text-[26px] leading-tight font-bold text-ink sm:text-[34px]">
        {server.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="chip">{serverTypeLabel(server.type)}</span>
        {server.rate && <span className="chip">{server.rate}</span>}
        {server.country && <span className="chip">{server.country.toUpperCase()}</span>}
        {server.team_limit && <span className="chip">{server.team_limit}</span>}
        {activity && <span className="chip">{activity}</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Ответ
   Три крупных значения слева, календарь справа. Пояснения — одной-двумя
   строками ниже и только когда они что-то меняют в ответе. */

function Answer({
  server,
  since,
  next,
  bound,
  observed,
  fresh,
  wipes,
}: {
  server: ServerDetail
  since: number | null
  next: NextWipe
  bound: NextWipe | null
  observed: boolean
  fresh: boolean
  wipes: Date[]
}) {
  const fill = server.max > 0 ? server.online / server.max : 0
  const nearlyEmpty = server.peak != null && server.peak < EMPTY_PEAK_24H
  const lastWipe = parseWipeLabel(server.wipe)
  const forecast = parseSqlDateTime(bound ? server.forced_wipe : server.next_wipe_estimate)

  const state = server.online_stale
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
              ? 'почти пустой'
              : 'есть места'

  const nextNote =
    next.tone !== 'unknown'
      ? server.next_wipe_forced
        ? 'глобальный вайп Facepunch — раньше своего расписания'
        : server.cycle_source === 'name'
          ? `по циклу из названия сервера · ${server.cycle}`
          : `по циклу ${server.cycle ?? ''} из истории смен карты`
      : bound
        ? 'своего цикла нет, но в первый четверг месяца Facepunch вайпает всех'
        : 'вайпы нерегулярные или наблюдаю недавно — дату не выдумываю'

  return (
    <section className={cx('plate overflow-hidden', fresh && 'border-good/50')}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="p-5 sm:p-7">
          {/* Последний вайп */}
          <div className="eyebrow">Последний вайп</div>
          {since == null ? (
            <div className="stencil mt-2 text-[30px] leading-none text-ink-3">Ещё не видел</div>
          ) : (
            <>
              <div
                className={cx(
                  'stencil mt-2 text-[34px] leading-none sm:text-[44px]',
                  fresh ? 'text-good' : 'text-ink',
                )}
              >
                {observed ? '' : '≈ '}
                {relativeWipe(server.wipe)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-ink-2">
                {longDateTime(lastWipe)}
                {observed ? (
                  <span className="chip" data-tone="good">
                    смена карты
                  </span>
                ) : (
                  <span className="chip">оценка</span>
                )}
              </div>
            </>
          )}

          {/* Следующий */}
          <div className="eyebrow mt-7">Следующий вайп</div>
          {next.tone === 'unknown' && !bound ? (
            <div className="stencil mt-2 text-[30px] leading-none text-ink-3">Цикл не определён</div>
          ) : (
            <>
              <div
                className={cx(
                  'stencil mt-2 text-[34px] leading-none sm:text-[44px]',
                  (bound ?? next).tone === 'soon' ? 'text-warn' : 'text-ink',
                )}
              >
                {bound ? 'не позже ' : ''}
                {(bound ?? next).text}
              </div>
              <div className="mt-2 text-[15px] text-ink-2">{longDateTime(forecast)}</div>
            </>
          )}
          <p className="mt-1.5 text-[14px] text-ink-3">{nextNote}</p>

          {/* Онлайн */}
          <div className="eyebrow mt-7">Онлайн сейчас</div>
          {server.online_stale ? (
            <div className="stencil mt-2 text-[24px] leading-none text-ink-3">нет свежих данных</div>
          ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[34px] leading-none font-bold text-ink">
                {thousands(server.online)}
              </span>
              <span className="num text-[18px] text-ink-3">из {thousands(server.max)}</span>
              <span className="text-[15px] text-ink-2">· {state}</span>
            </div>
          )}
          {!server.online_stale && (
            <div className="mt-3 max-w-sm">
              <Meter value={server.online} max={server.max} />
            </div>
          )}
        </div>

        <div className="border-t border-rule bg-panel-2/60 p-5 sm:p-7 lg:border-t-0 lg:border-l">
          <div className="eyebrow mb-3">Вайпы за 5 недель</div>
          <WipeCalendar wipes={wipes} forecast={forecast} forecastIsBound={bound != null} />
        </div>
      </div>

      {(nearlyEmpty || (!observed && server.wipe_basis && BASIS_NOTE[server.wipe_basis])) && (
        <div className="space-y-1.5 border-t border-rule bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-5 py-4 text-[14px] leading-relaxed text-warn sm:px-7">
          {nearlyEmpty && (
            <p>
              Сервер почти пустой: пик за всё наблюдение — {thousands(server.peak)}. Частые смены
              карты здесь — скорее перезапуски, чем вайп, ради которого стоит заходить.
            </p>
          )}
          {!observed && server.wipe_basis && BASIS_NOTE[server.wipe_basis] && (
            <p>{BASIS_NOTE[server.wipe_basis]}</p>
          )}
        </div>
      )}
    </section>
  )
}

/* ----------------------------------------------------------------- Факты */

function Facts({ server }: { server: ServerDetail }) {
  const [copied, setCopied] = useState(false)
  const map = isJunkMapName(server.map_name) ? null : server.map_name
  const address = server.ip ? `${server.ip}${server.port ? ':' + server.port : ''}` : null

  const rows = (
    [
      [
        'Цикл',
        server.cycle
          ? `${server.cycle}${server.cycle_source === 'name' ? ' (из названия)' : ''}`
          : 'не определён',
      ],
      ['Пик онлайна', server.peak != null ? thousands(server.peak) : null],
      ['Средний онлайн', server.avg != null ? thousands(server.avg) : null],
      [
        'Наблюдаю',
        server.history_span_days != null
          ? `${server.history_span_days} ${plural(server.history_span_days, 'день', 'дня', 'дней')}`
          : null,
      ],
      ['Карта', map],
      ['Размер карты', server.map_size ? String(server.map_size) : null],
      ['Лимит группы', server.team_limit],
      ['Вайп чертежей', server.bp_wipe],
    ] as Array<[string, string | null | undefined]>
  ).filter(([, v]) => v != null && v !== '')

  return (
    <section className="plate p-4 sm:p-6">
      <h2 className="stencil mb-3 text-[19px] text-ink">О сервере</h2>
      <dl className="m-0">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-b border-rule py-2">
            <dt className="text-[14px] text-ink-3">{k}</dt>
            <dd className="num m-0 max-w-[60%] text-right text-[15px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      {address && (
        <button
          type="button"
          className="btn mt-4 w-full normal-case"
          onClick={() => {
            navigator.clipboard?.writeText(`client.connect ${address}`).then(
              () => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1600)
              },
              () => {},
            )
          }}
          title="Скопировать команду для консоли F1"
        >
          <span className="num">{copied ? 'Скопировано' : `client.connect ${address}`}</span>
        </button>
      )}
      <a href="https://t.me/RustPeek_Bot" target="_blank" rel="noopener" className="btn btn-solid mt-2 w-full">
        Следить за вайпами в боте
      </a>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        Бот напишет в телеграм, когда здесь подтвердится вайп.
      </p>
    </section>
  )
}

/* --------------------------------------------------------- История вайпов */

function WipeHistory({
  wipes,
  wipeNumbers,
}: {
  wipes: WipeRow[] | null
  wipeNumbers: Map<string, number>
}) {
  const [showRejected, setShowRejected] = useState(false)
  const [showAll, setShowAll] = useState(false)
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

  const visible = showAll ? rows : rows.slice(0, HISTORY_ROWS)

  return (
    <section className="plate mt-6 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="stencil text-[19px] text-ink">История вайпов</h2>
        {rows.length > 0 && (
          <span className="text-[14px] text-ink-3">
            {showRejected ? 'все записи' : 'подтверждённые'} · {rows.length}
          </span>
        )}
      </div>

      {wipes == null ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-[15px] text-ink-2">
          Подтверждённых вайпов пока нет — строка появится, как только увижу смену карты.
        </p>
      ) : (
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="eyebrow w-10 pb-2 font-normal">№</th>
                <th className="eyebrow pr-4 pb-2 font-normal">Когда</th>
                <th className="eyebrow pr-4 pb-2 font-normal">Через</th>
                <th className="eyebrow pb-2 text-right font-normal">
                  Пик<span className="hidden sm:inline"> за сутки</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((w) => {
                const d = parseSqlDateTime(w.wipe_time)
                const n = wipeNumbers.get(w.wipe_time)
                return (
                  <tr key={w.wipe_time} className="row border-b border-rule last:border-0">
                    <td className="num py-2.5 text-[14px] text-ink-3">{n ?? '·'}</td>
                    <td className="py-2.5 pr-4">
                      <span className="num text-[15px] text-ink">
                        {d ? WEEKDAYS_SHORT[d.getDay()] + ', ' : ''}
                        {shortDateTime(w.wipe_time)}
                      </span>
                      {w.suspicious && (
                        <Tag tone="bad" className="ml-3">
                          похоже на сбой замера
                        </Tag>
                      )}
                      {w.source_note && (
                        <span className="block text-[13px] text-ink-3 sm:ml-3 sm:inline">
                          {w.source_note}
                        </span>
                      )}
                    </td>
                    <td className="num py-2.5 pr-4 text-[14px] text-ink-2">
                      {w.interval_hours == null ? (
                        <span className="text-ink-3">первый в памяти</span>
                      ) : (
                        intervalText(w.interval_hours)
                      )}
                    </td>
                    <td className="num py-2.5 text-right text-[14px] text-ink-2">
                      {w.peak_after_24h == null || w.peak_after_24h === 0 ? (
                        <span className="text-ink-3">—</span>
                      ) : (
                        thousands(w.peak_after_24h)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {rows.length > HISTORY_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[14px] text-ink-2 underline decoration-rule-2 underline-offset-4 hover:text-ink"
          >
            {showAll ? 'Свернуть' : `Показать все ${rows.length}`}
          </button>
        )}
        {wipes != null && rejectedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowRejected((v) => !v)}
            className="text-[14px] text-ink-3 underline decoration-rule underline-offset-4 hover:text-ink"
          >
            {showRejected
              ? 'Скрыть отбракованные'
              : `Ещё ${thousands(rejectedCount)} ${plural(rejectedCount, 'запись отбракована', 'записи отбраковано', 'записей отбраковано')} — рестарты и сбои`}
          </button>
        )}
      </div>
    </section>
  )
}

/** Ближайший глобал как граница «не позже» — только если он в пределах 10 суток. */
function forcedBound(server: ServerDetail): NextWipe | null {
  const bound = nextWipe(server.forced_wipe)
  if (bound.tone === 'unknown' || bound.hours == null || bound.hours > 240) return null
  return bound
}

/* Откуда дата вайпа, если сам вайп не наблюдался. Смена карты — факт;
   всё остальное — оценка, и так и должно быть написано. */
const BASIS_NOTE: Record<string, string> = {
  global:
    'Сам вайп я не видел: время рождения карты этого сервера недоступно. Дата — предположение: в первый четверг месяца Facepunch вайпает все серверы.',
  online:
    'Дата — по провалу онлайна, смену карты я не видел. Такая оценка верна примерно в половине случаев.',
  name: 'Дата — из названия сервера, сам вайп я не видел.',
  bm: 'Дата — из поля BattleMetrics, сам вайп я не видел.',
}
