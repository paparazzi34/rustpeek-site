import { useState } from 'react'
import { getPlayer } from '../../lib/api'
import type { Player, TrustFactor } from '../../lib/types'
import { hoursFromMinutes, shortDate, thousands } from '../../lib/format'
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  SearchField,
  Skeleton,
  StatusPill,
  cx,
} from '../../components/ui'

/* Trust Score раньше рисовался кольцом. Кольцо — это диаграмма из одного
   значения: оно занимает место, но не сообщает больше, чем само число.
   Здесь число — герой, а под ним честная шкала 0–100 с порогами, по которой
   видно, где именно стоит игрок. */

const FACTOR_MAX: Record<string, number> = {
  age: 38,
  hours: 45,
  profile: 12,
  reputation: 40,
  reports: 25,
}

function trustTone(score: number) {
  if (score >= 70) return { color: 'var(--color-good)', label: 'высокий' }
  if (score >= 40) return { color: 'var(--color-rust)', label: 'средний' }
  return { color: 'var(--color-danger)', label: 'низкий' }
}

export function PlayersPage() {
  const [query, setQuery] = useState('')
  const [player, setPlayer] = useState<Player | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'not_found' | 'error'>('idle')

  const run = async () => {
    const q = query.trim()
    if (!q) return
    setState('loading')
    setPlayer(null)
    try {
      const p = await getPlayer(q)
      setPlayer(p)
      setState('idle')
    } catch (e) {
      setState((e as { kind?: string })?.kind === 'not_found' ? 'not_found' : 'error')
    }
  }

  return (
    <div className="fade-up">
      <h1 className="text-[22px] leading-tight font-semibold tracking-tight">Досье на игрока</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-ink-2">
        Trust Score, часы, возраст аккаунта, баны и где играл. Профиль закрыт — так и напишу
        «неизвестно», а не нарисую ноль.
      </p>

      <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-2">
        <div className="min-w-[260px] flex-1">
          <SearchField
            value={query}
            onChange={setQuery}
            onSubmit={run}
            placeholder="76561198012345678 или ссылка на профиль Steam"
          />
        </div>
        <Button variant="solid" onClick={run} disabled={!query.trim() || state === 'loading'}>
          {state === 'loading' ? 'Ищу…' : 'Пробить'}
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">
        Ищу по SteamID64 или ссылке. Если в адресе ник, а не цифры — вставляй ссылку целиком,
        разберусь сам.
      </p>

      {state === 'loading' && (
        <Card className="mt-5 p-4">
          <div className="flex gap-4">
            <Skeleton className="size-16 rounded-[6px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </Card>
      )}

      {state === 'not_found' && (
        <Card className="mt-5">
          <ErrorState title="Профиль не найден — проверь SteamID." />
        </Card>
      )}
      {state === 'error' && (
        <Card className="mt-5">
          <ErrorState title="Steam сейчас не отвечает. Попробуй позже." onRetry={run} />
        </Card>
      )}

      {player && <PlayerCard player={player} />}
    </div>
  )
}

