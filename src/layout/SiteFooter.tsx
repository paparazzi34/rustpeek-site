import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule">
      <div className="bleed flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 py-6">
        <div>
          <div className="stencil text-[13px] tracking-[0.1em] text-ink-2">RUSTPEEK</div>
          <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-ink-3">
            BattleMetrics показывает, что на сервере сейчас. RustPeek помнит, что там было —
            и поэтому знает, когда будет следующий вайп.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] text-ink-3">
          <Link to="/servers" className="transition-colors hover:text-ink">
            Серверы
          </Link>
          <Link to="/players" className="transition-colors hover:text-ink">
            Игроки
          </Link>
          <a
            href="https://t.me/RustPeek_Bot"
            target="_blank"
            rel="noopener"
            className="transition-colors hover:text-ink"
          >
            @RustPeek_Bot
          </a>
          <span className="num text-ink-3">© 2026</span>
        </nav>
      </div>
    </footer>
  )
}
