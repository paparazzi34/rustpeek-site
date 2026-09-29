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
   его настоящую кривую. Если цикл сервера известен — за 30 дней, чтобы было
   видно ритм: за неделю прошлый вайп недельного сервера почти всегда
   оказывался на несколько часов левее края графика (2026-09-29). Подпись обязательна: без названия сервера
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

    const pull = () =>
      searchServers({ filter: 'all', sort: 'wipe_fresh', calendar: 'today', limit: 20, offset: 0 })
        .then((r) => {
          // Именно свежий вайп: блок обещает показать, как выглядит вайп
          // в данных, значит вайп должен быть виден в выбранном окне.
          // Из подходящих берём самый крупный — на сервере с полутора
          // тысячами игроков кривая читается, а на сервере с двадцатью
          // это шум, по которому ничего не докажешь.
          const fresh = (r.servers ?? []).filter((x) => {
            const h = wipeAgeHours(x.wipe_label)
            return h != null && h < 36
          })
          // Свой цикл по наблюдению — в приоритете: такой пример показывает
          // не один вайп, а расписание. Цикл из названия не считаем — это
          // слова админа, а блок про наблюдение.
          const byMax = (a: ServerListItem, b: ServerListItem) => (b.max ?? 0) - (a.max ?? 0)
          const withCycle = fresh.filter((x) => x.cycle != null && x.cycle_source !== 'name')
          const s = (withCycle.length ? withCycle : fresh).sort(byMax)[0]
          if (!alive || !s) {
            if (alive) setDead(true)
            return
          }
          setServer(s)
          setDead(false)
          return getHistory(s.id, s.cycle != null && s.cycle_source !== 'name' ? 'month' : '7d').then((h) => {
            if (!alive) return
            if (!h.points?.length) setDead(true)
            else setHistory(h)
          })
        })
        .catch(() => alive && setDead(true))

    pull()
    // Кривая должна жить вместе с сервером, а не застывать на момент
    // загрузки страницы: перечитываем раз в минуту.
    const t = setInterval(pull, 60_000)
    return () => {
      alive = false
      clearInterval(t)
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
        <div className="shrink-0 text-right">
          <div className="num text-[12px] text-ink-2">
            {thousands(server.online)} <span className="text-ink-3">/ {thousands(server.max)}</span>
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10.5px] text-ink-3">
            <span className="live-dot block size-1.5 bg-good" />
            живьём
          </div>
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
            Зелёные рубцы — подтверждённые вайпы. Последний был{' '}
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
