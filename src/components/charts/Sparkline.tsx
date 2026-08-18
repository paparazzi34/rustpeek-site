/* Спарклайн в строке списка — форма кривой, а не значения.
   Никаких осей и подписей: значения живут в соседних колонках. */

export function Sparkline({
  values,
  width = 72,
  height = 22,
  tone = 'muted',
}: {
  /** null = в бакете нет данных (database.get_sparkline_batch) — точка
      пропускается, а не рисуется как «0 онлайна», это разные утверждения */
  values: (number | null)[]
  width?: number
  height?: number
  tone?: 'muted' | 'rust'
}) {
  const known = values
    ?.map((v, i) => (v == null ? null : { i, v }))
    .filter((p): p is { i: number; v: number } => p != null)

  if (!known || known.length < 2) {
    return <span className="inline-block" style={{ width, height }} />
  }
  const max = Math.max(1, ...known.map((p) => p.v))
  const stepX = width / (values.length - 1)
  const pts = known
    .map((p) => `${(p.i * stepX).toFixed(1)},${(height - (p.v / max) * (height - 3) - 1.5).toFixed(1)}`)
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={tone === 'rust' ? 'var(--color-rust)' : 'var(--color-ink-3)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={tone === 'rust' ? 1 : 0.8}
      />
    </svg>
  )
}