function PlayerCard({ player: p }: { player: Player }) {
  const tone = trustTone(p.trust.score)
  const banCount = (p.bans?.vac_ban_count ?? 0) + (p.bans?.game_ban_count ?? 0)
  const online = p.status_text && p.status_text !== 'не в сети' && p.status_text !== 'неизвестно'
  const year = p.account_created_at ? p.account_created_at.slice(0, 4) : null

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-line bg-surface-2 text-[22px] font-semibold text-ink-3">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" width={64} height={64} className="size-full object-cover" />
              ) : (
                (p.name || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[17px] font-semibold">{p.name || 'без ника'}</h2>
                <StatusPill tone={online ? 'good' : 'muted'} dot>
                  {p.status_text || 'неизвестно'}
                </StatusPill>
              </div>
              <p className="mt-1 font-mono text-[11.5px] text-ink-3">
                {p.steam_id} ·{' '}
                {p.profile_public === true
                  ? 'профиль открыт'
                  : p.profile_public === false
                    ? 'профиль закрыт'
                    : 'приватность неизвестна'}
                {year ? ` · с ${year} года` : ''}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.bans && (
                  <StatusPill tone={banCount > 0 ? 'plain' : 'good'} className={banCount > 0 ? 'border-danger/40 text-danger' : ''}>
                    {banCount > 0 ? `${banCount} бан(ов)` : 'банов нет'}
                  </StatusPill>
                )}
                {hoursFromMinutes(p.rust_playtime_minutes) && (
                  <StatusPill>{hoursFromMinutes(p.rust_playtime_minutes)} в Rust</StatusPill>
                )}
                {hoursFromMinutes(p.rust_playtime_2weeks_minutes) && (
                  <StatusPill>{hoursFromMinutes(p.rust_playtime_2weeks_minutes)} за 2 недели</StatusPill>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Где играл"
            sub="По наблюдению RustPeek — включая серверы, где Steam-профиль ничего не показывает"
          />
          {!p.server_history?.length ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-3">
              Наблюдение только начато — история появится по мере игры.
            </p>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead className="text-ink-3">
                <tr className="border-b border-line">
                  <th className="px-4 py-2 text-left font-medium">Сервер</th>
                  <th className="px-2 py-2 text-right font-medium">Наиграно</th>
                  <th className="px-4 py-2 text-right font-medium">Когда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {p.server_history.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-ink">
                      <span className="flex items-center gap-2">
                        {row.is_current && <span className="size-1.5 rounded-full bg-good animate-live" />}
                        {row.server_name || 'неизвестный сервер'}
                      </span>
                    </td>
                    <td className="tnum px-2 py-2 text-right text-ink-2">
                      {hoursFromMinutes(row.duration_minutes) ?? '—'}
                    </td>
                    <td className="tnum px-4 py-2 text-right text-ink-3">
                      {row.is_current
                        ? 'сейчас'
                        : [shortDate(row.first_seen_at), shortDate(row.left_at ?? row.last_seen_at)]
                            .filter(Boolean)
                            .filter((v, idx, arr) => arr.indexOf(v) === idx)
                            .join('–') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------- Trust Score */}
      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">
            Trust Score
          </div>
          <div className="mt-2 flex items-end gap-2.5">
            <span className="text-[44px] leading-none font-semibold" style={{ color: tone.color }}>
              {p.trust.score}
            </span>
            <span className="pb-1.5 text-[13px] text-ink-3">из 100 · {tone.label}</span>
          </div>

          {/* шкала: заливка несёт состояние, трек — тот же тон приглушённо */}
          <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-3/15">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
              style={{ width: `${p.trust.score}%`, background: tone.color }}
            />
          </div>
          <div className="tnum mt-1 flex justify-between text-[10.5px] text-ink-3">
            <span>0</span>
            <span>40</span>
            <span>70</span>
            <span>100</span>
          </div>

          <p className="mt-3 text-[12.5px] text-ink-2">{p.trust.label}</p>
        </Card>

        <Card>
          <CardHeader title="Из чего складывается оценка" />
          <div className="space-y-2.5 p-4">
            {(p.trust.factors ?? []).map((f) => (
              <FactorRow key={f.key} factor={f} />
            ))}
            <p className="pt-1 text-[11.5px] text-ink-3">
              Инвентарь в оценку не входит — его стоимость и содержимое смотри в боте.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function FactorRow({ factor: f }: { factor: TrustFactor }) {
  const max = FACTOR_MAX[f.key] ?? 40
  const pct = Math.min(100, Math.round((Math.abs(f.points) / max) * 100))
  const neg = f.points < 0
  return (
    <div className={cx('grid grid-cols-[minmax(0,1fr)_64px_36px] items-center gap-2', f.points === 0 && 'opacity-55')}>
      <span className="truncate text-[12.5px] text-ink-2">{f.label}</span>
      <span className="relative h-1.5 overflow-hidden rounded-full bg-ink-3/15">
        <span
          className={cx('absolute inset-y-0 rounded-full', neg ? 'right-0 bg-danger' : 'left-0 bg-good')}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className={cx('tnum text-right text-[12px]', neg ? 'text-danger' : 'text-ink')}>
        {f.points > 0 ? `+${thousands(f.points)}` : thousands(f.points)}
      </span>
    </div>
  )
}
