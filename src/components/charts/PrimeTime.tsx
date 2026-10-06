import { useState } from 'react'
import { pad2, thousands } from '../../lib/format'
import { cx } from '../ui'

/* Прайм-тайм: 24 колонки, одна величина — средний онлайн по часу.
   Высота несёт значение, ржавый — только пиковый час. Остальные колонки
   в одном приглушённом тоне: если раскрасить все, глазу не за что зацепиться. */

export function PrimeTime({
  hours: utcHours,
  peakHour: utcPeak,
}: {
  hours: (number | null)[]
  peakHour?: number | null
}) {
  const [hover, setHover] = useState<number | null>(null)
  // Бэкенд считает часы в UTC (2026-10-07) — сдвигаем на пояс человека,
  // иначе в Москве «пик в 19:00» на деле был в 22:00.
  const shift = Math.round(-new Date().getTimezoneOffset() / 60)
  const hours = Array.from({ length: 24 }, (_, h) => utcHours[(((h - shift) % 24) + 24) % 24] ?? null)
  const peakHour = utcPeak == null ? null : (((utcPeak + shift) % 24) + 24) % 24
  const values = hours.filter((v): v is number => v != null)
  if (!values.length) {
    return <p className="py-8 text-[13px] text-ink-3">Нет свежих данных по часам.</p>
  }
  const max = Math.max(...values)
  const active = hover ?? peakHour ?? null

  return (
    <div>
      <div className="flex h-[104px] items-end gap-px">
        {hours.map((v, h) => {
          const pct = v != null && max > 0 ? Math.max(3, (v / max) * 100) : 0
          const on = active === h
          return (
            <button
              key={h}
              onMouseEnter={() => setHover(h)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(h)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full flex-1 items-end"
              aria-label={
                v != null ? `${pad2(h)}:00 — ${Math.round(v)} онлайн в среднем` : `${pad2(h)}:00 — нет данных`
              }
            >
              <span
                className={cx(
                  'block w-full transition-colors duration-150',
                  on ? 'bg-rust' : 'bg-rule-2 group-hover:bg-ink-3',
                )}
                style={{ height: `${pct}%` }}
              />
            </button>
          )
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-between border-t border-rule pt-1.5">
        <div className="num flex-1 text-[10px] text-ink-3">00</div>
        <div className="num flex-1 text-center text-[10px] text-ink-3">06</div>
        <div className="num flex-1 text-center text-[10px] text-ink-3">12</div>
        <div className="num flex-1 text-center text-[10px] text-ink-3">18</div>
        <div className="num flex-1 text-right text-[10px] text-ink-3">23</div>
      </div>

      <p className="mt-3 text-[13px] text-ink-2">
        {active != null && hours[active] != null ? (
          <>
            В <span className="num text-ink">{pad2(active)}:00</span> на сервере в среднем{' '}
            <span className="num text-ink">{thousands(hours[active])}</span>{' '}
            {active === peakHour && <span className="text-rust-hot">— это пик суток</span>}
          </>
        ) : (
          'Наведи на столбец, чтобы увидеть средний онлайн за час.'
        )}
      </p>
    </div>
  )
}
