import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12px] text-ink-3">
        <span>© 2026 RustPeek · память о вайпах, а не снапшот</span>
        <span className="flex flex-wrap items-center gap-4">
          <Link to="/" className="transition-colors hover:text-ink-2">
            О проекте
          </Link>
          <Link to="/servers" className="transition-colors hover:text-ink-2">
            Веб-версия
          </Link>
          <a
            href="https://t.me/RustPeek_Bot"
            target="_blank"
            rel="noopener"
            className="transition-colors hover:text-ink-2"
          >
            @RustPeek_Bot
          </a>
        </span>
      </div>
    </footer>
  )
}
