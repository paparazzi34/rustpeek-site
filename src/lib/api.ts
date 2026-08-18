/* Слой доступа к данным. Один вход, один способ упасть.
   Никаких «тихих ноликов»: если бэкенд молчит — это ошибка, и UI её показывает. */

import type {
  CalendarKey,
  FilterKey,
  HistoryResponse,
  HourlyProfile,
  LiveEvent,
  Period,
  Player,
  SearchResponse,
  ServerDetail,
  SiteStats,
  SortKey,
  WipeRow,
} from './types'
import * as mock from './mock'

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://api.rustpeek.ru'

const forcedMock =
  import.meta.env.VITE_USE_MOCK === '1' ||
  (typeof location !== 'undefined' && new URLSearchParams(location.search).get('mock') === '1')

/** Признак «сидим на демо-данных» — UI обязан сказать об этом вслух */
export let usingMock = forcedMock

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: 'not_found' | 'unavailable' = 'unavailable',
  ) {
    super(message)
  }
}

async function get<T>(path: string, fallback: () => T, init?: RequestInit): Promise<T> {
  if (forcedMock) return await delay(fallback())
  try {
    const res = await fetch(API_BASE + path, { ...init, cache: 'no-store' })
    if (res.status === 404) throw new ApiError('not_found', 'not_found')
    if (!res.ok) throw new ApiError('bad status ' + res.status)
    usingMock = false
    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'not_found') throw err
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    // Бэкенд недоступен — в дев-режиме показываем моки, чтобы можно было
    // работать над оболочкой; в проде честно роняем в ошибку.
    if (import.meta.env.DEV) {
      usingMock = true
      return await delay(fallback())
    }
    throw err instanceof ApiError ? err : new ApiError('network')
  }
}

const delay = <T,>(v: T, ms = 220) => new Promise<T>((r) => setTimeout(() => r(v), ms))

export interface SearchParams {
  q?: string
  filter: FilterKey
  sort: SortKey
  calendar: CalendarKey
  limit: number
  offset: number
  signal?: AbortSignal
}

export function searchServers(p: SearchParams): Promise<SearchResponse> {
  const qs = new URLSearchParams({
    filter: p.filter,
    sort: p.sort,
    calendar: p.calendar,
    limit: String(p.limit),
    offset: String(p.offset),
  })
  if (p.q) qs.set('q', p.q)
  return get<SearchResponse>('/api/servers/search?' + qs.toString(), mock.mockSearch, {
    signal: p.signal,
  })
}

export const getServer = (id: number) =>
  get<ServerDetail>('/api/servers/' + id, () => mock.mockDetail(id))

export const getHistory = (id: number, period: Period, cycleOffset = 0) =>
  get<HistoryResponse>(
    `/api/servers/${id}/history?period=${period}` +
      (period === 'cycle' ? `&cycle_offset=${cycleOffset}` : ''),
    () => mock.mockHistory(id, period),
  )

export const getWipes = (id: number) =>
  get<{ wipes: WipeRow[] }>(`/api/servers/${id}/wipes`, () => mock.mockWipes(id))

export const getHourlyProfile = (id: number) =>
  get<HourlyProfile>(`/api/servers/${id}/hourly_profile`, () => mock.mockHourly(id))

export const getPlayer = (q: string) =>
  get<Player>('/api/player/' + encodeURIComponent(q), () => mock.mockPlayer(q))

export const getRecentEvents = () =>
  get<{ events: LiveEvent[] }>('/api/events/recent', mock.mockEvents)

/** Счётчики отдаёт наш же воркер из KV — это свой домен, не API_BASE */
export async function getStats(): Promise<SiteStats | null> {
  if (forcedMock) return mock.mockStats()
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' })
    if (!res.ok) throw new Error('bad status')
    return (await res.json()) as SiteStats
  } catch {
    // Молчим: на главной остаются цифры-фолбэки из разметки, а не нули.
    return null
  }
}
