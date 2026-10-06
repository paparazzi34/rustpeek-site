import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CycleTrack } from '../../components/CycleTrack'
import { Sparkline } from '../../components/charts/Signature'
import { Button, EmptyState, ErrorState, Meter, SearchField, Segmented, cx } from '../../components/ui'
import { searchServers } from '../../lib/api'
import {
  EMPTY_PEAK_24H,
  activityLabel,
  dayLabel,
  isNearlyEmpty,
  parseWipeLabel,
  localWipeLabel,
  nextWipe,
  nextWipeNote,
  pluralServers,
  relativeWipe,
  serverTypeLabel,
  thousands,
  wipeAgeHours,
} from '../../lib/format'
import type { CalendarKey, FilterKey, SearchResponse, ServerListItem, SortKey } from '../../lib/types'

/* СПИСОК СЕРВЕРОВ — сердце продукта.

   Организован по вайп-календарю, а не по онлайну: «по онлайну» умеет любой
   мониторинг, а вопрос игрока звучит «куда зайти сегодня».

   Про визуальную массу. Пятьдесят одинаковых строк — это стена, глазу не за
   что зацепиться. Поэтому масса разная и она означает конкретное:
     · свежий вайп (< 24 ч) — зелёный флажок в жёлобе и яркая дата;
     · вайп в ближайшие сутки — жёлтый флажок;
     · мёртвый или пустеющий сервер — вся строка уходит в 45% непрозрачности.
   Никаких новых цветов, только иерархия. */

const LIMIT = 40

/* Сетка списка объявлена в одном месте: заголовки колонок и строки обязаны
   совпадать по ширинам, иначе таблица «поедет». Колонка спарклайна
   появляется только когда бэкенд отдаёт кривые. */
const COLS_SPARK = 'grid-cols-[30px_1fr_120px_70px_150px_180px]'
const COLS_PLAIN = 'grid-cols-[30px_1fr_120px_150px_180px]'
const COLS_SPARK_LG = 'lg:grid-cols-[30px_1fr_120px_70px_150px_180px]'
const COLS_PLAIN_LG = 'lg:grid-cols-[30px_1fr_120px_150px_180px]'

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
  { value: 'cycle', label: 'Ближе к вайпу', hint: 'Сначала те, где вайп вот-вот будет' },
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
          offset > 0 && prev
            ? { ...r, servers: [...prev.servers, ...r.servers] }
            : r,
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

  // Колонка «48 ч» существует, только если бэкенд реально отдал кривые.
  // Столбец из шестнадцати прочерков — это шум, а не честность: честность
  // здесь в том, чтобы не занимать место под данные, которых нет.
  const showSpark = useMemo(
    () => servers.some((s) => s.sparkline?.some((v) => v != null)),
    [servers],
  )

  const withoutFreshWipe = useMemo(
    () => servers.length === 0 && (data?.local_count_before_filter ?? 0) > 0,
    [servers.length, data],
  )

  return (
    <>
      {/* ---- Шапка страницы: заголовок и поиск в одной строке ---- */}
      <div className="bleed border-b border-rule py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <div className="eyebrow">вайп-календарь</div>
            <h1 className="mt-2 text-[24px] leading-none font-semibold text-ink">Серверы</h1>
          </div>
          <div className="w-full max-w-lg">
            <SearchField
              value={draft}
              onChange={setDraft}
              onSubmit={() => patch({ q: draft.trim() })}
              placeholder="Название сервера"
              action={
                draft ? (
                  <Button
                    variant="bare"
                    type="button"
                    className="h-7"
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

        {/* ---- Календарь: главный переключатель, поэтому он крупнее прочих ---- */}
        <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-3">
          {CALENDAR.map((c) => {
            const on = c.value === calendar
            return (
              <button
                key={c.value}
                onClick={() => patch({ calendar: c.value })}
                className={cx(
                  'stencil border-b-2 px-3 py-1.5 text-[13px] transition-colors',
                  on
                    ? 'border-rust text-ink'
                    : 'border-transparent text-ink-3 hover:text-ink-2',
                )}
              >
                {c.label}
                {counts?.[c.value] != null && (
                  <span className="num ml-2 text-[11px] normal-case opacity-60">
                    {thousands(counts[c.value])}
                  </span>
                )}
              </button>
            )
          })}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented value={filter} options={FILTERS} onChange={(v) => patch({ filter: v })} ariaLabel="Тип сервера" />
            <Segmented value={sort} options={SORTS} onChange={(v) => patch({ sort: v })} ariaLabel="Сортировка" />
          </div>
        </div>
      </div>

      {/* ---- Заголовки колонок ---- */}
      <div className="bleed hidden border-b border-rule py-2 lg:block">
        <div className={cx('grid items-center gap-x-5', showSpark ? COLS_SPARK : COLS_PLAIN)}>
          <span className="eyebrow">#</span>
          <span className="eyebrow">сервер</span>
          <span className="eyebrow">онлайн</span>
          {showSpark && <span className="eyebrow">48 ч</span>}
          <span className="eyebrow">последний вайп</span>
          <span className="eyebrow">фаза цикла</span>
        </div>
      </div>

      {error ? (
        <div className="bleed">
          <ErrorState
            title="Не дозвонился до бэкенда, поэтому списка нет. Показывать пустую таблицу вместо данных я не буду."
            onRetry={() => setOffset((o) => o)}
          />
        </div>
      ) : loading && servers.length === 0 ? (
        <div className="bleed pt-1">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton mb-px h-[54px]" style={{ opacity: 1 - i * 0.06 }} />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <div className="bleed">
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
                  </button>{' '}
                  — там серверы есть, просто у части из них цикл ещё не определён.
                </>
              ) : (
                'Проверь написание или поищи по части названия — «rustafied» найдёт все их площадки.'
              )
            }
          />
        </div>
      ) : (
        <>
          <GroupedRows servers={servers} byDay={sort === 'wipe_fresh'} showSpark={showSpark} />

          <div className="bleed flex items-center justify-between gap-4 py-6">
            <span className="text-[12.5px] text-ink-3">
              Показано <span className="num text-ink-2">{servers.length}</span> из{' '}
              <span className="num text-ink-2">{thousands(total)}</span> {pluralServers(total)}
            </span>
            {servers.length < total && (
              <Button onClick={() => setOffset(servers.length)} disabled={loading}>
                {loading ? 'Гружу…' : 'Показать ещё'}
              </Button>
            )}
          </div>
        </>
      )}
    </>
  )
}

