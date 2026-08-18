import { useMemo, useState } from 'react'
import type { HistoryPoint } from '../../lib/types'
import { parseSqlDateTime, pad2, WEEKDAYS_SHORT, thousands } from '../../lib/format'
import { useMeasure } from './useMeasure'
import { cx } from '../ui'

/* График онлайна — одна серия, поэтому легенда не нужна: заголовок карточки
   уже говорит, что нарисовано. Что здесь сделано осознанно:
   · сетка — сплошные волосяные линии на один шаг от поверхности, не пунктир;
   · заливка — та же ржавая, 10% непрозрачности, а не жирный блок;
   · подписано только последнее значение, а не каждая точка;
   · вайпы — отдельный слой аннотаций с номерами, совпадающими с таблицей ниже;
   · при перезагрузке данных старый кадр держится приглушённым, без скачка;
   · есть таблица-двойник: значения доступны без наведения мышью. */

export interface WipeMarker {
  ts: string
  number: number
}

const H = 268
const PAD_T = 14
const PAD_B = 46
const PAD_L = 46
const PAD_R = 14

export function OnlineChart({
  points,
  wipes = [],
  granularity = 'hourly',
  loading = false,
  emptyText = 'За этот период данных пока мало.',
}: {
  points: HistoryPoint[]
  wipes?: WipeMarker[]
  granularity?: string
  loading?: boolean
  emptyText?: string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const W = Math.max(320, width || 720)
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const model = useMemo(() => {
    const vals = points.map((p) => (p.avg != null ? p.avg : p.max != null ? p.max : 0))
    const maxV = Math.max(1, ...vals)
    // Верх шкалы — «круглое» число над максимумом, чтобы подписи оси читались
    const step = niceStep(maxV / 4)
    const top = Math.ceil(maxV / step) * step
    const n = vals.length
    const stepX = n > 1 ? innerW / (n - 1) : 0
    const xAt = (i: number) => PAD_L + i * stepX
    const yAt = (v: number) => PAD_T + innerH - (v / top) * innerH
    return { vals, maxV, top, step, n, xAt, yAt }
  }, [points, innerW, innerH])

  if (!loading && (!points || points.length === 0)) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[13px] text-ink-3">
        {emptyText}
      </div>
    )
  }

  const { vals, top, step, n, xAt, yAt } = model
  const linePts = vals.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')
  const areaPts = `${xAt(0).toFixed(1)},${PAD_T + innerH} ${linePts} ${xAt(n - 1).toFixed(1)},${PAD_T + innerH}`

  const yTicks: number[] = []
  for (let v = 0; v <= top + 0.001; v += step) yTicks.push(v)

  const xTickIdx = pickXTicks(n, W)
  const hoverIdx = hover != null ? clamp(hover, 0, n - 1) : null
  const lastIdx = n - 1

  const wipeMarks = wipes
    .map((w) => ({ ...w, i: nearestIndex(points, w.ts) }))
    .filter((w) => w.i != null) as Array<WipeMarker & { i: number }>

  const label = (i: number) => {
    const d = parseSqlDateTime(points[i]?.ts)
    if (!d) return points[i]?.ts ?? ''
    const wd = WEEKDAYS_SHORT[d.getDay()]
    return granularity === 'daily'
      ? `${wd}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
      : `${wd}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:00`
  }

  return (
    <div>
      <div ref={ref} className={cx('relative select-none', loading && 'opacity-45 transition-opacity')}>
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="История онлайна сервера"
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="rp-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-rust)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-rust)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* сетка + ось Y */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="var(--color-line)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <text
                x={PAD_L - 8}
                y={yAt(v) + 3.5}
                textAnchor="end"
                className="tnum fill-[var(--color-ink-3)] text-[10.5px]"
              >
                {thousands(v)}
              </text>
            </g>
          ))}

          {/* ось X */}
          {xTickIdx.map((i) => {
            const d = parseSqlDateTime(points[i]?.ts)
            const text = !d
              ? ''
              : granularity === 'daily'
                ? `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
                : `${pad2(d.getHours())}:00`
            const sub =
              granularity === 'daily' || d == null
                ? null
                : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
            return (
              <g key={i}>
                <text
                  x={xAt(i)}
                  y={PAD_T + innerH + 16}
                  textAnchor="middle"
                  className="tnum fill-[var(--color-ink-3)] text-[10.5px]"
                >
                  {text}
                </text>
                {sub && (
                  <text
                    x={xAt(i)}
                    y={PAD_T + innerH + 28}
                    textAnchor="middle"
                    className="tnum fill-[var(--color-ink-3)]/60 text-[9.5px]"
                  >
                    {sub}
                  </text>
                )}
              </g>
            )
          })}

          {/* данные */}
          <polygon points={areaPts} fill="url(#rp-area)" />
          <polyline
            points={linePts}
            fill="none"
            stroke="var(--color-rust)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* аннотации вайпов */}
          {wipeMarks.map((w) => (
            <g key={`${w.ts}-${w.number}`}>
              <line
                x1={xAt(w.i)}
                x2={xAt(w.i)}
                y1={PAD_T}
                y2={PAD_T + innerH}
                stroke="var(--color-good)"
                strokeWidth="1"
                strokeOpacity="0.45"
                shapeRendering="crispEdges"
              />
              <g transform={`translate(${xAt(w.i)}, ${PAD_T + innerH})`}>
                <path d="M0,-1 L5,8 L-5,8 Z" fill="var(--color-good)" />
                {w.number > 0 && (
                  <text
                    y="18"
                    textAnchor="middle"
                    className="tnum fill-[var(--color-good)] text-[9.5px] font-semibold"
                  >
                    {w.number}
                  </text>
                )}
              </g>
            </g>
          ))}

          {/* последнее значение подписано прямо на графике — чтобы главное
              число читалось без наведения */}
          {n > 1 && (
            <g>
              <circle
                cx={xAt(lastIdx)}
                cy={yAt(vals[lastIdx])}
                r="4"
                fill="var(--color-rust)"
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
              <text
                x={xAt(lastIdx) - 8}
                y={Math.max(PAD_T + 10, yAt(vals[lastIdx]) - 9)}
                textAnchor="end"
                className="tnum fill-[var(--color-ink)] text-[11px] font-semibold"
              >
                {thousands(vals[lastIdx])}
              </text>
            </g>
          )}

          {/* перекрестье */}
          {hoverIdx != null && (
            <g>
              <line
                x1={xAt(hoverIdx)}
                x2={xAt(hoverIdx)}
                y1={PAD_T}
                y2={PAD_T + innerH}
                stroke="var(--color-line-strong)"
                strokeWidth="1"
                shapeRendering="crispEdges"
              />
              <circle
                cx={xAt(hoverIdx)}
                cy={yAt(vals[hoverIdx])}
                r="4.5"
                fill="var(--color-rust-hot)"
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            </g>
          )}

          {/* зона наведения на всю площадь: целиться в 2px-линию не нужно */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={(e) => {
              const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
              const rel = ((e.clientX - box.left) / box.width) * W
              const i = Math.round((rel - PAD_L) / (innerW / Math.max(1, n - 1)))
              setHover(clamp(i, 0, n - 1))
            }}
          />
        </svg>

        {hoverIdx != null && (
          <Tooltip
            x={(xAt(hoverIdx) / W) * 100}
            value={vals[hoverIdx]}
            label={label(hoverIdx)}
            wipe={wipeMarks.find((w) => w.i === hoverIdx)?.number}
          />
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="9" viewBox="-5 -1 10 9" aria-hidden>
            <path d="M0,-1 L5,8 L-5,8 Z" fill="var(--color-good)" />
          </svg>
          подтверждённый вайп — номер совпадает с таблицей ниже
        </span>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-ink-3 underline decoration-dotted underline-offset-2 transition-colors hover:text-ink-2"
        >
          {showTable ? 'скрыть таблицу' : 'показать таблицей'}
        </button>
      </div>

      {showTable && (
        <div className="mt-2 max-h-64 overflow-auto rounded-[5px] border border-line">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 bg-surface-2 text-ink-3">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">Время</th>
                <th className="px-3 py-1.5 text-right font-medium">Онлайн (сред.)</th>
                <th className="px-3 py-1.5 text-right font-medium">Пик</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {points.map((p, i) => (
                <tr key={p.ts + i} className="border-t border-line/60">
                  <td className="px-3 py-1 text-ink-2">{label(i)}</td>
                  <td className="px-3 py-1 text-right text-ink">{thousands(p.avg ?? 0)}</td>
                  <td className="px-3 py-1 text-right text-ink-3">{thousands(p.max ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Tooltip({
  x,
  value,
  label,
  wipe,
}: {
  x: number
  value: number
  label: string
  wipe?: number
}) {
  const flip = x > 62
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[132px] rounded-[5px] border border-line-strong bg-surface-2/95 px-2.5 py-2 shadow-lg backdrop-blur-sm"
      style={{ left: `${x}%`, transform: `translateX(${flip ? '-108%' : '8px'})` }}
    >
      <div className="flex items-baseline gap-2">
        <span className="h-0.5 w-3 shrink-0 rounded bg-rust" />
        <span className="tnum text-[15px] leading-none font-semibold text-ink">
          {thousands(value)}
        </span>
        <span className="text-[11px] text-ink-3">онлайн</span>
      </div>
      <div className="mt-1 text-[11px] text-ink-3">{label}</div>
      {wipe != null && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-good">
          <svg width="9" height="8" viewBox="-5 -1 10 9" aria-hidden>
            <path d="M0,-1 L5,8 L-5,8 Z" fill="var(--color-good)" />
          </svg>
          вайп №{wipe}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ утилиты */

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function niceStep(raw: number) {
  if (raw <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return nice * mag
}

function pickXTicks(n: number, width: number) {
  if (n <= 1) return [0]
  const maxTicks = Math.max(3, Math.floor(width / 96))
  const stride = Math.max(1, Math.ceil(n / maxTicks))
  const out: number[] = []
  for (let i = 0; i < n; i += stride) out.push(i)
  if (out[out.length - 1] !== n - 1) out.push(n - 1)
  return out
}

function nearestIndex(points: HistoryPoint[], ts: string) {
  const target = parseSqlDateTime(ts)
  if (!target) return null
  let best: number | null = null
  let bestDiff = Infinity
  points.forEach((p, i) => {
    const d = parseSqlDateTime(p.ts)
    if (!d) return
    const diff = Math.abs(d.getTime() - target.getTime())
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  return best
}
