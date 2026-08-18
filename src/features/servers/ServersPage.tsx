import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchServers } from '../../lib/api'
import type {
  CalendarKey,
  FilterKey,
  ServerListItem,
  SortKey,
} from '../../lib/types'
import {
  activityLabel,
  nextWipe,
  pluralServers,
  relativeWipe,
  serverTypeLabel,
  thousands,
  wipeAgeHours,
} from '../../lib/format'
import { Button, Card, EmptyState, ErrorState, Meter, SearchField, Segmented, Skeleton, StatusPill, cx } from '../../components/ui'
import { Sparkline } from '../../components/charts/Sparkline'

const LIMIT = 50

const CALENDARS: Array<{ value: CalendarKey; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'week', label: 'На неделе' },
  { value: 'all', label: 'Все' },
]

const FILTERS: Array<{ value: FilterKey; label: string }> = [
  { value: 'all', label: 'Все' },
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'mod', label: 'Моды' },
]

const SORTS: Array<{ value: SortKey; label: string; hint: string }> = [
  { value: 'online', label: 'Онлайн', hint: 'Сначала самые населённые' },
  { value: 'wipe_fresh', label: 'Свежий вайп', hint: 'Вайпнулись меньше суток назад' },
  { value: 'cycle', label: 'Ближе к вайпу', hint: 'У кого следующий вайп скорее' },
]

