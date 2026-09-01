import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { IconTelegram } from '../components/icons'
import { cx } from '../components/ui'
import { usingMock } from '../lib/api'
import { Brand } from './Brand'
import { StationBar } from './StationBar'

/* ОБОЛОЧКА ПРИЛОЖЕНИЯ.

   Левый рельс вместо верхних вкладок. Причина не в моде: вкладки наверху
   съедают горизонталь, которая нужна таблице серверов, и на длинной
   странице сервера они уезжают вместе со скроллом. Рельс держит навигацию
   на месте и оставляет контенту всю ширину.

   Рельс — не карточка: колонка, отделённая линией. Активный пункт помечен
   ржавой полосой слева и белым текстом, а не заливкой-пилюлей.

   На узком экране рельс уезжает вниз и становится строкой из четырёх слов —
   без иконок: слова короткие, а иконки без подписи всё равно надо гадать. */

const TABS = [
  { to: '/servers', label: 'Серверы', note: 'вайп-календарь' },
  { to: '/players', label: 'Игроки', note: 'досье по SteamID' },
  { to: '/watchlist', label: 'Вочлист', note: 'следить за людьми', badge: 4 },
  { to: '/rustplus', label: 'Rust+', note: 'рейд-алерты' },
]

export function AppShell() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  return (
    <div className="min-h-dvh bg-void">
      <StationBar />

      {/* Шапка: знак, поиск всегда под рукой, вход в бота */}
      <header className="sticky top-0 z-40 border-b border-rule bg-void/95 backdrop-blur-sm">
        <div className="bleed flex h-12 items-center gap-4">
          <Brand compact />
          <form
            className="field ml-2 hidden h-8 max-w-md flex-1 md:flex"
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
            className="btn btn-solid ml-auto h-8"
          >
            <IconTelegram size={13} />
            <span className="hidden sm:inline">Открыть бота</span>
          </a>
        </div>
      </header>

      {usingMock && (
        <div className="border-b border-rust-dim bg-rust-dim/25">
          <p className="bleed py-1 text-[11.5px] text-rust-hot">
            Демо-данные: живой API сейчас недоступен, цифры на экране ненастоящие.
          </p>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[184px_1fr]">
        {/* рельс */}
        <nav className="hidden border-r border-rule lg:block">
          <div className="sticky top-12 py-3">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cx(
                    'relative block border-l-2 py-2 pr-3 pl-[18px] transition-colors',
                    isActive
                      ? 'border-rust bg-panel-2 text-ink'
                      : 'border-transparent text-ink-2 hover:bg-panel hover:text-ink',
                  )
                }
              >
                <span className="flex items-center gap-2 text-[13.5px] font-medium">
                  {t.label}
                  {t.badge != null && (
                    <span className="num bg-panel-3 px-1 text-[10px] text-ink-2">{t.badge}</span>
                  )}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-3">{t.note}</span>
              </NavLink>
            ))}

            <p className="mt-6 border-t border-rule px-[18px] pt-3 text-[11.5px] leading-relaxed text-ink-3">
              Даты вайпов подтверждены формой кривой онлайна. Поле «last&nbsp;wipe», которое
              заполняет админ, здесь не используется вообще.
            </p>
          </div>
        </nav>

        <main className="min-w-0 pb-24 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* нижняя навигация на узком экране */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-rule bg-panel lg:hidden">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cx(
                'border-t-2 py-2.5 text-center text-[12.5px] font-medium transition-colors',
                isActive ? 'border-rust text-ink' : 'border-transparent text-ink-3',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
