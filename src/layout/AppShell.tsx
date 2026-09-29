import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { IconTelegram } from '../components/icons'
import { cx } from '../components/ui'
import { useUsingMock } from '../lib/useUsingMock'
import { Brand } from './Brand'

/* ОБОЛОЧКА ПРИЛОЖЕНИЯ.

   Навигация сверху. Разделов четыре и названия у них короткие — при таком
   наборе левая колонка не окупается: она забирает почти двести пикселей
   у таблицы серверов и оставляет пустую полосу на страницах, где контента
   меньше. Наверху она не занимает ничего и не мешает.

   Активный раздел помечен ржавой линией снизу и белым текстом, без заливки:
   заливка-пилюля — это то, от чего мы уходим. */

const TABS: Array<{ to: string; label: string; badge?: number }> = [
  { to: '/servers', label: 'Серверы' },
  { to: '/players', label: 'Игроки' },
  // Бейдж со счётчиком убран (2026-09-29): вочлист на сайте — витрина без
  // входа, а цифра «4» была зашита в код и показывалась каждому посетителю.
  { to: '/watchlist', label: 'Вочлист' },
  { to: '/rustplus', label: 'Rust+' },
]

export function AppShell() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const mock = useUsingMock()

  return (
    <div className="min-h-dvh bg-void">
      <header className="sticky top-0 z-40 border-b border-rule bg-void/95 backdrop-blur-sm">
        <div className="bleed flex h-12 items-center gap-3 sm:gap-6">
          <Brand />

          {/* На узком экране вкладки прокручиваются внутри своей полосы, а не
              растягивают страницу вбок: на 390 px шапка была шириной 518. */}
          <nav className="no-scrollbar -mb-px flex h-12 min-w-0 items-stretch overflow-x-auto">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cx(
                    'flex shrink-0 items-center gap-2 border-b-2 px-2 text-[13.5px] font-medium whitespace-nowrap transition-colors sm:px-3',
                    isActive
                      ? 'border-rust text-ink'
                      : 'border-transparent text-ink-3 hover:text-ink-2',
                  )
                }
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label}</span>
                {t.badge != null && (
                  <span className="num bg-panel-3 px-1 text-[10px] text-ink-2">{t.badge}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <form
            className="field ml-auto hidden h-8 w-full max-w-xs lg:flex"
            onSubmit={(e) => {
              e.preventDefault()
              navigate('/servers?q=' + encodeURIComponent(q.trim()))
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Найти сервер"
              style={{ fontSize: 13 }}
            />
          </form>

          <a
            href="https://t.me/RustPeek_Bot"
            target="_blank"
            rel="noopener"
            className="btn btn-solid ml-auto h-8 shrink-0 lg:ml-0"
          >
            <IconTelegram size={13} />
            <span className="hidden sm:inline">Бот</span>
          </a>
        </div>
      </header>

      {mock && (
        <div className="border-b border-rust-dim bg-rust-dim/25">
          <p className="bleed py-1 text-[11.5px] text-rust-hot">
            Демо-данные: живой API сейчас недоступен, цифры на экране ненастоящие.
          </p>
        </div>
      )}

      <main className="min-w-0 pb-12">
        <Outlet />
      </main>
    </div>
  )
}
