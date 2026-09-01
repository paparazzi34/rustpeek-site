import { Link, Outlet } from 'react-router-dom'
import { IconTelegram } from '../components/icons'
import { Brand } from './Brand'
import { SiteFooter } from './SiteFooter'
import { StationBar } from './StationBar'

/* Оболочка главной. Отдельная от AppShell намеренно: на лендинге не нужны
   вкладки приложения, а в приложении не нужны якоря лендинга. Полоса
   станции общая — она и есть связка между витриной и инструментом. */

const LINKS = [
  { href: '#method', label: 'как это работает' },
  { href: '#can', label: 'что умею' },
  { href: '#faq', label: 'вопросы' },
]

export function SiteLayout() {
  return (
    <div className="min-h-dvh bg-void">
      <StationBar />

      <header className="sticky top-0 z-40 border-b border-rule bg-void/95 backdrop-blur-sm">
        <div className="bleed flex h-12 items-center gap-6">
          <Brand />
          <nav className="ml-auto hidden items-center gap-5 text-[12.5px] text-ink-3 md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link to="/servers" className="btn h-8">
              Открыть список
            </Link>
            <a
              href="https://t.me/RustPeek_Bot"
              target="_blank"
              rel="noopener"
              className="btn btn-solid h-8"
            >
              <IconTelegram size={13} />
              <span className="hidden sm:inline">Бот</span>
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