/* --------------------------------------------------------------- Группы
   Редизайн 2026-10-02 («всё в одну кучу»). Сорок одинаковых строк подряд
   не читались: свежий вайп с сотнями игроков стоял вперемешку с пустыми
   серверами. Теперь при сортировке «свежий вайп» строки разбиты по дню
   вайпа, а почти пустые серверы (пик за сутки меньше EMPTY_PEAK_24H)
   собраны в свёрнутый блок внизу — они не спрятаны, просто не мешают. */

function GroupedRows({
  servers,
  byDay,
  showSpark,
}: {
  servers: ServerListItem[]
  byDay: boolean
  showSpark: boolean
}) {
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
      // По метке, а не по соседству: аим-трейны API ставит в конец
      // сортировки, и без этого «Сегодня» появлялось бы дважды.
      const same = groups.find((g) => g.label === label)
      if (same) same.rows.push(s)
      else groups.push({ label, rows: [s] })
    }
    return { groups, empty }
  }, [servers, byDay])

  let rank = 0
  return (
    <div className="bleed">
      {groups.map((g, gi) => (
        <section key={g.label + gi}>
          {byDay && (
            <div className="group-head">
              <span className="stencil text-[13px] text-ink">{g.label}</span>
              <span className="num text-[11.5px] text-ink-3">{g.rows.length}</span>
            </div>
          )}
          <ul>
            {g.rows.map((s) => (
              <ServerRow key={s.id} s={s} rank={++rank} showSpark={showSpark} />
            ))}
          </ul>
        </section>
      ))}

      {empty.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowEmpty((v) => !v)}
            className="group-head w-full text-left transition-colors hover:text-ink"
            aria-expanded={showEmpty}
          >
            <span className="stencil text-[13px] text-ink-2">Почти пустые</span>
            <span className="num text-[11.5px] text-ink-3">{empty.length}</span>
            <span className="ml-auto text-[12px] text-ink-3">
              меньше {EMPTY_PEAK_24H} игроков за сутки · {showEmpty ? 'свернуть' : 'показать'}
            </span>
          </button>
          {showEmpty && (
            <ul>
              {empty.map((s) => (
                <ServerRow key={s.id} s={s} rank={++rank} showSpark={showSpark} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ Строка */

function ServerRow({
  s,
  rank,
  showSpark,
}: {
  s: ServerListItem
  rank: number
  showSpark: boolean
}) {
  const since = wipeAgeHours(s.wipe_label)
  const next = nextWipe(s.next_wipe_estimate)
  // Дата по провалу онлайна — оценка, не свежий вайп: без зелёного и с «≈».
  const estimated = s.wipe_basis === 'online'
  const fresh = !estimated && since != null && since < 24
  const soon = next.tone === 'soon'
  const activity = activityLabel(s.activity_status)
  const dead = s.online_stale || (s.max > 0 && s.online / s.max < 0.05)

  return (
    <li
      className="row border-b border-rule"
      data-flag={fresh ? 'fresh' : soon ? 'soon' : undefined}
      data-dim={dead || undefined}
    >
      <Link
        to={`/servers/${s.id}`}
        className={cx(
          'grid grid-cols-[30px_1fr] items-center gap-x-5 gap-y-2 py-3 pl-3',
          showSpark ? COLS_SPARK_LG : COLS_PLAIN_LG,
        )}
      >
        {/* ранг */}
        <span className="num self-start pt-0.5 text-[12px] text-ink-3 lg:self-center lg:pt-0">
          {rank}
        </span>

        {/* название и метаданные */}
        <span className="min-w-0">
          <span
            className={cx(
              'block truncate text-[14.5px]',
              fresh ? 'font-semibold text-ink' : 'font-medium text-ink',
            )}
          >
            {s.name}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11.5px] text-ink-3">
            <span>{serverTypeLabel(s.type)}</span>
            {s.rate && <span className="num">{s.rate}</span>}
            {activity && <span>{activity}</span>}
            {s.country && <span className="num uppercase">{s.country}</span>}
          </span>

          {/* На узком экране цифры и трек переезжают под название */}
          <span className="mt-2.5 block pr-3 lg:hidden">
            <span className="flex items-center gap-3">
              <span className="num shrink-0 text-[13px] text-ink">
                {thousands(s.online)}
                <span className="text-ink-3"> / {thousands(s.max)}</span>
              </span>
              <span className="w-full max-w-[130px] min-w-0">
                <Meter value={s.online} max={s.max} />
              </span>
            </span>
            {next.tone !== 'unknown' && (
              <span className="mt-2.5 block">
                <CycleTrack sinceHours={since} untilHours={next.hours} height={14} />
              </span>
            )}
            <span className="mt-1.5 flex justify-between gap-3 text-[11px]">
              <span className={fresh ? 'text-good' : 'text-ink-3'}>
                {estimated && s.wipe_label ? '≈ ' : ''}
                {relativeWipe(s.wipe_label)}
              </span>
              {next.tone !== 'unknown' && (
                <span className={cx('truncate text-right', soon ? 'text-warn' : 'text-ink-3')}>
                  {next.text}
                  {nextWipeNote(s, next.tone)}
                </span>
              )}
            </span>
          </span>
        </span>

        {/* онлайн */}
        <span className="hidden lg:block">
          <span className="num block text-[13.5px] text-ink">
            {thousands(s.online)}
            <span className="text-[12px] text-ink-3"> / {thousands(s.max)}</span>
          </span>
          <span className="mt-1.5 block">
            <Meter value={s.online} max={s.max} />
          </span>
          {s.online_stale && (
            <span className="mt-1 block text-[10.5px] text-ink-3">нет свежих данных</span>
          )}
        </span>

        {/* форма кривой за двое суток — колонки нет, если данных нет */}
        {showSpark && (
          <span className="hidden lg:block">
            <Sparkline values={s.sparkline} active={fresh} />
          </span>
        )}

        {/* последний вайп */}
        <span className="hidden lg:block">
          <span className={cx('block text-[13px]', fresh ? 'text-good' : 'text-ink-2')}>
            {estimated && s.wipe_label ? '≈ ' : ''}
            {relativeWipe(s.wipe_label)}
          </span>
          {s.wipe_label && (
            <span className="num mt-0.5 block text-[11px] text-ink-3">{localWipeLabel(s.wipe_label)}</span>
          )}
        </span>

        {/* фаза цикла — подписной элемент. Цикла нет — один прочерк, а не
            трек с пунктиром и курсивом в каждой строке: это был шум. */}
        <span className="hidden pr-1 lg:block">
          {next.tone === 'unknown' ? (
            <span className="block text-right text-[12px] text-ink-3" title="Цикл не определён">
              —
            </span>
          ) : (
            <>
              <CycleTrack sinceHours={since} untilHours={next.hours} height={18} />
              <span
                className={cx(
                  'mt-1 block text-right text-[11.5px]',
                  next.tone === 'soon' ? 'text-warn' : 'text-ink-3',
                )}
              >
                {next.text}
                {nextWipeNote(s, next.tone)}
              </span>
            </>
          )}
        </span>
      </Link>
    </li>
  )
}
