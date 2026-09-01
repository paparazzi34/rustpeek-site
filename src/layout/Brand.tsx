import { Link } from 'react-router-dom'

/* Знак. Квадратная засечка вместо круглой точки: круг читается как
   «онлайн-индикатор из шаблона», засечка — как метка на шкале.
   Никакого слогана рядом: название должно стоять само. */

export function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="RustPeek, на главную">
      <span className="live-dot block size-[7px] bg-rust" />
      <span className="stencil text-[16px] leading-none font-semibold tracking-[0.11em] text-ink">
        RUST<span className="text-rust-hot">PEEK</span>
      </span>
    </Link>
  )
}
