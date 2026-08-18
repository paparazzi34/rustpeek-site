import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getHistory, getHourlyProfile, getServer, getWipes } from '../../lib/api'
import type {
  DailyOnlinePoint,
  HistoryResponse,
  HourlyProfile,
  Period,
  ServerDetail,
  WipeRow,
} from '../../lib/types'
import {
  activityLabel,
  intervalText,
  isJunkMapName,
  nextWipe,
  pad2,
  relativeWipe,
  serverTypeLabel,
  shortDateTime,
  thousands,
  WEEKDAYS_FULL,
  wipeAgeHours,
} from '../../lib/format'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Segmented,
  Skeleton,
  StatTile,
  StatusPill,
  cx,
} from '../../components/ui'
import { OnlineChart, type WipeMarker } from '../../components/charts/OnlineChart'
import { PrimeTime } from '../../components/charts/PrimeTime'
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconFlag } from '../../components/icons'

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '24h', label: '24 ч' },
  { value: '7d', label: '7 дней' },
  { value: 'month', label: '30 дней' },
  { value: 'all', label: 'Всё время' },
]

export function ServerDetailPage() {
  const { id } = useParams()
  const serverId = Number(id)

  const [server, setServer] = useState<ServerDetail | null>(null)
  const [error, setError] = useState<'not_found' | 'network' | null>(null)
  const [wipes, setWipes] = useState<WipeRow[] | null>(null)
  const [hourly, setHourly] = useState<HourlyProfile | null>(null)

  const [period, setPeriod] = useState<Period>('7d')
  const [cycleOffset, setCycleOffset] = useState(0)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setServer(null)
    setError(null)
    getServer(serverId)
      .then((s) => alive && setServer(s))
      .catch((e) => alive && setError(e?.kind === 'not_found' ? 'not_found' : 'network'))
    getWipes(serverId)
      .then((d) => alive && setWipes(d.wipes ?? []))
      .catch(() => alive && setWipes([]))
    getHourlyProfile(serverId)
      .then((d) => alive && setHourly(d))
      .catch(() => alive && setHourly(null))
    window.scrollTo({ top: 0 })
    return () => {
      alive = false
    }
  }, [serverId])

  useEffect(() => {
    let alive = true
    setHistoryLoading(true)
    getHistory(serverId, period, cycleOffset)
      .then((d) => alive && setHistory(d))
      .catch(() => alive && setHistory(null))
      .finally(() => alive && setHistoryLoading(false))
    return () => {
      alive = false
    }
  }, [serverId, period, cycleOffset])

  /* Номера вайпов — один источник правды для графика и таблицы */
  const wipeNumbers = useMemo(() => {
    const map = new Map<string, number>()
    ;(wipes ?? []).forEach((w, i) => map.set(w.wipe_time, i + 1))
    return map
  }, [wipes])

  const chartWipes: WipeMarker[] = useMemo(
    () =>
      (history?.wipes ?? []).map((w) => ({
        ts: w.wipe_time,
        number: wipeNumbers.get(w.wipe_time) ?? 0,
      })),
    [history, wipeNumbers],
  )

  const stability = useMemo(() => cycleStability(wipes ?? []), [wipes])

  if (error) {
    return (
      <Card>
        <ErrorState
          title={
            error === 'not_found'
              ? 'Такого сервера нет в базе — возможно, он пропал из мониторинга.'
              : 'Не дотянулся до базы. Попробуй ещё раз через пару секунд.'
          }
        />
        <div className="border-t border-line px-4 py-3">
          <Link to="/servers" className="text-[13px] text-ink-2 hover:text-ink">
            ← Ко всем серверам
          </Link>
        </div>
      </Card>
    )
  }

  if (!server) return <DetailSkeleton />

  const next = nextWipe(server.next_wipe_estimate)
  const age = wipeAgeHours(server.wipe)
  const fresh = age != null && age < 24
  const mapName = server.map_name && !isJunkMapName(server.map_name) ? server.map_name : null

  return (
    <div className="fade-up">
      <Link
        to="/servers"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <IconArrowLeft size={14} />
        Ко всем серверам
      </Link>

      {/* ------------------------------------------------ шапка сервера */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[20px] leading-tight font-semibold tracking-tight break-words">
            {server.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span
                className={cx(
                  'size-1.5 rounded-full',
                  server.online > 0 ? 'bg-good' : 'bg-ink-3',
                  server.online > 0 && 'animate-live',
                )}
              />
              {server.online > 0 ? 'живой' : 'пусто'}
            </span>
            <span>·</span>
            <span>{server.rate ?? '—'}</span>
            <span>·</span>
            <span>{serverTypeLabel(server.type)}</span>
            <span>·</span>
            <span>
              карта {server.map_size ?? '—'}
              {mapName ? ` · ${mapName}` : ''}
            </span>
            {server.ip && server.port && (
              <>
                <span>·</span>
                <span className="font-mono text-[11.5px]">
                  {server.ip}:{server.port}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-left sm:text-right">
          <div className="tnum text-[24px] leading-none font-semibold">
            {thousands(server.online)}
            <span className="text-[16px] text-ink-3"> / {thousands(server.max)}</span>
          </div>
          <div className="mt-1 text-[11.5px] text-ink-3">игроков сейчас</div>
        </div>
      </div>

      {/* ------------------------------------------------ вердикт словами */}
      <Card className="mt-4 border-l-2 border-l-rust bg-surface/70 px-4 py-3">
        <p className="text-[14px] leading-relaxed text-ink">{verdict(server)}</p>
        {stability && (
          <p className="mt-1 text-[12.5px] text-ink-3">
            {stability.text} Это и есть основание для прогноза — не слова админа.
          </p>
        )}
      </Card>

      {/* ------------------------------------------------ плитки */}
      <Card className="mt-4 grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <StatTile
          label="Последний вайп"
          value={server.wipe ?? 'неизвестно'}
          sub={age != null ? relativeWipe(server.wipe) : 'не подтверждён по кривой'}
          tone={fresh ? 'good' : 'plain'}
        />
        <StatTile
          label="Цикл"
          value={server.cycle ?? 'не определён'}
          sub={server.cycle ? 'по интервалам между вайпами' : 'интервалы гуляют — не гадаю'}
          tone={server.cycle ? 'plain' : 'muted'}
        />
        <StatTile
          label="Следующий вайп"
          value={shortDateTime(server.next_wipe_estimate) ?? '—'}
          sub={next.text}
          tone={next.tone === 'unknown' ? 'muted' : next.tone === 'soon' ? 'hot' : 'plain'}
        />
        <StatTile
          label="Пик / средний"
          value={
            <>
              {thousands(server.peak)}
              <span className="text-ink-3"> / {thousands(server.avg)}</span>
            </>
          }
          sub="за всё наблюдение"
        />
        <StatTile
          label="В базе"
          value={server.history_span_days != null ? `${server.history_span_days} дней` : '—'}
          sub={`${thousands(server.total_measurements ?? 0)} замеров онлайна`}
        />
      </Card>

      {/* ------------------------------------------------ график */}
      <Card className="mt-4">
        <CardHeader
          title="Онлайн по времени"
          sub="Вайп виден как провал до нуля и резкий рост следом — эту подпись нельзя подделать"
          right={
            <div className="flex items-center gap-2">
              {history?.cycle && (period === 'month' || period === 'all' || period === 'cycle') && (
                <div className="flex items-center gap-0.5 rounded-[5px] border border-line bg-surface p-0.5">
                  <button
                    disabled={!history.cycle.has_prev}
                    onClick={() => {
                      setPeriod('cycle')
                      setCycleOffset((v) => v - 1)
                    }}
                    className="flex size-6 items-center justify-center rounded-[3px] text-ink-3 hover:text-ink disabled:opacity-30"
                    aria-label="Предыдущий цикл"
                  >
                    <IconChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setPeriod('cycle')
                      setCycleOffset(0)
                    }}
                    className={cx(
                      'h-6 rounded-[3px] px-2 text-[12px]',
                      period === 'cycle' ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
                    )}
                  >
                    {cycleOffset === 0 ? 'текущий цикл' : `цикл ${cycleOffset}`}
                  </button>
                  <button
                    disabled={!history.cycle.has_next}
                    onClick={() => {
                      setPeriod('cycle')
                      setCycleOffset((v) => v + 1)
                    }}
                    className="flex size-6 items-center justify-center rounded-[3px] text-ink-3 hover:text-ink disabled:opacity-30"
                    aria-label="Следующий цикл"
                  >
                    <IconChevronRight size={14} />
                  </button>
                </div>
              )}
              <Segmented
                ariaLabel="Период"
                size="sm"
                value={period}
                onChange={(v) => {
                  setPeriod(v)
                  setCycleOffset(0)
                }}
                options={PERIODS}
              />
            </div>
          }
        />
        <div className="px-4 pt-3 pb-4">
          <OnlineChart
            points={history?.points ?? []}
            wipes={chartWipes}
            granularity={history?.granularity}
            loading={historyLoading}
          />
        </div>
      </Card>

      {/* ------------------------------------------------ прайм-тайм */}
      {hourly && hourly.hours?.some((v) => v != null) && (
        <Card className="mt-4">
          <CardHeader
            title="Когда там людно"
            sub="Средний онлайн по часам за 30 дней, время UTC"
            right={
              hourly.peak_hour != null ? (
                <StatusPill tone="hot">пик в {pad2(hourly.peak_hour)}:00</StatusPill>
              ) : undefined
            }
          />
          <div className="px-4 pt-4 pb-3">
            <PrimeTime hours={hourly.hours} peakHour={hourly.peak_hour} />
          </div>
        </Card>
      )}

      {/* ------------------------------------------------ по дням */}
      {/* Придержано до отдельного решения (2026-08-18) — данные и компонент
          готовы (days/days_unavailable/prime_time, см. DailyBreakdown ниже),
          но на проде такой панели не было никогда, это новая вёрстка, не
          восстановление старой. Раскомментировать после ревью глазами:
          <DailyBreakdown server={server} /> */}

      {/* ------------------------------------------------ низ: вайпы + инфо */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="История вайпов"
            sub="Каждая строка подтверждена кривой онлайна, а не названием сервера"
          />
          {wipes == null ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : wipes.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">
              Пока ни одного подтверждённого вайпа — наблюдение началось недавно.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-ink-3">
                  <tr className="border-b border-line">
                    <th className="w-9 px-4 py-2 text-left font-medium">№</th>
                    <th className="px-2 py-2 text-left font-medium">Когда</th>
                    <th className="px-2 py-2 text-left font-medium">День недели</th>
                    <th className="px-2 py-2 text-right font-medium">Интервал</th>
                    <th className="px-4 py-2 text-right font-medium">Пик за сутки</th>
                  </tr>
                </thead>
                <tbody className="tnum divide-y divide-line/60">
                  {wipes.map((w, i) => (
                    <tr key={w.wipe_time + i} className={cx(w.suspicious && 'opacity-70')}>
                      <td className="px-4 py-2 text-ink-3">{i + 1}</td>
                      <td className="px-2 py-2 text-ink">{shortDateTime(w.wipe_time) ?? w.wipe_time}</td>
                      <td className="px-2 py-2 text-ink-2">
                        {w.weekday != null ? WEEKDAYS_FULL[w.weekday] : '—'}
                      </td>
                      <td className="px-2 py-2 text-right text-ink-2">
                        {intervalText(w.interval_hours)}
                      </td>
                      <td className="px-4 py-2 text-right text-ink-2">
                        <span className="inline-flex items-center justify-end gap-2">
                          {w.suspicious && (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-danger"
                              title="Интервал от предыдущего меньше 6 часов — скорее шум детекта, чем два настоящих вайпа"
                            >
                              <IconFlag size={12} /> спорный
                            </span>
                          )}
                          {w.peak_after_24h != null ? thousands(w.peak_after_24h) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Сервер" />
            <dl className="divide-y divide-line/60">
              {[
                server.ip && server.port
                  ? (['Адрес', <span className="font-mono text-[12px]">{server.ip}:{server.port}</span>] as const)
                  : null,
                ['Карта', `${server.map_size ?? '—'} · ${serverTypeLabel(server.type)}`] as const,
                ['Рейт', server.rate ?? '—'] as const,
                server.team_limit ? (['Лимит команды', server.team_limit] as const) : null,
                ['BP-вайпы', server.bp_wipe ?? 'неизвестно'] as const,
                ['Активность', activityLabel(server.activity_status) ?? 'не посчитана'] as const,
                ['Источник', 'BattleMetrics + прямой A2S-скан'] as const,
              ]
                .filter(Boolean)
                .map((row, i) => {
                  const [k, v] = row as readonly [string, React.ReactNode]
                  return (
                    <div key={i} className="flex items-baseline justify-between gap-4 px-4 py-2">
                      <dt className="text-[12px] text-ink-3">{k}</dt>
                      <dd className="text-right text-[12.5px] text-ink-2">{v}</dd>
                    </div>
                  )
                })}
            </dl>
          </Card>

          <Card className="p-4">
            <h3 className="text-[13px] font-semibold">Как я определяю вайп</h3>
            <ol className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-ink-2">
              <li>
                <span className="text-ink">1. Пик.</span> Сервер жил своей жизнью, онлайн шёл
                суточной волной.
              </li>
              <li>
                <span className="text-ink">2. Провал.</span> Рестарт: карта стёрта, всех выкинуло,
                онлайн падает почти в ноль.
              </li>
              <li>
                <span className="text-ink">3. Рост.</span> Толпа врывается на свежую землю — резкий
                подъём выше обычного.
              </li>
            </ol>
            <p className="mt-3 text-[12px] text-ink-3">
              Нет всех трёх — вайпа не было, что бы ни писал админ в названии. Есть — фиксирую время
              с точностью до минуты.
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-[12.5px] text-ink-2">
              Хочешь пуш, когда этот сервер вайпнется?
            </p>
            <Button
              variant="solid"
              className="mt-2.5 w-full"
              onClick={() => window.open('https://t.me/RustPeek_Bot', '_blank', 'noopener')}
            >
              Следить через бота
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- помощники */

function verdict(s: ServerDetail) {
  const bits: string[] = []
  const rel = relativeWipe(s.wipe)
  bits.push(rel === '—' ? 'Вайп не подтверждён' : `Вайпнулся ${rel}`)

  const act = activityLabel(s.activity_status)
  bits.push(`${act ? act + ', ' : ''}${thousands(s.online)} из ${thousands(s.max)}`)

  const n = nextWipe(s.next_wipe_estimate)
  bits.push(
    s.cycle && s.next_wipe_estimate
      ? `следующий ${n.text}`
      : 'следующий неизвестен — интервалы между вайпами нестабильны',
  )

  return bits.join(' · ')
}

/** Насколько цикл вообще заслуживает доверия — считаем по разбросу интервалов */
function cycleStability(wipes: WipeRow[]) {
  const intervals = wipes
    .map((w) => w.interval_hours)
    .filter((v): v is number => v != null && v > 6)
  if (intervals.length < 3) return null
  const sorted = [...intervals].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const within = intervals.filter((v) => Math.abs(v - median) / median <= 0.15).length
  const days = Math.round(median / 24)
  const share = within / intervals.length
  const text =
    share >= 0.8
      ? `Цикл держится: ${within} из ${intervals.length} интервалов уложились в ±15% от ${days} ${days === 1 ? 'дня' : 'дней'}.`
      : share >= 0.5
        ? `Цикл шатается: только ${within} из ${intervals.length} интервалов рядом с медианой в ${days} дн.`
        : `Цикла как такового нет: интервалы между вайпами разбросаны (медиана ${days} дн, но совпадений почти нет).`
  return { text, share, median }
}

/** "По дням" — пик онлайна за каждый день окна, вайп и дыры в мониторинге
    видны сразу (services/analytics.py::make_daily_online_text →
    api_service/serializers.py::_parse_daily_lines). days_unavailable — не
    "данных нет" (это просто пустой days), а "текст пришёл, парсер не
    справился" — честно говорим об этом, а не рисуем пустую карточку. */
function DailyBreakdown({ server }: { server: ServerDetail }) {
  if (server.days_unavailable) {
    return (
      <Card className="mt-4 px-4 py-3">
        <p className="text-[12.5px] text-ink-3">
          История по дням временно недоступна — не смог разобрать данные за это окно.
          Остальные показатели это не затрагивает.
        </p>
      </Card>
    )
  }

  const days = server.days
  if (!days || days.length === 0) return null

  return (
    <Card className="mt-4">
      <CardHeader
        title="По дням"
        sub={server.prime_time ? `Пик онлайна за день, прайм-тайм ${server.prime_time}` : 'Пик онлайна за день'}
      />
      <div className="divide-y divide-line/60 px-4 py-1">
        {days.map((d, i) => (
          <DailyRow key={d.date + i} day={d} />
        ))}
      </div>
    </Card>
  )
}

function DailyRow({ day }: { day: DailyOnlinePoint }) {
  if (day.is_gap) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 opacity-55">
        <span className="text-[12.5px] text-ink-3">
          {day.label} <span className="text-ink-3/70">· {day.date}</span>
        </span>
        <span className="h-[6px] flex-1 rounded-full bg-line bg-[repeating-linear-gradient(45deg,var(--color-line),var(--color-line)_4px,transparent_4px,transparent_8px)]" />
        <span className="w-24 shrink-0 text-right text-[12px] text-ink-3">нет данных</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className={cx('text-[12.5px]', day.is_wipe ? 'text-ink' : 'text-ink-2')}>
        {day.label} <span className="text-ink-3">· {day.date}</span>
      </span>
      <span className="h-[6px] flex-1 rounded-full bg-line">
        <span
          className={cx('block h-full rounded-full', day.is_wipe ? 'bg-rust' : 'bg-ink-3/60')}
          style={{ width: `${Math.max(2, day.pct)}%` }}
        />
      </span>
      <span className={cx('tnum w-24 shrink-0 text-right text-[12.5px]', day.is_wipe ? 'text-rust' : 'text-ink-2')}>
        {day.value}
      </span>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-16" />
      <Skeleton className="h-[300px]" />
    </div>
  )
}
