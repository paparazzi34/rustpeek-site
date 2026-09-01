import { useEffect, useState } from 'react'
import { getStats } from '../lib/api'
import { pad2, thousands } from '../lib/format'

/* ПОЛОСА СТАНЦИИ — тонкая строка над всем сайтом.

   Она заменяет собой блок из четырёх крупных чисел с подписями: тот блок
   всегда выглядит как реклама («2 млн замеров!»), а эта строка выглядит
   как показания прибора. Числа те же, но читаются как факт, а не как
   обещание. И она есть на каждой странице — инструмент всегда показывает
   собственное состояние, это и отличает мониторинг от лендинга.

   Фолбэки не выдуманы: это последние известные значения, а не нули. */

const FALLBACK = { servers_total: 2479, servers_tracked: 1098, wipes: 9676, online_measurements: 1_980_611 }

export function StationBar() {
  const [stats, setStats] = useState(FALLBACK)
  const [live, setLive] = useState(false)
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    let alive = true
    getStats().then((s) => {
      if (!alive || !s) return
      setStats({ ...FALLBACK, ...s })
      setLive(true)
    })
    const t = setInterval(() => setClock(new Date()), 30_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  return (
    <div className="border-b border-rule bg-panel">
      <div className="bleed flex h-[26px] items-center gap-x-5 gap-y-0 overflow-x-auto whitespace-nowrap text-[11px] text-ink-3">
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="live-dot block size-1.5 bg-good" />
          <span className="stencil text-[10px] text-ink-2">станция работает</span>
        </span>
        <Cell label="серверов в базе" value={thousands(stats.servers_total)} />
        <Cell label="под наблюдением" value={thousands(stats.servers_tracked)} />
        <Cell label="замеров онлайна" value={thousands(stats.online_measurements)} />
        <Cell label="вайпов подтверждено" value={thousands(stats.wipes)} />
        <span className="num ml-auto hidden shrink-0 pl-4 text-ink-3 sm:inline">
          {pad2(clock.getHours())}:{pad2(clock.getMinutes())}
          {!live && <span className="ml-2 text-ink-3 opacity-60">· счётчики за прошлую сверку</span>}
        </span>
      </div>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      <span className="num text-[11.5px] text-ink">{value}</span>
      <span className="text-ink-3">{label}</span>
    </span>
  )
}
