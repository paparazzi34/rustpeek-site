import { useState } from 'react'
import { pad2, thousands } from '../../lib/format'
import { cx } from '../ui'

/* Прайм-тайм: 24 колонки, одна величина — средний онлайн по часу.
   Величина кодируется высотой (главное) и одной ржавой шкалой по светлоте
   (вспомогательное), без радуги. Пик подписан прямо, остальное — в подсказке
   и в таблице-двойнике над графиком не нужно: значения есть на наведении
   и в подписи под пиком. */

export function PrimeTime({
  hours,
  peakHour,
}: {
  hours: (number | null)[]
  peakHour?: number | null
}) {
  const [hover, setHover] = useState<number | null>(null)
  const values = hours.filter((v): v is number => v != null)
  if (!values.length) return null
  const max = Math.max(...values)

  return (
    <div>
      <div className="flex h-[92px] items-end gap-[2px]">
        {hours.map((v, h) => {
          const pct = v != null && max > 0 ? Math.max(4, (v / max) * 100) : 0
          const isPeak = peakHour === h
          const on = hover === h
          return (
            <button
              key={h}
              onMouseEnter={() => setHover(h)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(h)}
              onBlur={() => setHover(null)}
              className="group relative flex h-full flex-1 items-end"
              aria-label={
                v != null
                  ? `${pad2(h)}:00 — ${Math.round(v)} онлайн в среднем`
                  : `${pad2(h)}:00 — нет данных`
              }
            >
              {v == null ? (
                <span className="h-[3px] w-full rounded-[2px] bg-line" />
              ) : (
                <span
                  className={cx(
                    'w-full rounded-t-[3px] transition-colors duration-150',
                    isPeak ? 'bg-rust' : on ? 'bg-rust/70' : 'bg-rust/35',
                  )}
                  style={{ height: `${pct}%` }}
                />
              )}
              {on && v != null && (
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-[4px] border border-line-strong bg-surface-2 px-2 py-1 text-center whitespace-nowrap shadow-lg">
                  <span className="tnum block text-[13px] leading-none font-semibold text-ink">
                    {thousands(v)}
                  </span>
                  <span className="tnum mt-0.5 block text-[10.5px] text-ink-3">{pad2(h)}:00</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="tnum mt-1.5 flex justify-between text-[10.5px] text-ink-3">
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{pad2(h)}:00</span>
        ))}
      </div>
    </div>
  )
}
