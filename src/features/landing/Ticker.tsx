import { useEffect, useState } from 'react'
import { getRecentEvents } from '../../lib/api'
import type { LiveEvent } from '../../lib/types'
import { pad2, parseSqlDateTime } from '../../lib/format'

/* Лента наблюдения. Если бэкенд молчит — ленты просто нет: выдуманные
   строки создавали бы впечатление, что мониторинг работает, когда он лёг. */

export function Ticker() {
  const [events, setEvents] = useState<LiveEvent[] | null>(null)

  useEffect(() => {
    let alive = true
    getRecentEvents()
      .then((r) => alive && setEvents(r.events?.length ? r.events : null))
      .catch(() => alive && setEvents(null))
    return () => {
      alive = false
    }
  }, [])

  if (!events) return null
  const loop = [...events, ...events]

  return (
    <div className="marquee-host overflow-hidden border-y border-rule bg-panel py-1.5">
      <div className="marquee flex w-max gap-8">
        {loop.map((e, i) => {
          const d = parseSqlDateTime(e.time)
          const [kind, ...rest] = e.text.split('·')
          const detail = rest.join('·').trim()
          const tone =
            /подтвержд/i.test(kind) ? 'text-good' : /отклон/i.test(kind) ? 'text-bad' : 'text-ink-3'
          return (
            <span key={i} className="flex shrink-0 items-baseline gap-2 text-[12px]">
              {d && (
                <span className="num text-ink-3">
                  {pad2(d.getHours())}:{pad2(d.getMinutes())}
                </span>
              )}
              <span className={tone}>{kind.trim()}</span>
              {detail && <span className="text-ink-2">{detail}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
