import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, ErrorState, Meter, SearchField, Segmented, cx } from '../../components/ui'
import { searchServers } from '../../lib/api'
import {
  EMPTY_PEAK_24H,
  dayLabel,
  isNearlyEmpty,
  localWipeLabel,
  nextWipe,
  nextWipeNote,
  parseWipeLabel,
  pluralServers,
  relativeWipe,
  serverTypeLabel,
  thousands,
  wipeAgeHours,
} from '../../lib/format'
import type { CalendarKey, FilterKey, SearchResponse, ServerListItem, SortKey } from '../../lib/types'

/* СПИСОК СЕРВЕРОВ (редизайн v4, 2026-10-07).

   Организован по вайп-календарю, а не по онлайну: вопрос игрока звучит
   «куда зайти сегодня». Строка отвечает на три вопроса слева направо —
   какой сервер, сколько там людей, когда вайп был и когда будет.

   Что убрано по сравнению с v3: номер строки (ничего не значил), спарклайн
   за 48 часов (шум в каждой строке) и трек фазы цикла (дублировал даты).
   Строки сгруппированы по дню вайпа, почти пустые серверы — свёрнутым
   блоком внизу. */

const LIMIT = 40

const COLS = 'lg:grid-cols-[minmax(0,1fr)_150px_170px_170px]'

const CALENDAR: Array<{ value: CalendarKey; label: string }> = [
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
  { value: 'wipe_fresh', label: 'Свежий вайп', hint: 'Сначала те, где вайп только что был' },
  { value: 'cycle', label: 'Скоро вайп', hint: 'Сначала те, где вайп вот-вот будет' },
  { value: 'online', label: 'Онлайн', hint: 'Сначала самые населённые' },
]

