/* Форматтеры. Главное правило проекта живёт здесь:
   лучше честный прочерк, чем красивое враньё. Ни одна функция
   не додумывает дату, если её нет. */

export const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
export const WEEKDAYS_FULL = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
]

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Бэкенд отдаёт SQL-datetime без таймзоны — Safari такое не парсит через new Date() */
export function parseSqlDateTime(value?: string | null): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value)
  if (!m) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0)
}

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export const pluralServers = (n: number) => plural(n, 'сервер', 'сервера', 'серверов')
export const pluralDays = (n: number) => plural(n, 'день', 'дня', 'дней')
export const pluralHours = (n: number) => plural(n, 'час', 'часа', 'часов')

export function thousands(n: number | null | undefined) {
  if (n == null) return '—'
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** "1 284" → "1.3К" для плиток, где важна не точность, а порядок */
export function compact(n: number | null | undefined) {
  if (n == null) return '—'
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace('.0', '') + 'К'
  return (n / 1_000_000).toFixed(1).replace('.0', '') + ' млн'
}

/** wipe_label приходит как "DD.MM HH:MM" без года — год восстанавливаем назад */
export function parseWipeLabel(label?: string | null): Date | null {
  const m = /^(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/.exec(label || '')
  if (!m) return null
  const now = new Date()
  const d = new Date(now.getFullYear(), +m[2] - 1, +m[1], +m[3], +m[4])
  if (d > now) d.setFullYear(d.getFullYear() - 1)
  return d
}

export function relativeWipe(label?: string | null): string {
  const d = parseWipeLabel(label)
  if (!d) return '—'
  const hoursAgo = (Date.now() - d.getTime()) / 3_600_000
  if (hoursAgo < 1) return 'меньше часа назад'
  if (hoursAgo < 24) {
    const h = Math.round(hoursAgo)
    return `${h} ${pluralHours(h)} назад`
  }
  const days = Math.round(hoursAgo / 24)
  return `${days} ${pluralDays(days)} назад`
}

export function wipeAgeHours(label?: string | null): number | null {
  const d = parseWipeLabel(label)
  if (!d) return null
  return (Date.now() - d.getTime()) / 3_600_000
}

export type NextWipe = {
  text: string
  tone: 'soon' | 'known' | 'unknown'
  /** сколько часов осталось — для сортировки/прогресса, null если неизвестно */
  hours: number | null
}

export function nextWipe(estimate?: string | null): NextWipe {
  const d = parseSqlDateTime(estimate)
  if (!d) return { text: 'цикл не определён', tone: 'unknown', hours: null }
  const diffH = (d.getTime() - Date.now()) / 3_600_000
  if (diffH <= 0) return { text: 'со дня на день', tone: 'soon', hours: 0 }
  if (diffH <= 24) return { text: `через ${Math.round(diffH)} ч`, tone: 'soon', hours: diffH }
  const days = Math.round(diffH / 24)
  if (days === 1) return { text: 'завтра', tone: 'soon', hours: diffH }
  return { text: `через ${days} ${pluralDays(days)}`, tone: 'known', hours: diffH }
}

export function shortDateTime(iso?: string | null) {
  const d = parseSqlDateTime(iso)
  if (!d) return null
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function shortDate(iso?: string | null) {
  const d = parseSqlDateTime(iso)
  if (!d) return null
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
}

export function intervalText(hours?: number | null) {
  if (hours == null) return '—'
  if (hours < 48) return `${Math.round(hours)} ч`
  return `${Math.round(hours / 24)} д`
}

export function hoursFromMinutes(min?: number | null) {
  if (min == null) return null
  return `${thousands(Math.round(min / 60))} ч`
}

export function activityLabel(status?: string | null) {
  switch (status) {
    case 'growing':
      return 'набирает'
    case 'stable':
      return 'стабилен'
    case 'draining':
      return 'пустеет'
    default:
      return null
  }
}

export const serverTypeLabel = (t?: string | null) => (t === 'vanilla' ? 'Vanilla' : 'Mod')

/** BM иногда кладёт в map_name рекламу вместо названия карты */
export function isJunkMapName(name?: string | null) {
  return /https?:|discord\.gg|\.(com|net|ru|gg|org)\b|\//i.test(name || '')
}
