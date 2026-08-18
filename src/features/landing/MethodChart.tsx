import { useEffect, useState } from 'react'
import { getHistory, getServer } from '../../lib/api'
import type { HistoryPoint, ServerDetail } from '../../lib/types'
import { nextWipe, shortDate, thousands } from '../../lib/format'
import { Card, CardHeader, StatusPill } from '../../components/ui'
import { OnlineChart } from '../../components/charts/OnlineChart'

/* Живая карточка настоящего сервера на главной — тот же компонент графика,
   что и внутри приложения. Никаких «примерных» картинок: человек видит
   ровно то, что получит, кликнув.

   Если API недоступен, показываем слепок реального ответа /history за
   25.07.2026 и прямо это подписываем. Слепок — настоящие цифры, просто
   не сегодняшние; выдавать его за живые данные было бы враньём. */

const ATLAS_ID = 299

const SNAPSHOT_POINTS: HistoryPoint[] = [
  { ts: '2026-07-23 07:00:00', avg: 50 },
  { ts: '2026-07-23 08:00:00', avg: 61 },
  { ts: '2026-07-23 09:00:00', avg: 87 },
  { ts: '2026-07-23 10:00:00', avg: 105 },
  { ts: '2026-07-23 11:00:00', avg: 117 },
  { ts: '2026-07-23 12:00:00', avg: 122 },
  { ts: '2026-07-23 13:00:00', avg: 126 },
  { ts: '2026-07-23 14:00:00', avg: 161 },
  { ts: '2026-07-23 15:00:00', avg: 271 },
  { ts: '2026-07-23 16:00:00', avg: 1221 },
  { ts: '2026-07-23 17:00:00', avg: 1492 },
  { ts: '2026-07-23 18:00:00', avg: 1485 },
  { ts: '2026-07-23 19:00:00', avg: 1405 },
  { ts: '2026-07-23 20:00:00', avg: 1208 },
  { ts: '2026-07-23 21:00:00', avg: 1184 },
  { ts: '2026-07-23 22:00:00', avg: 1124 },
  { ts: '2026-07-23 23:00:00', avg: 1076 },
  { ts: '2026-07-24 00:00:00', avg: 929 },
  { ts: '2026-07-24 01:00:00', avg: 779 },
  { ts: '2026-07-24 02:00:00', avg: 698 },
  { ts: '2026-07-24 03:00:00', avg: 676 },
  { ts: '2026-07-24 04:00:00', avg: 672 },
  { ts: '2026-07-24 05:00:00', avg: 645 },
  { ts: '2026-07-24 06:00:00', avg: 696 },
  { ts: '2026-07-24 07:00:00', avg: 759 },
  { ts: '2026-07-24 08:00:00', avg: 890 },
  { ts: '2026-07-24 09:00:00', avg: 889 },
  { ts: '2026-07-24 10:00:00', avg: 892 },
  { ts: '2026-07-24 11:00:00', avg: 890 },
  { ts: '2026-07-24 12:00:00', avg: 890 },
  { ts: '2026-07-24 13:00:00', avg: 893 },
  { ts: '2026-07-24 14:00:00', avg: 890 },
  { ts: '2026-07-24 15:00:00', avg: 889 },
  { ts: '2026-07-24 16:00:00', avg: 892 },
  { ts: '2026-07-24 19:00:00', avg: 901 },
  { ts: '2026-07-24 20:00:00', avg: 891 },
  { ts: '2026-07-24 21:00:00', avg: 881 },
  { ts: '2026-07-24 22:00:00', avg: 893 },
  { ts: '2026-07-24 23:00:00', avg: 847 },
  { ts: '2026-07-25 00:00:00', avg: 791 },
  { ts: '2026-07-25 01:00:00', avg: 711 },
  { ts: '2026-07-25 02:00:00', avg: 615 },
  { ts: '2026-07-25 03:00:00', avg: 601 },
  { ts: '2026-07-25 04:00:00', avg: 587 },
  { ts: '2026-07-25 05:00:00', avg: 503 },
  { ts: '2026-07-25 06:00:00', avg: 588 },
  { ts: '2026-07-25 07:00:00', avg: 690 },
  { ts: '2026-07-25 08:00:00', avg: 692 },
]

const SNAPSHOT = {
  name: 'Atlas - EU 2X Monthly | Vanilla+ | No BP Wipes',
  cycle: '7 дней',
  peak: 1495,
  next: '2026-07-30 06:01:52',
}

export function MethodChart() {
  const [server, setServer] = useState<ServerDetail | null>(null)
  const [points, setPoints] = useState<HistoryPoint[] | null>(null)
  const [wipes, setWipes] = useState<Array<{ ts: string; number: number }>>([])
  const [live, setLive] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([getServer(ATLAS_ID), getHistory(ATLAS_ID, '7d')])
      .then(([s, h]) => {
        if (!alive || !h.points?.length) return
        setServer(s)
        setPoints(h.points)
        setWipes((h.wipes ?? []).map((w, i) => ({ ts: w.wipe_time, number: i + 1 })))
        setLive(true)
      })
      .catch(() => {
        /* остаёмся на слепке */
      })
    return () => {
      alive = false
    }
  }, [])

  const shown = points ?? SNAPSHOT_POINTS
  const name = server?.name ?? SNAPSHOT.name
  const cycle = server?.cycle ?? SNAPSHOT.cycle
  const peak = server?.peak ?? SNAPSHOT.peak
  const nextEstimate = server?.next_wipe_estimate ?? SNAPSHOT.next

  return (
    <Card>
      <CardHeader
        title={name}
        sub={
          live
            ? 'Живые данные с наблюдения — те же, что в веб-версии'
            : 'Слепок реального ответа API за 25.07.2026 — сейчас база не отвечает'
        }
        right={<StatusPill tone={live ? 'good' : 'muted'} dot={live}>{live ? 'живой сервер' : 'слепок'}</StatusPill>}
      />
      <div className="px-4 pt-3 pb-4">
        <OnlineChart points={shown} wipes={wipes} granularity="hourly" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-line border-t border-line sm:grid-cols-4 sm:divide-y-0">
        {[
          ['Цикл', cycle ?? 'не определён'],
          ['След. вайп', shortDate(nextEstimate) ? `~${shortDate(nextEstimate)}` : '—'],
          ['Через', nextWipe(nextEstimate).text],
          ['Пик цикла', thousands(peak)],
        ].map(([k, v]) => (
          <div key={k} className="px-4 py-2.5">
            <div className="text-[11px] tracking-wide text-ink-3 uppercase">{k}</div>
            <div className="tnum mt-0.5 text-[14px] font-semibold text-ink">{v}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}
