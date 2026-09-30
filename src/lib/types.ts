/* Контракт api.rustpeek.ru — снят один в один с текущего фронта,
   чтобы новая оболочка встала на живой бэкенд без правок на сервере. */

export type ServerType = 'vanilla' | 'mod'
export type ActivityStatus = 'growing' | 'stable' | 'draining' | string | null

export interface ServerListItem {
  id: number
  name: string
  type: ServerType
  rate: string | null
  online: number
  max: number
  online_stale?: boolean
  activity_status?: ActivityStatus
  /** "DD.MM HH:MM" — последний вайп */
  wipe_label?: string | null
  /** map — по смене карты (факт), online — по провалу онлайна (оценка) */
  wipe_basis?: 'map' | 'online' | null
  /** SQL datetime или null, если цикл не определён */
  next_wipe_estimate?: string | null
  next_wipe_forced?: boolean
  /** длина цикла в сутках, null — не определён */
  cycle?: number | null
  cycle_source?: 'history' | 'name' | null
  country?: string | null
  source?: 'battlemetrics_live' | string
  /** короткая история онлайна для спарклайна в строке — 28 точек, 6ч-бакеты
      за 7 суток (database.get_sparkline_batch), null = в бакете нет данных */
  sparkline?: (number | null)[]
}

export interface SearchResponse {
  servers: ServerListItem[]
  total?: number
  calendar_counts?: Record<CalendarKey, number>
  local_count_before_filter?: number
  filter_applied?: string
}

export interface ServerDetail {
  id: number
  name: string
  online: number
  max: number
  rate: string | null
  type: ServerType
  map_name?: string | null
  map_size?: number | string | null
  ip?: string | null
  port?: number | null
  country?: string | null
  /** "DD.MM HH:MM" */
  wipe?: string | null
  wipe_state?: 'fresh' | string | null
  cycle?: string | null
  /** history — наш цикл по подтверждённым вайпам; name — заявлен админом в названии */
  cycle_source?: 'history' | 'name' | null
  next_wipe_estimate?: string | null
  /** следующим будет глобальный (принудительный) вайп Facepunch */
  next_wipe_forced?: boolean
  /** ближайший глобал — граница «не позже», если свой цикл неизвестен */
  forced_wipe?: string | null
  /** на чём основана дата вайпа: map — смена карты (факт), остальное — нет */
  wipe_basis?: 'map' | 'online' | 'name' | 'global' | 'bm' | null
  peak?: number | null
  avg?: number | null
  history_span_days?: number | null
  total_measurements?: number | null
  team_limit?: string | null
  bp_wipe?: string | null
  activity_status?: ActivityStatus
  online_stale?: boolean
  /** "18:00–23:00" и т.п. — окно прайм-тайма (services/analytics.py::get_prime_and_quiet_time).
      Отдельно от /hourly_profile — та отдаёт 24 точки для графика, это готовый текст-диапазон. */
  prime_time?: string | null
  /** "180 дней" и т.п. — то же наблюдение, что history_span_days, но отформатировано текстом */
  history_days?: string | null
  days?: DailyOnlinePoint[]
  /** true — текст daily-breakdown пришёл, но парсер (api_service/serializers.py
      ::_parse_daily_lines) не смог его разобрать. НЕ значит "данных нет вообще" —
      значит "формат разошёлся с парсером", см. decisions.md техдолг. */
  days_unavailable?: boolean
}

export interface DailyOnlinePoint {
  label: string
  /** "DD.MM" */
  date: string
  /** готовый текст: "588", "412 −30%", "вайп" или "— нет данных" для дыры */
  value: string
  /** 0-100, доля от максимума пика за окно */
  pct: number
  is_wipe: boolean
  is_gap: boolean
}

export interface HistoryPoint {
  ts: string
  avg?: number | null
  max?: number | null
}

export interface HistoryWipe {
  wipe_time: string
  [k: string]: unknown
}

export interface HistoryResponse {
  points: HistoryPoint[]
  wipes?: HistoryWipe[]
  granularity?: 'hourly' | 'daily' | string
  cycle?: { has_prev: boolean; has_next: boolean; cycle_offset: number } | null
}

export interface WipeRow {
  wipe_time: string
  weekday?: number | null
  interval_hours?: number | null
  peak_after_24h?: number | null
  source_note?: string | null
  suspicious?: boolean
}

export interface HourlyProfile {
  hours: (number | null)[]
  peak_hour?: number | null
}

export interface TrustFactor {
  key: string
  label: string
  points: number
}

export interface PlayerServerRow {
  server_name?: string | null
  server_id?: number | null
  duration_minutes?: number | null
  first_seen_at?: string | null
  last_seen_at?: string | null
  left_at?: string | null
  is_current?: boolean
}

/** Сессия из BattleMetrics: где и когда человек играл. */
export interface BmSession {
  start?: string | null
  stop?: string | null
  /** Ник на момент сессии — в Rust он же ник Steam */
  name_at_the_time?: string | null
  battlemetrics_server_id?: number | string | null
  /** Заполнено, только если сервер есть в нашей базе */
  server_id?: number | null
  server_name?: string | null
}

/** Тёзка: под одним ником в BM может играть несколько человек. */
export interface BmCandidate {
  bm_player_id: number | string
  name?: string | null
  last_seen_at?: string | null
  last_server_name?: string | null
  last_server_known?: boolean
}

/**
 * Где играл — по данным BattleMetrics. Связка идёт через ник Steam,
 * поэтому статус говорит, насколько совпадению можно верить:
 * confirmed — сошлось с нашим собственным наблюдением;
 * single — единственный точный тёзка, проверить нечем;
 * ambiguous — тёзок несколько, выбор за человеком;
 * not_found — BM про такой ник не знает.
 */
export interface BmHistory {
  status: 'confirmed' | 'single' | 'ambiguous' | 'not_found'
  sessions: BmSession[]
  candidates: BmCandidate[]
}

export interface Player {
  steam_id: string
  name?: string | null
  avatar_url?: string | null
  status_text?: string | null
  account_created_at?: string | null
  profile_public?: boolean | null
  rust_playtime_minutes?: number | null
  rust_playtime_2weeks_minutes?: number | null
  bans?: { vac_ban_count?: number; game_ban_count?: number } | null
  trust: { score: number; label: string; factors?: TrustFactor[] }
  server_history?: PlayerServerRow[]
  bm_history?: BmHistory | null
}

/** /api/stats — отдаётся воркером из KV, обновляется пушем с VPS */
export interface SiteStats {
  servers_tracked?: number
  servers_total?: number
  wipes?: number
  online_measurements?: number
}

/** /api/events/recent — живая лента наблюдения для тикера на главной */
export interface LiveEvent {
  time?: string | null
  /** "тип · деталь" — бэкенд кладёт тип первым сегментом */
  text: string
}

export type CalendarKey = 'today' | 'tomorrow' | 'week' | 'all'
export type SortKey = 'online' | 'wipe_fresh' | 'cycle'
export type FilterKey = 'all' | 'vanilla' | 'mod'
export type Period = '24h' | '7d' | 'month' | 'all' | 'cycle'
