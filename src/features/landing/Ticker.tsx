import { useEffect, useState } from 'react'
import { getRecentEvents } from '../../lib/api'
import type { LiveEvent } from '../../lib/types'
import { pad2, parseSqlDateTime } from '../../lib/format'
import { cx } from '../../components/ui'

/* Лента живых событий мониторинга. Если API молчит — блока просто нет:
   выдуманные строки «для красоты» здесь были бы прямым враньём о том,
   что система сейчас работает. */

function eventTime(value?: string | null) {
  const d = parseSqlDateTime(value)
  if (d) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const m = /(\d{2}):(\d{2})/.exec(value || '')
  return m ? `${m[1]}:${m[2]}` : ''
}

function splitEvent(text: string) {
  const i = text.indexOf(' · ')
  return i === -1 ? { type: text, detail: '' } : { type: text.slice(0, i), detail: text.slice(i + 3) }
}

function typeTone(type: string) {
  if (type.startsWith('вайп подтверждён')) return 'text-good'
  if (type.startsWith('вайп отклонён')) return 'text-ink-2'
  if (type.startsWith('взят под наблюдение')) return 'text-rust-hot'
  return 'text-ink-3'
}

export function Ticker() {
  const [events, setEvents] = useState<LiveEvent[] | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      getRecentEvents()
        .then((d) => alive && setEvents(d.events?.length ? d.events : null))
        .catch(() => alive && setEvents(null))
    void load()
    const t = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  if (!events) return null

  const row = (e: LiveEvent, i: number) => {
    const { type, detail } = splitEvent(e.text || '')
    const time = eventTime(e.time)
    return (
      <span key={i} className="flex shrink-0 items-center gap-2 border-r border-line px-6">
        {time && <span className="tnum text-ink-3/70">{time}</span>}
        <span className={cx('font-medium', typeTone(type))}>{type}</span>
        {detail && <span className="text-ink-3">· {detail}</span>}
      </span>
    )
  }

  return (
    <div className="marquee-host overflow-hidden border-y border-line bg-surface/60">
      <div className="marquee flex w-max py-2 font-mono text-[12px] whitespace-nowrap">
        {events.map(row)}
        {events.map((e, i) => row(e, i + events.length))}
      </div>
    </div>
  )
}
