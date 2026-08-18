import { Link, NavLink, Outlet } from 'react-router-dom'
import { IconBell, IconEye, IconServers, IconTelegram, IconUser } from '../components/icons'
import { cx } from '../components/ui'
import { usingMock } from '../lib/api'
import { SiteFooter } from './SiteFooter'

const TABS = [
  { to: '/servers', label: 'Серверы', icon: IconServers },
  { to: '/players', label: 'Игроки', icon: IconUser },
  { to: '/watchlist', label: 'Вочлист', icon: IconEye, badge: 4 },
  { to: '/rustplus', label: 'Rust+', icon: IconBell },
]

export function AppShell() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-6 px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="size-2 rounded-full bg-rust shadow-[0_0_10px_var(--color-rust)] animate-live" />
            <span className="text-[15px] font-bold tracking-tight">
              Rust<span className="text-rust-hot">Peek</span>
            </span>
          </Link>

          <nav className="-mb-px flex h-full items-stretch gap-0.5">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cx(
                    'relative flex items-center gap-2 px-3 text-[13.5px] font-medium transition-colors',
                    isActive ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <t.icon size={15} />
                    <span className="hidden sm:inline">{t.label}</span>
                    {t.badge != null && (
                      <span className="tnum rounded-full bg-surface-3 px-1.5 py-px text-[10.5px] text-ink-2">
                        {t.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-rust" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <a
              href="https://t.me/RustPeek_Bot"
              target="_blank"
              rel="noopener"
              className="inline-flex h-8 items-center gap-2 rounded-[4px] bg-rust px-3 text-[13px] font-medium text-white transition-colors hover:bg-rust-hot"
            >
              <IconTelegram size={14} />
              <span className="hidden md:inline">Открыть бота</span>
            </a>
          </div>
        </div>
      </header>

      {usingMock && (
        <div className="border-b border-rust/25 bg-rust/8">
          <div className="mx-auto max-w-[1240px] px-5 py-1.5 text-[12px] text-rust-hot">
            Демо-данные: живой API сейчас недоступен, цифры на экране ненастоящие.
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1240px] px-5 py-6">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  )
}
