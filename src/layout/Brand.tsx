import { Link } from 'react-router-dom'

/* Знак. Квадратная засечка вместо круглой точки: круг читается как
   «онлайн-индикатор из шаблона», засечка — как метка на шкале, то есть
   ровно то, что продукт и делает. */

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="RustPeek, на главную">
      <span className="live-dot block size-[7px] bg-rust" />
      <span className="stencil text-[15px] leading-none font-semibold tracking-[0.1em] text-ink">
        RUST<span className="text-rust-hot">PEEK</span>
      </span>
      {!compact && (
        <span className="hidden text-[11px] text-ink-3 lg:inline">мониторинг с памятью</span>
      )}
    </Link>
  )
}
