/* ПОДПИСЬ ВАЙПА — герой главной страницы.

   Не абстрактная «красивая волна», а ровно та форма, по которой RustPeek
   принимает решение: суточные пики, затем обвал в ноль, затем резкий рост.
   Кривая построена детерминированной функцией — при каждой загрузке она
   одна и та же, потому что это утверждение о методе, а не декорация.

   Три момента подписаны прямо на кривой. Если объяснять метод словами
   рядом с картинкой, читать придётся дважды. */

const W = 1000
const H = 240

function curve() {
  const pts: Array<[number, number]> = []
  const N = 320
  // Вайп на 46% ленты: слева достаточно, чтобы увидеть ритм суток,
  // справа — чтобы увидеть, что рост не разовый всплеск.
  const wipeAt = 0.46
  for (let i = 0; i <= N; i++) {
    const p = i / N
    const day = 0.5 + 0.5 * Math.sin(p * Math.PI * 2 * 7 - Math.PI / 2)
    let level: number
    if (p < wipeAt - 0.035) {
      // жизнь до вайпа: суточная волна, медленно оседающая
      level = (0.42 + 0.34 * day) * (1 - (p / wipeAt) * 0.3)
    } else if (p < wipeAt) {
      // обвал: карта стёрлась, всех выкинуло
      const k = (p - (wipeAt - 0.035)) / 0.035
      level = (0.42 + 0.34 * day) * 0.7 * (1 - k) * (1 - k)
    } else if (p < wipeAt + 0.05) {
      // рестарт: пусто
      level = 0.015
    } else {
      // возвращение: резкий рост и снова суточная волна, но выше
      const k = Math.min(1, (p - wipeAt - 0.05) / 0.09)
      level = (0.2 + 0.72 * k) * (0.55 + 0.45 * day)
    }
    pts.push([p * W, H - Math.max(2, level * (H - 24)) - 10])
  }
  return pts
}

const PTS = curve()
const PATH = PTS.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
const WIPE_X = 0.46 * W

export function Signature() {
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-[200px] w-full sm:h-[240px]"
        preserveAspectRatio="none"
        role="img"
        aria-label="Кривая онлайна сервера: суточные пики, обвал до нуля в момент вайпа, затем резкий рост"
      >
        <defs>
          <linearGradient id="rp-sig" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-rust)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--color-rust)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* базовая линия — ноль игроков */}
        <line x1="0" x2={W} y1={H - 10} y2={H - 10} stroke="var(--color-rule)" strokeWidth="1" />

        <path d={`${PATH} L${W} ${H - 10} L0 ${H - 10} Z`} fill="url(#rp-sig)" />
        <path
          d={PATH}
          fill="none"
          stroke="var(--color-rust)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="draw"
          style={{ ['--len' as string]: '4200' }}
        />

        {/* момент вайпа */}
        <line
          x1={WIPE_X}
          x2={WIPE_X}
          y1="0"
          y2={H - 10}
          stroke="var(--color-good)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      </svg>

      {/* Подписи — обычным шрифтом, позиции привязаны к тем же долям ленты */}
      <figcaption className="relative mt-2 h-9 text-[11.5px] text-ink-3">
        <span className="absolute left-[10%] -translate-x-1/2 text-center leading-tight">
          пик
          <br />
          <span className="text-ink-2">сервер жил</span>
        </span>
        <span className="absolute left-[46%] -translate-x-1/2 text-center leading-tight">
          <span className="text-good">провал до нуля</span>
          <br />
          <span className="text-ink-2">карта стёрлась</span>
        </span>
        <span className="absolute left-[78%] -translate-x-1/2 text-center leading-tight">
          рост
          <br />
          <span className="text-ink-2">все зашли заново</span>
        </span>
      </figcaption>
    </figure>
  )
}

/* Компактная версия подписи — в строке списка серверов.
   Форма, а не значения: цифры живут в соседних колонках. */
export function Sparkline({
  values,
  width = 64,
  height = 20,
  active,
}: {
  /** Живой API кладёт сюда null там, где замера не было — это нормальный
      случай, а не сбой, и он не должен ломать арифметику. */
  values: (number | null)[] | null | undefined
  width?: number
  height?: number
  active?: boolean
}) {
  const points = (values ?? []).filter((v): v is number => typeof v === 'number' && isFinite(v))
  if (points.length < 2) {
    return <span className="inline-block" style={{ width, height }} />
  }
  const max = Math.max(1, ...points)
  const stepX = width / (points.length - 1)
  const d = points
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${(i * stepX).toFixed(1)} ${(height - (v / max) * (height - 3) - 1.5).toFixed(1)}`,
    )
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={active ? 'var(--color-rust)' : 'var(--color-ink-3)'}
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity={active ? 1 : 0.75}
      />
    </svg>
  )
}
