import { useMemo, useState } from 'react'
import type { HistoryPoint, HistoryWipe } from '../../lib/types'
import { pad2, parseSqlDateTime, thousands } from '../../lib/format'
import { useMeasure } from './useMeasure'

/* График онлайна. Не «красивая площадь с градиентом», а лента самописца:
   тонкая линия, редкая сетка, и вертикальные рубцы там, где подтверждён вайп.
   Рубец подписан номером — тем же, что в таблице истории ниже, чтобы взгляд
   переходил с графика в таблицу без пересчёта в уме. */

const PAD = { top: 14, right: 8, bottom: 22, left: 44 }

export function OnlineChart({
  points,
  wipes,
  height = 300,
  granularity,
  wipeNumbers,
}: {
  points: HistoryPoint[]
  wipes?: HistoryWipe[]
  height?: number
  granularity?: string
  /** сквозной номер вайпа по wipe_time — тот же, что в таблице истории */
  wipeNumbers?: Map<string, number>
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const data = useMemo(() => {
    const rows = points
      .map((p) => ({ t: parseSqlDateTime(p.ts), v: p.avg ?? p.max ?? 0 }))
      .filter((r): r is { t: Date; v: number } => r.t != null)
    if (rows.length < 2) return null

    const t0 = rows[0].t.getTime()
    const t1 = rows[rows.length - 1].t.getTime()
    const span = Math.max(1, t1 - t0)
    // Шкала не ниже 20 игроков (2026-10-02): у пустого сервера колебания
    // 0–4 растягивались на всю высоту и выглядели как живой онлайн.
    const vmax = Math.max(20, ...rows.map((r) => r.v))

    // Шкала Y: круглый шаг, не более пяти линий — сетка должна помогать,
    // а не рисоваться поверх данных.
    const step = niceStep(vmax / 4)
    const top = Math.ceil(vmax / step) * step
    const ticks: number[] = []
    for (let v = 0; v <= top + 1e-6; v += step) ticks.push(v)

    return { rows, t0, span, top, ticks }
  }, [points])

  if (!data) {
    return (
      <div ref={ref} className="flex items-center py-10 text-[14.5px] text-ink-3">
        Нет свежих данных за этот период.
      </div>
    )
  }

  const w = Math.max(320, width || 900)
  const iw = w - PAD.left - PAD.right
  const ih = height - PAD.top - PAD.bottom

  const x = (t: number) => PAD.left + ((t - data.t0) / data.span) * iw
  const y = (v: number) => PAD.top + ih - (v / data.top) * ih

  // Дыры в данных не замазываем (2026-10-07): с 03.10 по 06.10 мониторинг
  // молчал, а линия шла через трое суток прямой, как будто онлайн плавно
  // падал. Разрыв больше GAP_MS — новый отрезок, площадь под ним — своя.
  const GAP_MS = (granularity === 'hourly' ? 8 : 72) * 3_600_000
  const segments: Array<typeof data.rows> = []
  data.rows.forEach((r, i) => {
    const prev = data.rows[i - 1]
    if (!prev || r.t.getTime() - prev.t.getTime() > GAP_MS) segments.push([r])
    else segments[segments.length - 1].push(r)
  })
  const seg = (rows: typeof data.rows) =>
    rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.t.getTime()).toFixed(1)} ${y(r.v).toFixed(1)}`).join(' ')
  const path = segments.map(seg).join(' ')
  const area = segments
    .map(
      (rows) =>
        `${seg(rows)} L${x(rows[rows.length - 1].t.getTime()).toFixed(1)} ${PAD.top + ih} L${x(rows[0].t.getTime()).toFixed(1)} ${PAD.top + ih} Z`,
    )
    .join(' ')

  const wipeMarks = (wipes ?? [])
    .map((w2) => ({ d: parseSqlDateTime(w2.wipe_time), key: w2.wipe_time }))
    .filter((m): m is { d: Date; key: string } => m.d != null)
    .filter((m) => m.d.getTime() >= data.t0 && m.d.getTime() <= data.t0 + data.span)
    .sort((a, b) => b.d.getTime() - a.d.getTime())

  const xTicks = pickXTicks(data.rows.map((r) => r.t), iw)
  const hovered = hover != null ? data.rows[hover] : null

  return (
    <div ref={ref} className="relative select-none">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        role="img"
        aria-label="Онлайн по времени с отметками подтверждённых вайпов"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - box.left) / box.width) * w
          const ratio = (px - PAD.left) / iw
          const idx = Math.round(ratio * (data.rows.length - 1))
          setHover(idx >= 0 && idx < data.rows.length ? idx : null)
        }}
      >
        {/* сетка */}
        {data.ticks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={w - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-rule)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 3.5}
              textAnchor="end"
              className="num"
              fontSize="11.5"
              fill="var(--color-ink-3)"
            >
              {v >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + 'k' : v}
            </text>
          </g>
        ))}

        {/* подписи времени */}
        {xTicks.map((d) => (
          <text
            key={d.getTime()}
            x={x(d.getTime())}
            y={height - 7}
            textAnchor="middle"
            className="num"
            fontSize="11.5"
            fill="var(--color-ink-3)"
          >
            {/* окно короче двух суток — подписываем часы, иначе все
                подписи одинаковые «06.10» */}
            {data.span < 48 * 3_600_000
              ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
              : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`}
          </text>
        ))}

        <defs>
          <linearGradient id="rp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-rust)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-rust)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rp-area)" />
        <path
          d={path}
          fill="none"
          stroke="var(--color-rust)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="draw"
          style={{ ['--len' as string]: '6000' }}
        />

        {/* рубцы вайпов: линия во всю высоту + номер у основания */}
        {wipeMarks.map(({ d, key }, i) => {
          const px = x(d.getTime())
          const n = wipeNumbers?.get(key) ?? wipeMarks.length - i
          return (
            <g key={d.getTime()}>
              <line
                x1={px}
                x2={px}
                y1={PAD.top}
                y2={PAD.top + ih}
                stroke="var(--color-good)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <rect x={px - 7} y={PAD.top + ih - 13} width="14" height="13" fill="var(--color-good-dim)" />
              <text
                x={px}
                y={PAD.top + ih - 3.5}
                textAnchor="middle"
                className="num"
                fontSize="11"
                fill="var(--color-good)"
              >
                {n}
              </text>
            </g>
          )
        })}

        {hovered && (
          <>
            <line
              x1={x(hovered.t.getTime())}
              x2={x(hovered.t.getTime())}
              y1={PAD.top}
              y2={PAD.top + ih}
              stroke="var(--color-rule-2)"
              strokeWidth="1"
            />
            <circle
              cx={x(hovered.t.getTime())}
              cy={y(hovered.v)}
              r="3"
              fill="var(--color-void)"
              stroke="var(--color-rust-hot)"
              strokeWidth="1.6"
            />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-0 border border-rule-2 bg-panel px-2.5 py-1.5"
          style={{
            left: `clamp(0px, ${(x(hovered.t.getTime()) / w) * 100}% - 60px, calc(100% - 122px))`,
          }}
        >
          <div className="num text-[15px] font-medium text-ink">{thousands(hovered.v)}</div>
          <div className="num mt-0.5 text-[12px] text-ink-3">
            {pad2(hovered.t.getDate())}.{pad2(hovered.t.getMonth() + 1)}{' '}
            {pad2(hovered.t.getHours())}:{pad2(hovered.t.getMinutes())}
          </div>
        </div>
      )}
    </div>
  )
}

function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(1, raw))))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/** Подписи оси X — равномерно по времени, а не по номеру точки (2026-10-07):
    при дыре в данных подписи по индексу слипались в одну строку. Сколько
    подписей — решает ширина: не чаще одной на 100 px. */
function pickXTicks(dates: Date[], width: number) {
  if (dates.length < 2) return []
  const t0 = dates[0].getTime()
  const t1 = dates[dates.length - 1].getTime()
  const want = Math.min(7, Math.max(2, Math.floor(width / 100)))
  const out: Date[] = []
  for (let i = 1; i <= want; i++) out.push(new Date(t0 + ((t1 - t0) * i) / (want + 1)))
  return out
}
