import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, ErrorState, SearchField, Skeleton, Tag, cx } from '../../components/ui'
import { getBmPlayerSessions, getPlayer } from '../../lib/api'
import { hoursFromMinutes, parseSqlDateTime, plural, shortDateTime, thousands } from '../../lib/format'
import type { BmCandidate, BmSession, Player } from '../../lib/types'

/* ДОСЬЕ ИГРОКА.

   Trust Score показан не кольцом-«спидометром», а линейкой с разложением
   по факторам. Кольцо красиво, но отвечает только «сколько», а вопрос
   у сыщика другой: «из чего это сложилось». Поэтому каждый фактор —
   отдельная строка со своим вкладом в очках, и сумма сходится глазами.

   Поиск честно называется поиском по SteamID: ника у нас нет, обещать
   его нельзя. */

export function PlayersPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(q), [q])

  useEffect(() => {
    if (!q) {
      setPlayer(null)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    getPlayer(q)
      .then((p) => alive && setPlayer(p))
      .catch(() =>
        alive &&
        setError(
          'Такого профиля не нашлось. Проверь SteamID64 — это 17 цифр — или вставь ссылку на профиль целиком.',
        ),
      )
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [q])

  return (
    <>
      <div className="bleed border-b border-rule py-5">
        <div className="eyebrow">досье</div>
        <h1 className="mt-2 text-[24px] leading-none font-semibold text-ink">Игроки</h1>
        <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">
          Возраст аккаунта, часы в Rust, баны и где этого человека видели по нашему наблюдению.
          Профиль закрыт — так и напишу «неизвестно», а не нарисую ноль.
        </p>

        <div className="mt-5 max-w-2xl">
          <SearchField
            value={draft}
            onChange={setDraft}
            onSubmit={() => setParams(draft.trim() ? { q: draft.trim() } : {}, { replace: true })}
            placeholder="76561198012345678 или ссылка на профиль Steam"
            autoFocus={!q}
            action={
              <Button
                variant="solid"
                type="submit"
                className="h-8 shrink-0"
                disabled={!draft.trim()}
              >
                Пробить
              </Button>
            }
          />
          <p className="mt-2 text-[12px] text-ink-3">
            Ищу по SteamID64 или по ссылке. Поиска по нику нет — Steam его не отдаёт.
          </p>
        </div>
      </div>

      {loading && (
        <div className="bleed space-y-3 py-6">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-40 w-full max-w-xl" />
        </div>
      )}

      {error && !loading && (
        <div className="bleed">
          <ErrorState title={error} />
        </div>
      )}

      {player && !loading && !error && <Dossier p={player} />}

      {!q && !loading && (
        <div className="bleed py-10">
          <p className="max-w-xl border-l-2 border-rule-2 py-1 pl-4 text-[13.5px] leading-relaxed text-ink-2">
            Тебя подозрительно метко убили и хочется понять, кто это был? Открой профиль Steam
            убийцы, скопируй ссылку из адресной строки и вставь сюда.
          </p>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ Досье */

function Dossier({ p }: { p: Player }) {
  const created = parseSqlDateTime(p.account_created_at)
  const banned = (p.bans?.vac_ban_count ?? 0) + (p.bans?.game_ban_count ?? 0) > 0

  return (
    <>
      {/* ---- Карточка ---- */}
      <section className="bleed border-b border-rule py-6">
        <div className="flex flex-wrap items-start gap-5">
          {p.avatar_url ? (
            <img
              src={p.avatar_url}
              alt=""
              width={72}
              height={72}
              className="size-[72px] shrink-0 border border-rule object-cover"
            />
          ) : (
            <div className="stencil flex size-[72px] shrink-0 items-center justify-center border border-rule bg-panel text-[24px] text-ink-3">
              {(p.name ?? '?').slice(0, 1)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-[24px] leading-tight font-semibold text-ink">
              {p.name ?? 'Ник неизвестен'}
            </h2>
            <div className="num mt-1 text-[12.5px] text-ink-3">{p.steam_id}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {p.status_text && <Tag tone="good">{p.status_text}</Tag>}
              {banned ? (
                <Tag tone="bad">
                  баны: VAC {p.bans?.vac_ban_count ?? 0}, игровых {p.bans?.game_ban_count ?? 0}
                </Tag>
              ) : (
                <Tag tone="mute">банов нет</Tag>
              )}
              {p.profile_public === false && <Tag tone="warn">профиль закрыт</Tag>}
            </div>
          </div>
        </div>

        {/* ---- Быстрые факты ---- */}
        <div className="mt-6 grid grid-cols-2 border-t border-rule lg:grid-cols-4">
          <Fact
            label="аккаунт создан"
            value={created ? <span className="num">{created.getFullYear()}</span> : 'неизвестно'}
            sub={
              created
                ? `${new Date().getFullYear() - created.getFullYear()} лет в Steam`
                : 'профиль закрыт'
            }
          />
          <Fact
            label="часов в Rust"
            value={
              p.rust_playtime_minutes != null ? (
                <span className="num">{hoursFromMinutes(p.rust_playtime_minutes)}</span>
              ) : (
                'неизвестно'
              )
            }
            sub="за всё время"
            first={false}
          />
          <Fact
            label="за две недели"
            value={
              p.rust_playtime_2weeks_minutes != null ? (
                <span className="num">{hoursFromMinutes(p.rust_playtime_2weeks_minutes)}</span>
              ) : (
                'неизвестно'
              )
            }
            sub="свежая активность"
          />
          <Fact
            label="профиль"
            value={p.profile_public === false ? 'закрыт' : 'открыт'}
            sub={p.profile_public === false ? 'часть данных недоступна' : 'данные видны целиком'}
            first={false}
          />
        </div>
      </section>

      {/* Trust и «где видели» рядом: страница во всю ширину, пустая правая
          половина под досье выглядела бы как недоделка. */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TrustPanel p={p} />
        <SeenOn p={p} />
      </div>

      <PlayedOnBm p={p} />
    </>
  )
}

function Fact({
  label,
  value,
  sub,
  first,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  first?: boolean
}) {
  return (
    <div className={cx('py-4 pr-5', first === false ? 'border-l border-rule pl-5' : '')}>
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-[20px] leading-none font-semibold text-ink">{value}</div>
      {sub && <div className="mt-2 text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  )
}

/* -------------------------------------------------------------- Trust Score
   Линейка вместо кольца: видно и итог, и из чего он сложился. */

function TrustPanel({ p }: { p: Player }) {
  const score = Math.max(0, Math.min(100, p.trust.score))
  const tone = score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad'
  const factors = p.trust.factors ?? []

  return (
    <section className="bleed border-b border-rule py-6 lg:border-r">
      <div className="eyebrow">trust score</div>

      <div className="mt-3 flex items-baseline gap-4">
        <span
          className={cx(
            'num text-[54px] leading-none font-semibold',
            tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : 'text-bad',
          )}
        >
          {score}
        </span>
        <span className="num text-[20px] text-ink-3">/ 100</span>
        <span className="ml-2 max-w-md text-[13.5px] text-ink-2">{p.trust.label}</span>
      </div>

      {/* шкала итога */}
      <div className="relative mt-4 h-1.5 bg-rule">
        <div
          className={cx(
            'absolute inset-y-0 left-0',
            tone === 'good' ? 'bg-good' : tone === 'warn' ? 'bg-warn' : 'bg-bad',
          )}
          style={{ width: `${score}%` }}
        />
      </div>

      {factors.length > 0 && (
        <div className="mt-6 border-t border-rule">
          <div className="eyebrow py-2">из чего сложилось</div>
          {factors.map((f) => (
            <div
              key={f.key}
              className="flex items-center justify-between gap-4 border-t border-rule py-2.5"
            >
              <span className="text-[13px] text-ink-2">{f.label}</span>
              <span
                className={cx(
                  'num shrink-0 text-[13px]',
                  f.points > 0 ? 'text-good' : f.points < 0 ? 'text-bad' : 'text-ink-3',
                )}
              >
                {f.points > 0 ? '+' : ''}
                {f.points}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
        Trust Score — это не приговор и не античит. Он складывается из открытых данных Steam и
        нашего наблюдения. Высокий балл не значит «играет честно», низкий не значит «читер»:
        у новичка с закрытым профилем балл будет низким просто потому, что о нём мало известно.
      </p>
    </section>
  )
}

/* ------------------------------------------------- Где играл (BattleMetrics)

   Своей истории у нас на нового человека нет — он мог ни разу не попасть
   в наш обход. Поэтому идём в BattleMetrics, но связка там идёт по нику
   (в Rust внутриигровой ник = ник Steam), а не по SteamID. Ник — не ключ,
   поэтому каждый ответ снабжён честным статусом, и в неоднозначном случае
   мы не угадываем за человека, а показываем тёзок. */

function PlayedOnBm({ p }: { p: Player }) {
  const bm = p.bm_history
  const [picked, setPicked] = useState<BmCandidate | null>(null)
  const [pickedSessions, setPickedSessions] = useState<BmSession[] | null>(null)
  const [pickError, setPickError] = useState(false)

  // Новый игрок в поиске — сбрасываем выбор тёзки, иначе на чужом досье
  // останется висеть чужая история.
  useEffect(() => {
    setPicked(null)
    setPickedSessions(null)
    setPickError(false)
  }, [p.steam_id])

  if (!bm) return null

  function pick(c: BmCandidate) {
    setPicked(c)
    setPickedSessions(null)
    setPickError(false)
    getBmPlayerSessions(c.bm_player_id)
      .then((r) => setPickedSessions(r.sessions ?? []))
      .catch(() => setPickError(true))
  }

  const sessions = picked ? pickedSessions : bm.sessions

  return (
    <section className="bleed border-b border-rule py-6">
      <div className="eyebrow mb-4">где играл · по данным BattleMetrics</div>

      {bm.status === 'not_found' && (
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          BattleMetrics про этого игрока ничего не знает. Так бывает часто: они видят человека
          только на серверах, где владелец подключил их плагин, а подключают его немногие.
        </p>
      )}

      {bm.status === 'ambiguous' && !picked && (
        <>
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            Под ником <b className="text-ink">{p.name ?? '—'}</b> в BattleMetrics играет{' '}
            <b className="text-ink">{bm.candidates.length}</b>{' '}
            {plural(bm.candidates.length, 'человек', 'человека', 'человек')}. Кто из них твой —
            видно по последнему серверу.
          </p>
          <ul className="space-y-2">
            {bm.candidates.map((c) => (
              <li key={String(c.bm_player_id)}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className="w-full border border-rule px-3 py-2.5 text-left transition-colors hover:border-rust-hot"
                >
                  <span className="text-[13.5px] text-ink">
                    {c.last_server_known ? c.last_server_name : 'сервер не из нашей базы'}
                  </span>
                  <span className="num ml-3 text-[12.5px] text-ink-3">
                    последний раз: {shortDateTime(c.last_seen_at) ?? 'неизвестно'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {(bm.status === 'confirmed' || bm.status === 'single' || picked) && (
        <>
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-2">
            {picked ? (
              <>
                История выбранного тёзки. Что это именно тот человек — решил ты, я это{' '}
                <b className="text-ink">не проверял</b>.
              </>
            ) : bm.status === 'confirmed' ? (
              <>
                Совпадение <b className="text-ink">подтверждено</b>: игрок засветился на том же
                сервере и в то же время, где его видели мы.
              </>
            ) : (
              <>
                Совпадение <b className="text-ink">по нику</b> — тёзок в BattleMetrics не нашлось,
                но стопроцентной гарантии, что это он, у нас нет.
              </>
            )}
          </p>

          {picked && (
            <button
              type="button"
              onClick={() => {
                setPicked(null)
                setPickedSessions(null)
                setPickError(false)
              }}
              className="mb-4 text-[12.5px] text-ink-3 underline transition-colors hover:text-rust-hot"
            >
              ← к списку тёзок
            </button>
          )}

          {pickError ? (
            <p className="text-[13.5px] text-ink-2">История не загрузилась — попробуй ещё раз.</p>
          ) : sessions == null ? (
            <Skeleton className="h-24 w-full" />
          ) : sessions.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">Сессий не нашлось.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th className="eyebrow pb-2 font-normal">сервер</th>
                  <th className="eyebrow pb-2 font-normal">зашёл</th>
                  <th className="eyebrow pb-2 text-right font-normal">вышел</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((sn, i) => (
                  <tr key={i} className="row border-b border-rule">
                    <td className="py-2.5">
                      {sn.server_id ? (
                        <Link
                          to={`/servers/${sn.server_id}`}
                          className="text-[13.5px] text-ink transition-colors hover:text-rust-hot"
                        >
                          {sn.server_name}
                        </Link>
                      ) : (
                        <span className="text-[13.5px] text-ink-2">сервер не из нашей базы</span>
                      )}
                    </td>
                    <td className="num py-2.5 text-[12.5px] text-ink-2">
                      {shortDateTime(sn.start) ?? '—'}
                    </td>
                    <td className="num py-2.5 text-right text-[12.5px] text-ink-3">
                      {sn.stop ? (
                        shortDateTime(sn.stop)
                      ) : (
                        <Tag tone="good">ещё играет</Tag>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
            BattleMetrics видит не все серверы, так что история может быть неполной.
          </p>
        </>
      )}
    </section>
  )
}

/* ----------------------------------------------------------- Где видели */

function SeenOn({ p }: { p: Player }) {
  const rows = p.server_history ?? []

  return (
    <section className="bleed border-b border-rule py-6">
      <div className="eyebrow mb-4">где видели · по нашему наблюдению, не по данным Steam</div>

      {rows.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          Этого человека наше наблюдение не встречало. Мы сканируем топ-500 серверов — если он
          играет на маленьком, его там просто некому увидеть.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="eyebrow pb-2 font-normal">сервер</th>
              <th className="eyebrow pb-2 font-normal">сколько пробыл</th>
              <th className="eyebrow pb-2 text-right font-normal">когда</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="row border-b border-rule">
                <td className="py-2.5">
                  {r.server_id ? (
                    <Link
                      to={`/servers/${r.server_id}`}
                      className="text-[13.5px] text-ink transition-colors hover:text-rust-hot"
                    >
                      {r.server_name ?? 'сервер #' + r.server_id}
                    </Link>
                  ) : (
                    <span className="text-[13.5px] text-ink">{r.server_name ?? '—'}</span>
                  )}
                  {r.is_current && (
                    <Tag tone="good" className="ml-3">
                      сейчас там
                    </Tag>
                  )}
                </td>
                <td className="num py-2.5 text-[12.5px] text-ink-2">
                  {r.duration_minutes != null
                    ? `${thousands(Math.round(r.duration_minutes / 60))} ч`
                    : '—'}
                </td>
                <td className="num py-2.5 text-right text-[12.5px] text-ink-3">
                  {shortDateTime(r.last_seen_at ?? r.left_at ?? r.first_seen_at) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
