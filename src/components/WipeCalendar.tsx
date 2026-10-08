import { firstThursdayUtc, pad2 } from '../lib/format'
import { cx } from './ui'

/* КАЛЕНДАРЬ ВАЙПОВ — главный элемент карточки сервера (2026-10-07).

   Пять недель: три прошедшие, текущая и следующая. Игрок думает о вайпах
   днями недели («у них по четвергам»), и сетка понедельник–воскресенье
   показывает ритм сервера одним взглядом, чего не умел ни трек фазы, ни
   таблица. Три вида отметок, у каждой своё слово в легенде:
     · зелёная заливка — подтверждённый вайп (смена карты);
     · пунктирная рамка — прогноз по циклу;
     · красный уголок — глобальный вайп Facepunch (первый четверг месяца).
   Все даты — в местном времени человека. */

const WEEKS = 5
const HEAD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function WipeCalendar({
  wipes,
  forecast,
  forecastIsBound,
}: {
  /** подтверждённые вайпы */
  wipes: Date[]
  /** прогноз следующего вайпа */
  forecast: Date | null
  /** прогноз — лишь граница «не позже» (глобал), а не дата по циклу */
  forecastIsBound?: boolean
}) {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const weekday = (start.getDay() + 6) % 7 // пн = 0
  start.setDate(start.getDate() - weekday - 7 * (WEEKS - 2))

  const days = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const wipeDays = new Map<string, Date>()
  for (const w of wipes) wipeDays.set(dayKey(w), w)

  const globals = new Set<string>()
  for (const off of [-1, 0, 1]) {
    const m = new Date(today.getFullYear(), today.getMonth() + off, 1)
    globals.add(dayKey(firstThursdayUtc(m.getFullYear(), m.getMonth())))
  }

  const forecastKey = forecast ? dayKey(forecast) : null
  const todayKey = dayKey(today)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {HEAD.map((h) => (
          <div key={h} className="eyebrow pb-1 text-center">
            {h}
          </div>
        ))}
        {days.map((d) => {
          const key = dayKey(d)
          const wipe = wipeDays.get(key)
          const isForecast = key === forecastKey && !wipe
          const isGlobal = globals.has(key)
          const isToday = key === todayKey
          const past = d < new Date(today.getFullYear(), today.getMonth(), today.getDate())
          const firstOfMonth = d.getDate() === 1
          return (
            <div
              key={key}
              title={
                wipe
                  ? `Вайп ${pad2(wipe.getHours())}:${pad2(wipe.getMinutes())}`
                  : isForecast
                    ? forecastIsBound
                      ? 'Не позже — глобальный вайп'
                      : 'Прогноз по циклу'
                    : undefined
              }
              className={cx(
                'relative flex aspect-square min-h-9 flex-col items-center justify-center rounded-[3px] border text-center',
                wipe
                  ? 'border-good bg-good-dim'
                  : isForecast
                    ? forecastIsBound
                      ? 'border-dashed border-rust-hot'
                      : 'border-dashed border-good'
                    : 'border-transparent bg-panel-2',
                isToday && !wipe && 'border-ink-2',
              )}
            >
              {isGlobal && (
                <span
                  aria-hidden
                  className="absolute top-0 right-0 size-0 border-t-[9px] border-l-[9px] border-t-rust border-l-transparent"
                />
              )}
              <span
                className={cx(
                  'num text-[15px] leading-none',
                  wipe ? 'font-bold text-good' : past ? 'text-ink-3' : 'text-ink',
                )}
              >
                {d.getDate()}
              </span>
              {firstOfMonth && (
                <span className="num mt-0.5 text-[10.5px] leading-none text-ink-3">
                  {['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][d.getMonth()]}
                </span>
              )}
              {wipe && (
                <span className="num mt-0.5 text-[11px] leading-none text-good">
                  {pad2(wipe.getHours())}:{pad2(wipe.getMinutes())}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px] border border-good bg-good-dim" /> вайп
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px] border border-dashed border-good" /> прогноз
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-0 border-t-[9px] border-l-[9px] border-t-rust border-l-transparent" />{' '}
          глобал Facepunch
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px] border border-ink-2" /> сегодня
        </span>
      </div>
    </div>
  )
}
