import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { OnlineChart } from '../../components/charts/OnlineChart'
import { getHistory, searchServers } from '../../lib/api'
import { relativeWipe, thousands, wipeAgeHours } from '../../lib/format'
import type { HistoryResponse, ServerListItem } from '../../lib/types'
import { Skeleton } from '../../components/ui'
import { Signature } from '../../components/charts/Signature'

/* ЖИВОЙ ПРИМЕР — правая половина первого экрана.

   Берём настоящий сервер, у которого вайп подтвердился недавно, и рисуем
   его настоящую кривую за неделю. Подпись обязательна: без названия сервера
   график — это картинка, с названием — доказательство. Именно поэтому он
   стоит на главной, а не схема.

   Если свежих вайпов нет или бэкенд молчит — на это место встаёт схема,
   подписанная схемой, и причина названа вслух. Выдать нарисованную кривую
   за наблюдение нельзя: это ровно то место, где продукт обещает не врать. */

export function LiveSample() {
  const [server, setServer] = useState<ServerListItem | null>(null)
  const [history, setHistory] = useState<HistoryResponse | null>(null)
  const [dead, setDead] = useState(false)

  useEffect(() => {
    let alive = true
    searchServers({ filter: 'all', sort: 'wipe_fresh', calendar: 'today', limit: 8, offset: 0 })
      .then((r) => {
        // Именно свежий вайп: блок обещает показать, как выглядит вайп
        // в данных, значит вайп должен быть виден в выбранном окне.
        const s = (r.servers ?? []).find((x) => {
          const h = wipeAgeHours(x.wipe_label)
          return h != null && h < 36
        })
        if (!alive || !s) {
          if (alive) setDead(true)
          return
        }
        setServer(s)
        return getHistory(s.id, '7d').then((h) => {
          if (!alive) return
          if (!h.points?.length) setDead(true)
          else setHistory(h)
        })
      })
      .catch(() => alive && setDead(true))
    return () => {
      alive = false
    }
  }, [])

  // Свежего вайпа может не быть — тихие сутки бывают. Тогда вместо живого
  // примера показываем схему: правая половина первого экрана не должна
  // пустеть, иначе вёрстка разъезжается влево. Схема честно подписана
  // схемой, а причина отсутствия живого примера названа вслух.
  if (dead) return <SchemaFallback />

  if (!server || !history) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  const wipes = history.wipes?.length ?? 0

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex items-baseline justify-between gap-4 border-b border-rule pb-2">
        <div className="min-w-0">
          <div className="eyebrow">живой пример · данные с наблюдения</div>
          <Link
            to={`/servers/${server.id}`}
            className="mt-1.5 block truncate text-[15px] font-semibold text-ink transition-colors hover:text-rust-hot"
          >
            {server.name}
          </Link>
        </div>
        <div className="num shrink-0 text-right text-[12px] text-ink-3">
          {thousands(server.online)} / {thousands(server.max)}
        </div>
      </figcaption>

      <OnlineChart
        points={history.points}
        wipes={history.wipes}
        granularity={history.granularity}
        height={216}
      />

      <p className="mt-2 text-[12px] text-ink-3">
        {wipes > 0 ? (
          <>
            Зелёные рубцы — вайпы, подтверждённые по форме кривой. Последний был{' '}
            <span className="text-good">{relativeWipe(server.wipe_label)}</span>.
          </>
        ) : (
          <>Кривая за семь суток. Подтверждённых вайпов в этом окне нет.</>
        )}
      </p>
    </figure>
  )
}

/* Запасной вариант: схема вместо живого примера. Подписана как схема —
   выдавать нарисованную кривую за наблюдение нельзя. */
function SchemaFallback() {
  return (
    <figure className="m-0">
      <figcaption className="mb-3 border-b border-rule pb-2">
        <div className="eyebrow">схема · как вайп выглядит в данных</div>
        <p className="mt-1.5 text-[13px] text-ink-2">
          Живого примера сейчас нет: за последние сутки ни один сервер не вайпнулся.
        </p>
      </figcaption>
      <Signature />
    </figure>
  )
}
