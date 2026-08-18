/* Моки — только чтобы оболочку можно было смотреть и верстать без бэкенда.
   Включаются:
   1) явно — VITE_USE_MOCK=1 или ?mock=1 в адресе;
   2) автоматически — если живой API не ответил (иначе разработка встаёт).
   В проде с живым API этот файл в работу не вступает. */

import type {
  HistoryResponse,
  HourlyProfile,
  LiveEvent,
  Player,
  SearchResponse,
  ServerDetail,
  ServerListItem,
  SiteStats,
  WipeRow,
} from './types'
import { pad2 } from './format'

const NAMES: Array<[string, 'vanilla' | 'mod', string, number, number]> = [
  ['Rustafied.com - EU Main', 'vanilla', 'x1', 218, 225],
  ['Atlas - EU 2X Monthly | Vanilla+ | No BP Wipes', 'mod', 'x2', 1495, 1500],
  ['Magic Rust #4 [X2 | Solo/Duo/Trio]', 'mod', 'x2', 342, 400],
  ['Rustoria.co - EU East Medium', 'vanilla', 'x1', 209, 225],
  ['EU RENEGADE 2x Monthly Medium', 'mod', 'x2', 106, 150],
  ['Bestrust.ru | X5 | Классика', 'mod', 'x5', 88, 200],
  ['[RU] Vital Rust — Wipe Friday', 'mod', 'x3', 154, 250],
  ['Rusty Moose |US Monthly|', 'vanilla', 'x1', 187, 250],
  ['[EU] RustValley 10x PVE #2', 'mod', 'x10', 28, 100],
  ['Reddit.com/r/PlayRust - EU', 'vanilla', 'x1', 176, 200],
  ['ZERG.rust | 2x | No Limit', 'mod', 'x2', 61, 120],
  ['Rustafied.com - EU Long III', 'vanilla', 'x1', 143, 200],
  ['SOLO ONLY | Rust Arena x3', 'mod', 'x3', 0, 100],
  ['PICNIC RUST × 3 | Дружелюбный', 'mod', 'x3', 74, 150],
  ['Hustle Rust - [2X, VANILLA]', 'mod', 'x2', 231, 300],
  ['NoLimit Rust | X1000 | Fun', 'mod', 'x1000', 12, 50],
]

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function wipeLabelFor(hoursAgo: number) {
  const d = new Date(Date.now() - hoursAgo * 3_600_000)
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function sqlDT(offsetHours: number) {
  const d = new Date(Date.now() + offsetHours * 3_600_000)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`
}

/** Кривая онлайна с настоящей подписью вайпа: пик → провал → рост */
function onlineSeries(points: number, max: number, rnd: () => number, wipeAt: number[]) {
  const out: number[] = []
  for (let i = 0; i < points; i++) {
    const dayPhase = ((i % 24) / 24) * Math.PI * 2
    const daily = 0.55 + 0.45 * Math.sin(dayPhase - Math.PI / 2)
    let cycleBoost = 1
    for (const w of wipeAt) {
      const since = i - w
      if (since >= 0 && since < 24) cycleBoost = Math.max(cycleBoost, 1.35 - since * 0.012)
      if (since >= -6 && since < 0) cycleBoost = Math.min(cycleBoost, 0.18)
    }
    const decay = 1 - Math.min(0.35, (i % 168) / 168 / 3)
    const noise = 0.92 + rnd() * 0.16
    out.push(Math.max(0, Math.round(max * 0.72 * daily * cycleBoost * decay * noise)))
  }
  return out
}

export function mockServers(): ServerListItem[] {
  return NAMES.map((n, i) => {
    const rnd = seeded(i * 7919 + 13)
    const cycleDays = [7, 3, 14, 30][i % 4]
    const sinceWipe = Math.round(rnd() * cycleDays * 24)
    const known = i % 5 !== 3
    return {
      id: 100 + i,
      name: n[0],
      type: n[1],
      rate: n[2],
      online: n[3],
      max: n[4],
      online_stale: i === 12,
      activity_status: i % 4 === 0 ? 'growing' : i % 4 === 1 ? 'stable' : i % 4 === 2 ? 'draining' : null,
      wipe_label: wipeLabelFor(sinceWipe),
      next_wipe_estimate: known ? sqlDT(cycleDays * 24 - sinceWipe) : null,
      country: ['DE', 'RU', 'US', 'NL'][i % 4],
      sparkline: onlineSeries(28, n[4], seeded(i * 31 + 5), [(i * 7) % 40]),
    }
  })
}

export function mockSearch(): SearchResponse {
  const servers = mockServers()
  return {
    servers,
    total: 1098,
    calendar_counts: { today: 14, tomorrow: 27, week: 163, all: 1098 },
    local_count_before_filter: servers.length,
    filter_applied: 'all',
  }
}

export function mockDetail(id: number): ServerDetail {
  const idx = Math.abs(id - 100) % NAMES.length
  const n = NAMES[idx]
  const cycleDays = [7, 3, 14, 30][idx % 4]
  const sinceWipe = Math.round(seeded(idx * 7919 + 13)() * cycleDays * 24)
  return {
    id,
    name: n[0],
    online: n[3],
    max: n[4],
    rate: n[2],
    type: n[1],
    map_name: 'Procedural Map',
    map_size: 4250,
    ip: '51.75.62.' + (10 + idx),
    port: 28015 + idx,
    country: 'DE',
    wipe: wipeLabelFor(sinceWipe),
    wipe_state: sinceWipe < 24 ? 'fresh' : null,
    cycle: idx % 5 === 3 ? null : `${cycleDays} дней`,
    next_wipe_estimate: idx % 5 === 3 ? null : sqlDT(cycleDays * 24 - sinceWipe),
    peak: Math.round(n[4] * 0.98),
    avg: Math.round(n[4] * 0.55),
    history_span_days: 86,
    total_measurements: 24_180,
    team_limit: ['без лимита', 'соло/дуо/трио', 'квад'][idx % 3],
    bp_wipe: idx % 2 ? 'только при форс-вайпе' : 'каждый вайп',
    activity_status: 'stable',
    prime_time: '18:00–23:00',
    history_days: '86 дней',
    days_unavailable: idx === 2, // один мок-сервер показывает состояние "недоступно"
    days: idx === 2 ? undefined : mockDailyBreakdown(idx, n[4]),
  }
}

function mockDailyBreakdown(idx: number, maxOnline: number) {
  const rnd = seeded(idx * 4133 + 9)
  const today = new Date()
  const wipeDayIndex = 4
  const gapDayIndex = idx % 2 === 0 ? 2 : -1
  return Array.from({ length: 8 }, (_, i) => {
    const dayNo = 8 - i
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
    if (i === gapDayIndex) {
      return { label: `День ${dayNo}`, date, value: '— нет данных', pct: 0, is_wipe: false, is_gap: true }
    }
    if (i === wipeDayIndex) {
      const peak = Math.round(maxOnline * (0.5 + rnd() * 0.3))
      return { label: `День ${dayNo} · вайп`, date, value: String(peak), pct: Math.round((peak / maxOnline) * 100), is_wipe: true, is_gap: false }
    }
    const peak = Math.round(maxOnline * (0.3 + rnd() * 0.65))
    const drop = i > wipeDayIndex ? Math.round(rnd() * 25) : 0
    return {
      label: `День ${dayNo}`,
      date,
      value: drop ? `${peak} −${drop}%` : String(peak),
      pct: Math.round((peak / maxOnline) * 100),
      is_wipe: false,
      is_gap: false,
    }
  }).reverse()
}

export function mockHistory(id: number, period: string): HistoryResponse {
  const idx = Math.abs(id - 100) % NAMES.length
  const max = NAMES[idx][4]
  const count = period === '24h' ? 24 : period === '7d' ? 168 : period === 'month' ? 30 : 90
  const granularity = period === '24h' || period === '7d' ? 'hourly' : 'daily'
  const stepH = granularity === 'hourly' ? 1 : 24
  const windowH = count * stepH

  // Времена вайпов берём ровно те же, что отдаёт mockWipes — иначе номера
  // на графике и в таблице разъедутся, а это ровно та беда, которую
  // нумерация и должна была вылечить.
  const cycleDays = [7, 3, 14, 30][idx % 4]
  const wipeOffsets: number[] = []
  for (let i = 0; i < 8; i++) {
    const at = -(i * cycleDays * 24 + 6)
    if (-at < windowH) wipeOffsets.push(at)
  }
  const wipeIdx = wipeOffsets.map((at) => Math.round((windowH + at) / stepH))

  const vals = onlineSeries(count, max, seeded(idx * 17 + 3), wipeIdx)
  const points = vals.map((v, i) => ({
    ts: sqlDT(-(count - i) * stepH),
    avg: v,
    max: Math.round(v * 1.12),
  }))
  return {
    points,
    wipes: wipeOffsets.map((at) => ({ wipe_time: sqlDT(at) })),
    granularity,
    cycle: { has_prev: true, has_next: false, cycle_offset: 0 },
  }
}

export function mockWipes(id: number): { wipes: WipeRow[] } {
  const idx = Math.abs(id - 100) % NAMES.length
  const cycleDays = [7, 3, 14, 30][idx % 4]
  const rows: WipeRow[] = []
  for (let i = 0; i < 8; i++) {
    const at = -(i * cycleDays * 24 + 6)
    const d = new Date(Date.now() + at * 3_600_000)
    rows.push({
      wipe_time: sqlDT(at),
      weekday: d.getDay(),
      interval_hours: i === 7 ? null : cycleDays * 24 + (i % 3) * 4,
      peak_after_24h: Math.round(NAMES[idx][4] * (0.9 - i * 0.03)),
      source_note: i === 2 ? 'подтверждён по A2S' : null,
      suspicious: i === 5,
    })
  }
  return { wipes: rows }
}

export function mockHourly(id: number): HourlyProfile {
  const idx = Math.abs(id - 100) % NAMES.length
  const rnd = seeded(idx * 41 + 9)
  const hours = Array.from({ length: 24 }, (_, h) => {
    const peak = 19
    const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak))
    return Math.round(NAMES[idx][4] * (0.25 + 0.7 * Math.exp(-(dist * dist) / 26)) * (0.92 + rnd() * 0.16))
  })
  return { hours, peak_hour: 19 }
}

export function mockStats(): SiteStats {
  return {
    servers_tracked: 1098,
    servers_total: 2479,
    wipes: 9676,
    online_measurements: 1_980_611,
  }
}

export function mockEvents(): { events: LiveEvent[] } {
  const t = (h: number) => sqlDT(-h)
  return {
    events: [
      { time: t(0.2), text: 'вайп подтверждён · Atlas - EU 2X Monthly · цикл 3 дня' },
      { time: t(0.6), text: 'замер онлайна · 1 495 из 1 500, очередь 12' },
      { time: t(1.1), text: 'вайп подтверждён · Bestrust.ru | X5 · интервал 7 дней' },
      { time: t(1.8), text: 'взят под наблюдение · PICNIC RUST × 3' },
      { time: t(2.4), text: 'замер онлайна · A2S-скан топ-500 завершён' },
      { time: t(3.2), text: 'вайп отклонён · JUST WIPED в названии, провала на кривой нет' },
    ],
  }
}

export function mockPlayer(q: string): Player {
  return {
    steam_id: /^\d{17}$/.test(q) ? q : '76561198012345678',
    name: 'paparazzi34',
    avatar_url: null,
    status_text: 'в сети · Hustle Rust',
    account_created_at: '2021-03-14 12:00:00',
    profile_public: true,
    rust_playtime_minutes: 96_660,
    rust_playtime_2weeks_minutes: 1_320,
    bans: { vac_ban_count: 0, game_ban_count: 0 },
    trust: {
      score: 73,
      label: 'В целом чисто — но глазами тоже посмотри',
      factors: [
        { key: 'age', label: 'Возраст аккаунта · с 2021', points: 28 },
        { key: 'hours', label: 'Часы в Rust · 1 611 ч', points: 34 },
        { key: 'profile', label: 'Профиль открыт', points: 12 },
        { key: 'reputation', label: 'Репутация по наблюдению', points: 9 },
        { key: 'reports', label: 'Жалобы игроков', points: -10 },
      ],
    },
    server_history: [
      {
        server_name: 'Hustle Rust - [2X, VANILLA]',
        duration_minutes: 320,
        first_seen_at: sqlDT(-6),
        is_current: true,
      },
      { server_name: 'Magic Rust #4', duration_minutes: 1_140, first_seen_at: sqlDT(-96), left_at: sqlDT(-72) },
      { server_name: 'Atlas - EU 2X Monthly', duration_minutes: 2_600, first_seen_at: sqlDT(-360), left_at: sqlDT(-200) },
      { server_name: 'Rustafied.com - EU Main', duration_minutes: 480, first_seen_at: sqlDT(-720), left_at: sqlDT(-700) },
    ],
  }
}
