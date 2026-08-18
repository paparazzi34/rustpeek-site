import { Link, Outlet } from 'react-router-dom'
import { IconTelegram } from '../components/icons'
import { SiteFooter } from './SiteFooter'

/* Оболочка главной. Отдельная от AppShell намеренно: на лендинге не нужны
   вкладки приложения, а в приложении не нужны якорные ссылки лендинга. */

const LINKS = [
  { href: '#method', label: 'как это работает' },
  { href: '#features', label: 'что умею' },
  { href: '#faq', label: 'вопросы' },
]

export function SiteLayout() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="size-2 animate-live rounded-full bg-rust shadow-[0_0_10px_var(--color-rust)]" />
            <span className="text-[15px] font-bold tracking-tight">
              Rust<span className="text-rust-hot">Peek</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-[13px] md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-ink-3 transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/servers"
              className="inline-flex h-8 items-center rounded-[4px] border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              Веб-версия
            </Link>
            <a
              href="https://t.me/RustPeek_Bot"
              target="_blank"
              rel="noopener"
              className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-rust px-3 text-[13px] font-medium text-white transition-colors hover:bg-rust-hot"
            >
              <IconTelegram size={14} />
              <span className="hidden sm:inline">Открыть бота</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
