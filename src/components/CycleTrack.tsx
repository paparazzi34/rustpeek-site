import { cx } from './ui'

/* =====================================================================
   ТРЕК ФАЗЫ ЦИКЛА — главный элемент продукта.

   Один глиф отвечает на вопрос, ради которого сюда пришли: «на каком
   этапе жизни сервер прямо сейчас». Слева — засечка подтверждённого
   вайпа, справа — засечка прогноза, между ними ползунок «сейчас».

        вайп                     сейчас            следующий
         ▌━━━━━━━━━━━━━━━━━━━━━━━━━●· · · · · · · · · · ·▐

   Когда цикл не определён, правой засечки НЕТ, а пунктир растворяется
   в пустоту: обещания, которого продукт дать не может, нет и на рисунке.
   Это не украшение, а тот самый принцип честности, только глазами.

        вайп                     сейчас
         ▌━━━━━━━━━━━━━━━━━━━━━━━━━●·  ·   ·

   Сделан на div-ах, а не на SVG: SVG во всю ширину пришлось бы тянуть
   через preserveAspectRatio="none", и тогда круглая точка «сейчас»
   превращается в овал. Прямоугольники с процентами такой болезни не имеют.
   ===================================================================== */

export type CyclePhase = {
  /** часов прошло с подтверждённого вайпа */
  sinceHours: number | null
  /** часов до прогноза; null — цикл не определён */
  untilHours: number | null
}

export function CycleTrack({
  sinceHours,
  untilHours,
  height = 18,
  marks,
  className,
}: CyclePhase & {
  height?: number
  /** доли 0..1 — прошлые подтверждённые вайпы (крупный трек) */
  marks?: number[]
  className?: string
}) {
  const known = untilHours != null && sinceHours != null
  const total = known ? Math.max(1, sinceHours! + untilHours!) : null

  // Цикл известен — честная доля. Не известен — ползунок на 62%, дальше
  // пунктир уходит в никуда: позиция читается как «мы где-то тут»,
  // а не как измеренная величина.
  const now = known ? Math.min(0.94, Math.max(0.05, sinceHours! / total!)) : 0.62

  const fresh = sinceHours != null && sinceHours < 24
  const soon = untilHours != null && untilHours <= 24

  const passed = fresh ? 'var(--color-good)' : 'var(--color-rust)'
  const ahead = soon ? 'var(--color-warn)' : 'var(--color-ink-3)'

  return (
    <span
      className={cx('relative block w-full', className)}
      style={{ height }}
      role="img"
      aria-label={
        known
          ? 'Фаза цикла: вайп позади, следующий впереди'
          : 'Фаза цикла: следующий вайп не определён'
      }
    >
      {/* пройденная часть */}
      <span
        className="absolute top-1/2 left-0 block h-[1.5px] -translate-y-1/2"
        style={{ width: `${now * 100}%`, background: passed, opacity: fresh ? 0.95 : 0.65 }}
      />

      {/* оставшаяся часть — пунктир; без прогноза он гаснет */}
      <span
        className="absolute top-1/2 right-0 block h-[1.5px] -translate-y-1/2"
        style={{
          left: `${now * 100}%`,
          backgroundImage: `repeating-linear-gradient(90deg, ${ahead} 0 2px, transparent 2px 5px)`,
          opacity: known ? 0.85 : 0.7,
          ...(known
            ? null
            : {
                maskImage: 'linear-gradient(90deg, #000 0%, transparent 92%)',
                WebkitMaskImage: 'linear-gradient(90deg, #000 0%, transparent 92%)',
              }),
        }}
      />

      {/* прошлые подтверждённые вайпы */}
      {marks?.map((m, i) => (
        <span
          key={i}
          className="absolute top-1/2 block w-px -translate-y-1/2"
          style={{
            left: `${m * 100}%`,
            height: height * 0.45,
            background: 'var(--color-good)',
            opacity: 0.5,
          }}
        />
      ))}

      {/* засечка вайпа */}
      <span
        className="absolute top-1/2 left-0 block w-[2px] -translate-y-1/2"
        style={{
          height: height * 0.7,
          background: fresh ? 'var(--color-good)' : 'var(--color-ink-2)',
        }}
      />

      {/* засечка прогноза — только если прогноз есть */}
      {known && (
        <span
          className="absolute top-1/2 right-0 block w-[2px] -translate-y-1/2"
          style={{
            height: height * 0.7,
            background: soon ? 'var(--color-warn)' : 'var(--color-ink-3)',
          }}
        />
      )}

      {/* «сейчас» */}
      <span
        className="absolute top-1/2 block rounded-full"
        style={{
          left: `${now * 100}%`,
          width: 7,
          height: 7,
          transform: 'translate(-50%, -50%)',
          background: 'var(--color-void)',
          border: `1.5px solid ${fresh ? 'var(--color-good)' : 'var(--color-rust-hot)'}`,
        }}
      />
    </span>
  )
}

/* Крупный трек для страницы сервера: тот же глиф, но с подписями по краям.
   Подписи — часть рисунка, а не легенда сбоку: читать надо в одном месте. */

export function CycleTrackLarge({
  sinceHours,
  untilHours,
  wipedAt,
  nextAt,
  marks,
}: CyclePhase & {
  wipedAt: string
  nextAt: string
  marks?: number[]
}) {
  const known = untilHours != null
  const fresh = sinceHours != null && sinceHours < 24
  const soon = untilHours != null && untilHours <= 24
  const now = known && sinceHours != null
    ? Math.min(0.94, Math.max(0.05, sinceHours / Math.max(1, sinceHours + untilHours!)))
    : 0.62

  return (
    <div>
      {/* Подпись «сейчас» едет вместе с ползунком — так видно, что метка
          на шкале и текущий момент это одно и то же. */}
      <div className="relative mb-1.5 h-4">
        <span
          className="num absolute text-[11px] whitespace-nowrap text-ink-2"
          style={{ left: `${now * 100}%`, transform: 'translateX(-50%)' }}
        >
          сейчас
        </span>
      </div>

      <CycleTrack sinceHours={sinceHours} untilHours={untilHours} marks={marks} height={26} />

      <div className="mt-2.5 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow">подтверждённый вайп</div>
          <div className={cx('num mt-1.5 text-[13px]', fresh ? 'text-good' : 'text-ink-2')}>
            {wipedAt}
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow">{known ? 'следующий, по интервалам' : 'следующий'}</div>
          <div
            className={cx(
              'mt-1.5 text-[13px]',
              known ? (soon ? 'num text-warn' : 'num text-ink-2') : 'text-ink-3 italic',
            )}
          >
            {known ? nextAt : 'цикл не определён'}
          </div>
        </div>
      </div>
    </div>
  )
}
