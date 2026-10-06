import { useEffect, useRef, useState } from 'react'
import { getRecentEvents, getStats } from '../../lib/api'
import type { LiveEvent, SiteStats } from '../../lib/types'
import { pad2, parseSqlDateTime, thousands } from '../../lib/format'

/* ЖИВАЯ ЛЕНТА.

   Одна полоса, которая плывёт влево: реальные события наблюдения вперемешку
   со счётчиками. Она заменяет ряд из четырёх крупных чисел с подписями —
   тот ряд всегда выглядит как реклама («2 миллиона замеров!»), а движущаяся
   лента выглядит как работа, которая идёт прямо сейчас.

   Про честность движения. Числа НЕ накручиваются сами по таймеру — это было
   бы враньём. Они один раз докручиваются от нуля при появлении (обычная
   анимация показа настоящего значения), а дальше меняются только когда
   бэкенд отдал новое: лента перезапрашивает счётчики раз в минуту.
   Если бэкенд молчит — остаются последние известные числа, а не нули. */

const FALLBACK: Required<SiteStats> = {
  servers_total: 2479,
  servers_tracked: 1098,
  wipes: 9676,
  online_measurements: 1_980_611,
}

export function LiveStrip() {
  const [stats, setStats] = useState<Required<SiteStats>>(FALLBACK)
  const [events, setEvents] = useState<LiveEvent[]>([])

  useEffect(() => {
    let alive = true
    const pull = () => {
      getStats().then((s) => alive && s && setStats({ ...FALLBACK, ...s }))
      getRecentEvents()
        .then((r) => alive && setEvents(r.events ?? []))
        .catch(() => {})
    }
    pull()
    const t = setInterval(pull, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  // Счётчики и события чередуются, чтобы лента не распадалась на два разных
  // куска: пока едет, глаз видит и цифру, и живое событие рядом.
  const cells: React.ReactNode[] = []
  const counters = [
    { value: stats.online_measurements, label: 'замеров онлайна' },
    { value: stats.wipes, label: 'вайпов подтверждено' },
    { value: stats.servers_total, label: 'серверов в базе' },
    { value: stats.servers_tracked, label: 'с игроками за сутки' },
  ]

  counters.forEach((c, i) => {
    cells.push(<Counter key={`c${i}`} value={c.value} label={c.label} />)
    const e = events[i]
    if (e) cells.push(<Event key={`e${i}`} e={e} />)
  })
  events.slice(counters.length).forEach((e, i) => cells.push(<Event key={`x${i}`} e={e} />))

  if (cells.length === 0) return null
  const loop = [...cells, ...cells]

  return (
    <div className="marquee-host overflow-hidden border-y border-rule bg-panel">
      <div className="marquee flex w-max items-center py-2">
        {loop.map((cell, i) => (
          <span key={i} className="flex items-center">
            <span className="px-5">{cell}</span>
            <span className="h-3 w-px bg-rule-2" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* Счётчик: один раз докручивается до настоящего значения, дальше следует
   за данными. Длительность фиксированная — не зависит от величины числа,
   иначе миллионы крутились бы вечно. */
function Counter({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value)
  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="num text-[13px] text-ink">{thousands(shown)}</span>
      <span className="text-[12px] text-ink-3">{label}</span>
    </span>
  )
}

export function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(target)
  const from = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    const start = performance.now()
    const a = first.current ? 0 : from.current
    first.current = false
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      // ease-out: быстро стартует, мягко доезжает
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(a + (target - a) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = target
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      from.current = target
    } else {
      raf = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(raf)
  }, [target, ms])

  return value
}

function Event({ e }: { e: LiveEvent }) {
  const d = parseSqlDateTime(e.time)
  const [kind, ...rest] = e.text.split('·')
  const detail = rest.join('·').trim()
  const tone = /подтвержд/i.test(kind)
    ? 'text-good'
    : /отклон/i.test(kind)
      ? 'text-bad'
      : 'text-ink-3'

  return (
    <span className="flex items-baseline gap-2 whitespace-nowrap text-[12px]">
      {d && (
        <span className="num text-ink-3">
          {pad2(d.getHours())}:{pad2(d.getMinutes())}
        </span>
      )}
      <span className={tone}>{kind.trim()}</span>
      {detail && <span className="text-ink-2">{detail}</span>}
    </span>
  )
}

/** Счётчики отдельно — нужны заголовку главной, чтобы цифры в нём были живыми */
export function useSiteStats() {
  const [stats, setStats] = useState<Required<SiteStats>>(FALLBACK)
  useEffect(() => {
    let alive = true
    getStats().then((s) => alive && s && setStats({ ...FALLBACK, ...s }))
    return () => {
      alive = false
    }
  }, [])
  return stats
}
