import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchServers } from '../../lib/api'
import type { ServerListItem } from '../../lib/types'
import { relativeWipe, thousands, wipeAgeHours } from '../../lib/format'
import { Card, CardHeader, StatusPill, Skeleton } from '../../components/ui'

/* Живая врезка в первом экране: кто вайпнулся за последние сутки.
   Лучшее доказательство, что система работает — не слоган, а список,
   который меняется каждый день. Если данных нет, блок не рисуется:
   пустая рамка с надписью «скоро» хуже, чем её отсутствие. */

export function HeroLive() {
  const [items, setItems] = useState<ServerListItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    searchServers({ filter: 'all', sort: 'wipe_fresh', calendar: 'today', limit: 5, offset: 0 })
      .then((d) => {
        if (!alive) return
        const fresh = (d.servers ?? [])
          .filter((s) => s.source !== 'battlemetrics_live')
          .filter((s) => {
            const age = wipeAgeHours(s.wipe_label)
            return age != null && age < 24
          })
          .slice(0, 5)
        if (fresh.length) setItems(fresh)
        else setFailed(true)
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  if (failed) return null

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Вайпнулись за последние сутки"
        sub="подтверждено кривой онлайна, не названием"
        right={
          <StatusPill tone="good" dot>
            живое
          </StatusPill>
        }
      />
      {!items ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-line/70">
          {items.map((s) => (
            <Link
              key={s.id}
              to={`/servers/${s.id}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">{s.name}</span>
                <span className="block text-[11.5px] text-good">{relativeWipe(s.wipe_label)}</span>
              </span>
              <span className="tnum shrink-0 text-[12px] text-ink-3">
                {thousands(s.online)}/{thousands(s.max)}
              </span>
            </Link>
          ))}
        </div>
      )}
      <Link
        to="/servers"
        className="block border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3 transition-colors hover:text-ink-2"
      >
        Смотреть все свежие вайпы →
      </Link>
    </Card>
  )
}