export function ServersPage() {
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [calendar, setCalendar] = useState<CalendarKey>('all')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('online')

  const [items, setItems] = useState<ServerListItem[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [counts, setCounts] = useState<Partial<Record<CalendarKey, number>>>({})
  const [beforeFilter, setBeforeFilter] = useState(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'refreshing' | 'error'>('loading')
  const [loadingMore, setLoadingMore] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const seqRef = useRef(0)

  const load = useCallback(
    async (offset: number, mode: 'replace' | 'append') => {
      const mySeq = ++seqRef.current
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      if (mode === 'replace') setStatus(items.length ? 'refreshing' : 'loading')
      else setLoadingMore(true)

      try {
        const data = await searchServers({
          q: query.trim() || undefined,
          filter,
          sort,
          calendar,
          limit: LIMIT,
          offset,
          signal: ctrl.signal,
        })
        if (mySeq !== seqRef.current) return
        const list = data.servers ?? []
        setItems((prev) => (mode === 'append' ? [...prev, ...list] : list))
        setTotal(data.total ?? list.length)
        if (data.calendar_counts) setCounts(data.calendar_counts)
        setBeforeFilter(data.local_count_before_filter ?? 0)
        setStatus('idle')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        if (mySeq !== seqRef.current) return
        setStatus('error')
      } finally {
        if (mySeq === seqRef.current) setLoadingMore(false)
      }
    },
    // items.length только для выбора «скелет или приглушение» — перезапуск не нужен
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filter, sort, calendar],
  )

  // дебаунс набора: не долбим API на каждый символ
  useEffect(() => {
    const t = setTimeout(() => void load(0, 'replace'), query ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, query])

  // адрес хранит запрос — ссылкой можно поделиться
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (query.trim()) next.set('q', query.trim())
    else next.delete('q')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const localItems = useMemo(() => items.filter((s) => s.source !== 'battlemetrics_live'), [items])
  const bmItems = useMemo(() => items.filter((s) => s.source === 'battlemetrics_live'), [items])
  const canLoadMore = total != null && localItems.length < total

  return (
    <div className="fade-up">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight">Серверы</h1>
          <p className="mt-1 text-[13px] text-ink-2">
            Даты вайпов подтверждены формой кривой онлайна — пик, провал, рост. Не полем
            «last_wipe», которое заполняет админ.
          </p>
        </div>
        {total != null && (
          <p className="tnum text-[12.5px] text-ink-3">
            {thousands(total)} {pluralServers(total)} под наблюдением
          </p>
        )}
      </div>

      {/* Один ряд фильтров над всем, что они изменяют */}
      <div className="sticky top-14 z-30 -mx-5 mb-4 border-b border-line bg-bg/92 px-5 py-3 backdrop-blur-md">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:flex-wrap xl:items-center">
          <div className="xl:min-w-[300px] xl:flex-1">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Название сервера — найду и скажу правду про вайп"
            />
          </div>
          {/* На узком экране ряд фильтров прокручивается вбок, а не ломается
              на четыре этажа и не обрезается по краю */}
          <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-0.5 xl:mx-0 xl:overflow-visible xl:px-0 xl:pb-0">
          <Segmented
            ariaLabel="Вайп-календарь"
            value={calendar}
            onChange={setCalendar}
            options={CALENDARS.map((c) => ({
              value: c.value,
              label: (
                <span className="flex items-center gap-1.5">
                  {c.label}
                  <span className="tnum text-[11px] text-ink-3">
                    {counts[c.value] != null ? counts[c.value] : '—'}
                  </span>
                </span>
              ),
            }))}
          />
          <Segmented ariaLabel="Тип сервера" value={filter} onChange={setFilter} options={FILTERS} />
          <Segmented
            ariaLabel="Сортировка"
            value={sort}
            onChange={setSort}
            options={SORTS.map((s) => ({ value: s.value, label: s.label, hint: s.hint }))}
          />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[36px_minmax(0,1fr)_128px_88px_150px_160px] items-center gap-3 border-b border-line bg-surface-2/60 px-4 py-2 text-[11px] font-medium tracking-wide text-ink-3 uppercase lg:grid">
          <span>#</span>
          <span>Сервер</span>
          <span>Онлайн</span>
          <span>48 ч</span>
          <span>Последний вайп</span>
          <span>Следующий вайп</span>
        </div>

        {status === 'loading' && <RowSkeletons />}

        {status === 'error' && (
          <ErrorState
            title="Не дотянулся до базы. Похоже, бэкенд сейчас молчит."
            onRetry={() => void load(0, 'replace')}
          />
        )}

        {status !== 'loading' && status !== 'error' && localItems.length === 0 && (
          <EmptyState
            title={
              beforeFilter > 0 && filter !== 'all'
                ? `Нашлось ${beforeFilter} ${pluralServers(beforeFilter)}, но ни один не подошёл под «${
                    FILTERS.find((f) => f.value === filter)?.label
                  }»`
                : 'Ничего не нашлось'
            }
            hint={
              beforeFilter > 0 && filter !== 'all'
                ? 'Ослабь фильтр — покажу всё, что есть.'
                : 'Проверь написание. Если сервера нет в базе, найду его в BattleMetrics и возьму под наблюдение.'
            }
          />
        )}

        {localItems.length > 0 && (
          <div className={cx('divide-y divide-line/70', status === 'refreshing' && 'opacity-50 transition-opacity')}>
            {localItems.map((s, i) => (
              <ServerRow key={s.id} server={s} rank={i + 1} />
            ))}
          </div>
        )}

        {bmItems.length > 0 && (
          <>
            <div className="border-t border-line bg-surface-2/60 px-4 py-2 text-[12px] text-ink-3">
              Нашёл ещё в BattleMetrics — истории по ним пока нет, наблюдение только начинается
            </div>
            <div className="divide-y divide-line/70">
              {bmItems.map((s, i) => (
                <ServerRow key={`bm-${s.id ?? i}`} server={s} rank={null} />
              ))}
            </div>
          </>
        )}
      </Card>

      {canLoadMore && (
        <div className="mt-4 flex justify-center">
          <Button onClick={() => void load(localItems.length, 'append')} disabled={loadingMore}>
            {loadingMore ? 'Загружаю…' : `Показать ещё ${LIMIT}`}
          </Button>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- строка */

function ServerRow({ server: s, rank }: { server: ServerListItem; rank: number | null }) {
  const next = nextWipe(s.next_wipe_estimate)
  const age = wipeAgeHours(s.wipe_label)
  const fresh = age != null && age < 24
  const dim = (s.online ?? 0) <= 0 || s.activity_status === 'draining' || s.online_stale
  const activity = activityLabel(s.activity_status)
  const clickable = rank != null && s.id != null

  const body = (
    <div
      className={cx(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors',
        'lg:grid-cols-[36px_minmax(0,1fr)_128px_88px_150px_160px]',
        clickable && 'hover:bg-surface-2',
        dim && 'opacity-55',
      )}
    >
      <span className="tnum hidden text-[12px] text-ink-3 lg:block">{rank ?? '—'}</span>

      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium text-ink">{s.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3">
          <span>{serverTypeLabel(s.type)}</span>
          {s.rate && <span>· {s.rate}</span>}
          {activity && <span>· {activity}</span>}
          {rank == null && <span>· нет истории, найден в BattleMetrics</span>}
        </span>
      </span>

      <span className="hidden lg:block">
        {s.online_stale ? (
          <span className="text-[12px] text-ink-3">нет свежих данных</span>
        ) : (
          <>
            <span className="tnum block text-[12.5px] text-ink">
              {thousands(s.online)}
              <span className="text-ink-3"> / {thousands(s.max)}</span>
            </span>
            <span className="mt-1 block">
              <Meter value={s.online} max={s.max} />
            </span>
          </>
        )}
      </span>

      <span className="hidden lg:block">
        {s.sparkline && s.sparkline.length > 1 && !s.online_stale ? (
          <Sparkline values={s.sparkline} />
        ) : (
          <span className="text-[12px] text-ink-3">—</span>
        )}
      </span>

      <span className="hidden lg:block">
        {age == null ? (
          <span className="text-[12.5px] text-ink-3">не подтверждён</span>
        ) : (
          <>
            <span className={cx('block text-[12.5px]', fresh ? 'text-good' : 'text-ink-2')}>
              {relativeWipe(s.wipe_label)}
            </span>
            {fresh && (
              <span className="mt-0.5 block text-[11px] text-ink-3">свежий — карта чистая</span>
            )}
          </>
        )}
      </span>

      <span className="justify-self-end lg:justify-self-start">
        <StatusPill
          tone={next.tone === 'soon' ? 'hot' : next.tone === 'unknown' ? 'muted' : 'plain'}
          dot={next.tone === 'soon'}
        >
          {next.text}
        </StatusPill>
      </span>

      {/* Узкий экран: онлайн и вайп не прячем, а переносим на свою строку —
          без них строка списка бессмысленна */}
      <span className="col-span-2 mt-1.5 flex items-center gap-3 lg:hidden">
        {s.online_stale ? (
          <span className="text-[12px] text-ink-3">нет свежих данных</span>
        ) : (
          <>
            <span className="tnum shrink-0 text-[12px] text-ink-2">
              {thousands(s.online)}
              <span className="text-ink-3">/{thousands(s.max)}</span>
            </span>
            <span className="w-16 shrink-0">
              <Meter value={s.online} max={s.max} />
            </span>
          </>
        )}
        <span className={cx('truncate text-[12px]', fresh ? 'text-good' : 'text-ink-3')}>
          {age == null ? 'вайп не подтверждён' : `вайп ${relativeWipe(s.wipe_label)}`}
        </span>
      </span>
    </div>
  )

  if (!clickable) return <div>{body}</div>
  return (
    <Link to={`/servers/${s.id}`} className="block">
      {body}
    </Link>
  )
}

function RowSkeletons() {
  return (
    <div className="divide-y divide-line/70">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[36px_minmax(0,1fr)_128px_150px] items-center gap-3 px-4 py-3">
          <Skeleton className="h-3 w-4" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5" style={{ width: `${45 + ((i * 7) % 35)}%` }} />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-3" />
          <Skeleton className="h-5 w-28 justify-self-end" />
        </div>
      ))}
    </div>
  )
}
