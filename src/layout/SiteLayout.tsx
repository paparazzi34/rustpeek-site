import { Link, Outlet } from 'react-router-dom'
import { IconTelegram } from '../components/icons'
import { useUsingMock } from '../lib/useUsingMock'
import { Brand } from './Brand'
import { SiteFooter } from './SiteFooter'

/* Оболочка главной. Отдельная от AppShell намеренно: на лендинге не нужны
   вкладки приложения, а в приложении не нужны якоря лендинга. Высота и
   поведение шапки одинаковые, чтобы переход между витриной и инструментом
   не выглядел переездом на другой сайт. */

const LINKS = [
  { href: '#method', label: 'как это работает' },
  { href: '#can', label: 'что умею' },
  { href: '#faq', label: 'вопросы' },
]

export function SiteLayout() {
  const mock = useUsingMock()

  return (
    <div className="min-h-dvh bg-void">
      <header className="sticky top-0 z-40 border-b border-rule bg-void/95 backdrop-blur-sm">
        <div className="bleed flex h-12 items-center gap-6">
          <Brand />
          <nav className="hidden items-center gap-5 text-[12.5px] text-ink-3 md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/servers" className="btn h-8">
              Список серверов
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

      {/* Полоса демо-данных нужна и здесь. Раньше её не было только внутри
          приложения, и главная молча показывала выдуманные серверы — ровно
          то, чего продукт обещает не делать. */}
      {mock && (
        <div className="border-b border-rust-dim bg-rust-dim/25">
          <p className="bleed py-1 text-[11.5px] text-rust-hot">
            Демо-данные: живой API сейчас недоступен, цифры и названия серверов на экране
            ненастоящие.
          </p>
        </div>
      )}

      <main>
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