export function ServersPage() {
  const [params, setParams] = useSearchParams()
  const calendar = (params.get('calendar') as CalendarKey) || 'all'
  const filter = (params.get('filter') as FilterKey) || 'all'
  const sort = (params.get('sort') as SortKey) || 'wipe_fresh'
  const q = params.get('q') ?? ''

  const [draft, setDraft] = useState(q)
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [offset, setOffset] = useState(0)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => setDraft(q), [q])

  const patch = useCallback(
    (next: Record<string, string>) => {
      const p = new URLSearchParams(params)
      for (const [k, v] of Object.entries(next)) {
        if (v) p.set(k, v)
        else p.delete(k)
      }
      setOffset(0)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )

  useEffect(() => {
    abort.current?.abort()
    const ac = new AbortController()
    abort.current = ac
    setLoading(true)
    setError(false)
    searchServers({ q, filter, sort, calendar, limit: LIMIT, offset, signal: ac.signal })
      .then((r) => {
        if (ac.signal.aborted) return
        setData((prev) =>
          offset > 0 && prev ? { ...r, servers: [...prev.servers, ...r.servers] } : r,
        )
      })
      .catch((e) => {
        if (ac.signal.aborted || (e as Error)?.name === 'AbortError') return
        setError(true)
      })
      .finally(() => !ac.signal.aborted && setLoading(false))
    return () => ac.abort()
  }, [q, filter, sort, calendar, offset])

  const counts = data?.calendar_counts
  const servers = data?.servers ?? []
  const total = data?.total ?? servers.length

  const withoutFreshWipe = servers.length === 0 && (data?.local_count_before_filter ?? 0) > 0

  return (
    <div className="bleed pt-7">
      {/* ---- Шапка: заголовок и поиск ---- */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="stencil text-[30px] leading-none text-ink sm:text-[36px]">Серверы</h1>
          <p className="mt-2 text-[15px] text-ink-2">
            Когда был вайп и когда будет следующий. Вайп вижу по смене карты на сервере.
          </p>
        </div>
        <div className="w-full max-w-md">
          <SearchField
            value={draft}
            onChange={setDraft}
            onSubmit={() => patch({ q: draft.trim() })}
            placeholder="Найти сервер по названию"
            action={
              draft ? (
                <Button
                  variant="bare"
                  type="button"
                  className="h-8"
                  onClick={() => {
                    setDraft('')
                    patch({ q: '' })
                  }}
                >
                  Сбросить
                </Button>
              ) : null
            }
          />
        </div>
      </div>

      {/* ---- Календарь — главный переключатель ---- */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CALENDAR.map((c) => {
          const on = c.value === calendar
          return (
            <button
              key={c.value}
              onClick={() => patch({ calendar: c.value })}
              className={cx(
                'flex items-baseline justify-between rounded-[4px] border px-4 py-3 text-left transition-colors',
                on
                  ? 'border-rust bg-panel-2'
                  : 'border-rule bg-panel hover:border-rule-2 hover:bg-panel-2',
              )}
            >
              <span className={cx('stencil text-[17px]', on ? 'text-ink' : 'text-ink-2')}>
                {c.label}
              </span>
              <span className={cx('num text-[17px]', on ? 'text-rust-hot' : 'text-ink-3')}>
                {counts?.[c.value] != null ? thousands(counts[c.value]) : ''}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented value={filter} options={FILTERS} onChange={(v) => patch({ filter: v })} ariaLabel="Тип сервера" />
        <Segmented value={sort} options={SORTS} onChange={(v) => patch({ sort: v })} ariaLabel="Сортировка" />
      </div>

      {/* ---- Таблица ---- */}
      <div className="plate mt-5 overflow-hidden">
        <div className={cx('hidden gap-x-6 border-b border-rule px-5 py-3 lg:grid', COLS)}>
          <span className="eyebrow">Сервер</span>
          <span className="eyebrow">Онлайн</span>
          <span className="eyebrow">Последний вайп</span>
          <span className="eyebrow text-right">Следующий</span>
        </div>

        {error ? (
          <div className="px-5">
            <ErrorState
              title="Не дозвонился до бэкенда, поэтому списка нет. Пустую таблицу вместо данных показывать не буду."
              onRetry={() => setOffset((o) => o)}
            />
          </div>
        ) : loading && servers.length === 0 ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="skeleton h-[58px]" style={{ opacity: 1 - i * 0.07 }} />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="px-5">
            <EmptyState
              title={
                withoutFreshWipe
                  ? `Серверов нашлось ${data?.local_count_before_filter}, но ни у одного нет подтверждённого вайпа в этом окне.`
                  : 'По этому запросу ничего не нашлось.'
              }
              hint={
                withoutFreshWipe ? (
                  <>
                    Календарь показывает только подтверждённые вайпы. Открой{' '}
                    <button
                      className="text-rust-hot underline underline-offset-4"
                      onClick={() => patch({ calendar: 'all' })}
                    >
                      вкладку «Все»
                    </button>
                    .
                  </>
                ) : (
                  'Проверь написание или поищи по части названия — «rustafied» найдёт все их площадки.'
                )
              }
            />
          </div>
        ) : (
          <GroupedRows servers={servers} byDay={sort === 'wipe_fresh'} />
        )}
      </div>

      {servers.length > 0 && (
        <div className="flex items-center justify-between gap-4 py-6">
          <span className="text-[14px] text-ink-3">
            Показано <span className="num text-ink-2">{servers.length}</span> из{' '}
            <span className="num text-ink-2">{thousands(total)}</span> {pluralServers(total)}
          </span>
          {servers.length < total && (
            <Button onClick={() => setOffset(servers.length)} disabled={loading}>
              {loading ? 'Гружу…' : 'Показать ещё'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- Группы */

function GroupedRows({ servers, byDay }: { servers: ServerListItem[]; byDay: boolean }) {
  const [showEmpty, setShowEmpty] = useState(false)

  const { groups, empty } = useMemo(() => {
    const live = byDay ? servers.filter((s) => !isNearlyEmpty(s)) : servers
    const empty = byDay ? servers.filter((s) => isNearlyEmpty(s)) : []
    const groups: Array<{ label: string; rows: ServerListItem[] }> = []
    for (const s of live) {
      const label = byDay
        ? s.wipe_label
          ? dayLabel(parseWipeLabel(s.wipe_label))
          : 'Вайп ещё не видел'
        : ''
      // По метке, а не по соседству: аим-трейны API ставит в конец.
      const same = groups.find((g) => g.label === label)
      if (same) same.rows.push(s)
      else groups.push({ label, rows: [s] })
    }
    return { groups, empty }
  }, [servers, byDay])

  return (
    <div>
      {groups.map((g, gi) => (
        <section key={g.label + gi}>
          {byDay && <GroupHead label={g.label} count={g.rows.length} />}
          <ul>
            {g.rows.map((s) => (
              <ServerRow key={s.id} s={s} />
            ))}
          </ul>
        </section>
      ))}

      {empty.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            aria-expanded={showEmpty}
            className="flex w-full items-baseline gap-3 border-t border-rule bg-panel-2 px-5 py-3 text-left transition-colors hover:bg-panel-3"
          >
            <span className="stencil text-[15px] text-ink-2">Почти пустые</span>
            <span className="num text-[14px] text-ink-3">{empty.length}</span>
            <span className="ml-auto text-[14px] text-ink-3">
              меньше {EMPTY_PEAK_24H} игроков за сутки · {showEmpty ? 'свернуть' : 'показать'}
            </span>
          </button>
          {showEmpty && (
            <ul>
              {empty.map((s) => (
                <ServerRow key={s.id} s={s} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function GroupHead({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3 border-t border-rule bg-panel-2 px-5 py-2.5 first:border-t-0">
      <span className="stencil text-[15px] text-ink">{label}</span>
      <span className="num text-[14px] text-ink-3">{count}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ Строка */

export function ServerRow({ s }: { s: ServerListItem }) {
  const since = wipeAgeHours(s.wipe_label)
  const next = nextWipe(s.next_wipe_estimate)
  // Дата по провалу онлайна — оценка, не свежий вайп: без зелёного и с «≈».
  const estimated = s.wipe_basis === 'online'
  const fresh = !estimated && since != null && since < 24
  const soon = next.tone === 'soon'
  const dead = s.online_stale || (s.max > 0 && s.online / s.max < 0.05)

  const wipeText = (
    <>
      <span className={cx('text-[15px]', fresh ? 'font-semibold text-good' : 'text-ink')}>
        {estimated && s.wipe_label ? '≈ ' : ''}
        {relativeWipe(s.wipe_label)}
      </span>
      {s.wipe_label && (
        <span className="num hidden text-[13px] text-ink-3 lg:block">{localWipeLabel(s.wipe_label)}</span>
      )}
    </>
  )

  const nextText =
    next.tone === 'unknown' ? (
      <span className="text-[15px] text-ink-3">—</span>
    ) : (
      <>
        <span className={cx('text-[15px]', soon ? 'font-semibold text-warn' : 'text-ink')}>
          {next.text}
        </span>
        {nextWipeNote(s, next.tone) && (
          <span className="hidden text-[13px] text-ink-3 lg:block">
            {nextWipeNote(s, next.tone).replace(' · ', '')}
          </span>
        )}
      </>
    )

  return (
    <li
      className="row border-t border-rule first:border-t-0"
      data-flag={fresh ? 'fresh' : soon ? 'soon' : undefined}
      data-dim={dead || undefined}
    >
      <Link to={`/servers/${s.id}`} className={cx('grid gap-x-6 gap-y-2 px-5 py-3.5', COLS)}>
        {/* сервер */}
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-semibold text-ink">{s.name}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="chip">{serverTypeLabel(s.type)}</span>
            {s.rate && <span className="chip">{s.rate}</span>}
            {s.country && <span className="chip">{s.country.toUpperCase()}</span>}
            {/* на телефоне онлайн — в этой же строке */}
            <span className="num ml-auto text-[15px] text-ink lg:hidden">
              {s.online_stale ? (
                <span className="text-ink-3">нет данных</span>
              ) : (
                <>
                  {thousands(s.online)}
                  <span className="text-ink-3"> / {thousands(s.max)}</span>
                </>
              )}
            </span>
          </span>
        </span>

        {/* онлайн */}
        <span className="hidden lg:block">
          <span className="num block shrink-0 text-[17px] text-ink">
            {s.online_stale ? (
              <span className="text-[14px] text-ink-3">нет данных</span>
            ) : (
              <>
                {thousands(s.online)}
                <span className="text-[14px] text-ink-3"> / {thousands(s.max)}</span>
              </>
            )}
          </span>
          {!s.online_stale && (
            <span className="block w-full max-w-[140px] lg:mt-1.5">
              <Meter value={s.online} max={s.max} />
            </span>
          )}
        </span>

        {/* вайпы: на телефоне — две колонки под названием */}
        <span className="flex items-baseline justify-between gap-4 lg:contents">
          <span>
            <span className="text-[14px] text-ink-3 lg:hidden">вайп </span>
            {wipeText}
          </span>
          <span className="text-right">
            <span className="text-[14px] text-ink-3 lg:hidden">след. </span>
            {nextText}
          </span>
        </span>
      </Link>
    </li>
  )
}
