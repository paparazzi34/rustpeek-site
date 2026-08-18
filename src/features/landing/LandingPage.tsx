import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStats } from '../../lib/api'
import type { SiteStats } from '../../lib/types'
import { compact, thousands } from '../../lib/format'
import { Card, CardHeader, Meter, SearchField, StatusPill, cx } from '../../components/ui'
import { IconCheck, IconTelegram } from '../../components/icons'
import { Ticker } from './Ticker'
import { MethodChart } from './MethodChart'
import { HeroLive } from './HeroLive'

/* Главная. Задача одна: за десять секунд объяснить, чем это отличается от
   любого другого мониторинга, и доказать это данными, а не прилагательными.
   Поэтому здесь минимум «продающих» слов и максимум настоящих чисел,
   настоящего графика и настоящих кусков интерфейса. */

const QUICK = ['Rustafied', 'Atlas', 'Bestrust', 'Magic Rust']

/* Числа-фолбэки — последние известные значения. Если /api/stats ответит,
   они заменятся живыми; если нет — на экране останутся честные «примерно
   столько», а не нули. */
const FALLBACK: Required<SiteStats> = {
  servers_tracked: 1098,
  servers_total: 2479,
  wipes: 9676,
  online_measurements: 1_980_611,
}

export function LandingPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [stats, setStats] = useState<SiteStats | null>(null)

  useEffect(() => {
    let alive = true
    void getStats().then((s) => alive && s && setStats(s))
    return () => {
      alive = false
    }
  }, [])

  const value = (key: keyof SiteStats) => stats?.[key] ?? FALLBACK[key]
  const go = (q: string) => navigate(q ? `/servers?q=${encodeURIComponent(q)}` : '/servers')

  return (
    <>
      {/* ============================================================ HERO */}
      <section className="mx-auto grid max-w-[1240px] items-start gap-10 px-5 pt-14 pb-10 sm:pt-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div>
          <StatusPill tone="hot" dot>
            наблюдение идёт прямо сейчас
          </StatusPill>
          <h1 className="mt-4 text-[34px] leading-[1.12] font-bold tracking-tight text-balance sm:text-[46px]">
            Мониторинг Rust, который{' '}
            <span className="text-rust-hot">помнит</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-2">
            Дату вайпа на других сайтах заполняет админ сервера — руками, когда вспомнит. Я её не
            спрашиваю: вайп видно по форме кривой онлайна — пик, провал, рост. Эту подпись
            подделать нельзя.
          </p>

          <div className="mt-7 max-w-xl">
            <SearchField
              value={query}
              onChange={setQuery}
              onSubmit={() => go(query.trim())}
              placeholder="Rustafied, Atlas, Magic Rust…"
              right={
                <button
                  type="submit"
                  className="-mr-2 h-8 shrink-0 rounded-[4px] bg-rust px-4 text-[13px] font-medium text-white transition-colors hover:bg-rust-hot"
                >
                  Найти
                </button>
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className="text-ink-3">часто ищут:</span>
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => go(q)}
                  className="rounded-full border border-line px-3 py-1 text-ink-2 transition-colors hover:border-rust/60 hover:text-rust-hot"
                >
                  {q}
                </button>
              ))}
              <Link
                to="/players"
                className="ml-auto text-ink-3 underline decoration-dotted underline-offset-4 transition-colors hover:text-ink-2"
              >
                или пробей игрока →
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:pt-10">
          <HeroLive />
        </div>
      </section>

      {/* ====================================================== СЧЁТЧИКИ */}
      <div className="border-y border-line bg-surface/40">
        <div className="mx-auto grid max-w-[1240px] grid-cols-2 divide-x divide-y divide-line px-0 sm:grid-cols-4 sm:divide-y-0">
          <Counter value={thousands(value('servers_tracked'))} label="серверов под наблюдением" />
          <Counter value={compact(value('online_measurements'))} label="замеров онлайна" />
          <Counter value={thousands(value('wipes'))} label="подтверждённых вайпов" />
          <Counter value="топ-500" label="сканирую напрямую через A2S" accent />
        </div>
      </div>

      <Ticker />

      {/* ========================================================= МЕТОД */}
      <section id="method" className="mx-auto max-w-[1240px] scroll-mt-16 px-5 py-16">
        <SectionHead
          eyebrow="Метод"
          title="Почему я знаю больше"
          sub="Всё держится на одной идее: словам не верить, смотреть на данные."
        />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4 text-[14.5px] leading-relaxed text-ink-2">
            <p>
              Поле «дата вайпа» на мониторингах — это <b className="text-ink">ручной ввод</b>. Кто-то
              обновляет честно, кто-то забывает на месяцы, кто-то врёт специально, чтобы сервер
              выглядел свежим и собирал онлайн. А «JUST WIPED» в названии у половины серверов висит
              вечно, как неоновая вывеска.
            </p>
            <p>Я смотрю на форму онлайна. У настоящего вайпа есть подпись из трёх частей:</p>

            <ol className="space-y-3 border-l border-line pl-4">
              {[
                ['Пик', 'сервер жил, народ фармил, онлайн шёл суточной волной'],
                ['Провал', 'рестарт: карта стёрта, всех выкинуло, онлайн почти в ноль'],
                ['Рост', 'толпа врывается на свежую землю — подъём выше обычного'],
              ].map(([k, v], i) => (
                <li key={k} className="relative">
                  <span className="absolute -left-[21px] top-1 flex size-[13px] items-center justify-center rounded-full bg-rust text-[9px] font-bold text-white">
                    {i + 1}
                  </span>
                  <b className="text-ink">{k}</b> — {v}
                </li>
              ))}
            </ol>

            <p>
              Нет всех трёх — вайпа не было, что бы ни писал админ. Есть — фиксирую время с точностью
              до минуты, считаю цикл и говорю, когда будет следующий.{' '}
              <b className="text-ink">Если цикл вообще устойчив.</b> Не устойчив — так и напишу «не
              определён», а не нарисую случайное число.
            </p>
          </div>

          <MethodChart />
        </div>
      </section>

      {/* ==================================================== СРАВНЕНИЕ */}
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto max-w-[1240px] px-5 py-14">
          <SectionHead
            eyebrow="Разница"
            title="Снапшот против памяти"
            sub="Обычный мониторинг показывает число в моменте. Я показываю, что за этим числом стоит — и что будет дальше."
          />
          <Card className="mt-7 overflow-hidden">
            <table className="w-full text-left text-[13.5px]">
              <thead className="bg-surface-2/60 text-[12px] text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Вопрос игрока</th>
                  <th className="px-4 py-2.5 font-medium">Мониторинг-снапшот</th>
                  <th className="px-4 py-2.5 font-medium text-rust-hot">RustPeek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {[
                  [
                    'Когда тут был вайп?',
                    'то, что вписал админ',
                    'время из кривой онлайна, с точностью до минуты',
                  ],
                  ['Когда будет следующий?', 'нет ответа', 'прогноз по циклу — или честное «не определён»'],
                  ['Сервер живой или умирает?', 'онлайн прямо сейчас', 'тренд по неделям: набирает, стабилен, пустеет'],
                  ['Во сколько тут людно?', 'нет ответа', 'профиль по 24 часам за 30 дней'],
                  [
                    'Что за игрок меня убил?',
                    'зависит от открытости профиля',
                    'Trust Score + история серверов, в том числе через A2S',
                  ],
                ].map(([q, a, b]) => (
                  <tr key={q}>
                    <td className="px-4 py-2.5 text-ink">{q}</td>
                    <td className="px-4 py-2.5 text-ink-3">{a}</td>
                    <td className="px-4 py-2.5 text-ink-2">
                      <span className="flex items-start gap-2">
                        <IconCheck size={14} className="mt-0.5 shrink-0 text-good" />
                        {b}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-[12px] text-ink-3">
            Снапшот любой может показать. Историю надо было начать собирать вовремя — я начал в мае.
          </p>
        </div>
      </section>

      {/* ===================================================== ЧТО УМЕЮ */}
      <section id="features" className="mx-auto max-w-[1240px] scroll-mt-16 px-5 py-16">
        <SectionHead eyebrow="Возможности" title="Что умею" />

        <div className="mt-8 space-y-6">
          <Feature
            title="Поиск серверов — с правдой про вайп"
            text="Ищи по названию или собирай подбор фильтрами: тип, рейт, цикл, стадия, онлайн. Каждый сервер получает честную метку: вайпнулся только что, вайп на днях, цикл не определён. Сортировка «Свежий вайп» поднимает тех, кто вайпнулся по-настоящему, а не переименовался в JUST WIPED третий месяц подряд."
            note="даты валидируются по циклам онлайна, а не по полю last_wipe"
            preview={<ServersPreview />}
          />
          <Feature
            reverse
            title="Досье на игрока"
            text="SteamID или ссылка на профиль — и я собираю картину: Trust Score, часы в игре, возраст аккаунта, баны, где играл и когда. Убил тебя подозрительно меткий парень? Пробей и решай сам, читер это или у тебя был плохой день. Профиль закрыт — не стена: топ-500 серверов я сканирую напрямую через A2S и вижу игроков, которых не видит Steam."
            note="чего не вижу — пишу «неизвестно», а не рисую нолики"
            preview={<PlayerPreview />}
          />
          <Feature
            title="Вочлист — слежу, пока ты спишь"
            text="Добавь врагов, соседей или старых тиммейтов — я смотрю за ними круглосуточно и пришлю пуш в ту же секунду, как цель зайдёт на сервер. Соседи проснулись в четыре утра? Ты узнаешь об этом раньше, чем они докопаются до твоего лута."
            note="пуш приходит в Telegram — туда, где ты и так сидишь"
            preview={<WatchlistPreview />}
          />
          <Feature
            reverse
            title="Rust+ без официального приложения"
            text="Подключи пару Rust+ — рейды, Smart Alarm, смерти и события карты прилетают в Telegram мгновенно, даже когда официальное приложение лежит. У меня свой канал пушей. Для рейдов есть громкий режим: серия алертов подряд, чтобы телефон разбудил тебя ночью."
            note="рейд в четыре утра — вопрос не «если», а «когда»"
            preview={<RustPlusPreview />}
          />
        </div>
      </section>

      {/* ======================================================= ВЕБ-ВЕРСИЯ */}
      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-5 py-12">
          <div className="max-w-xl">
            <h2 className="text-[22px] font-semibold tracking-tight">Всё то же — на большом экране</h2>
            <p className="mt-2 text-[14px] text-ink-2">
              История по дням, циклы, прайм-тайм, досье игроков и вочлист — в браузере, когда телефон
              лень доставать. Тот же аккаунт, те же данные, ноль настройки.
            </p>
          </div>
          <Link
            to="/servers"
            className="inline-flex h-10 items-center rounded-[5px] bg-rust px-5 text-[14px] font-medium text-white transition-colors hover:bg-rust-hot"
          >
            Открыть веб-версию
          </Link>
        </div>
      </section>

      {/* ============================================================ FAQ */}
      <section id="faq" className="mx-auto max-w-[820px] scroll-mt-16 px-5 py-16">
        <SectionHead eyebrow="Вопросы" title="Что спрашивают чаще всего" />
        <div className="mt-7 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-[14.5px] font-medium text-ink marker:content-['']">
                {item.q}
                <span className="shrink-0 text-ink-3 transition-transform duration-150 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-[13.5px] leading-relaxed text-ink-2">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ==================================================== ФИНАЛЬНЫЙ CTA */}
      <section className="mx-auto max-w-[1240px] px-5 pb-20">
        <Card className="px-6 py-12 text-center">
          <h2 className="text-[28px] leading-tight font-bold tracking-tight">
            Хватит играть <span className="text-rust-hot">вслепую</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] text-ink-2">
            Тридцать секунд в Telegram — и у тебя память лучше, чем у любого мониторинга. Вайпы,
            игроки, слежка, рейд-алерты. Всё в одном боте.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="https://t.me/RustPeek_Bot"
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-[5px] bg-rust px-5 text-[14px] font-medium text-white transition-colors hover:bg-rust-hot"
            >
              <IconTelegram size={15} />
              Открыть @RustPeek_Bot
            </a>
            <Link
              to="/servers"
              className="inline-flex h-10 items-center rounded-[5px] border border-line px-5 text-[14px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
            >
              Сначала посмотреть данные
            </Link>
          </div>
          <div className="tnum mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-ink-3">
            <span>
              <b className="text-ink-2">{compact(value('online_measurements'))}</b> замеров онлайна
            </span>
            <span>
              <b className="text-ink-2">{thousands(value('wipes'))}</b> подтверждённых вайпов
            </span>
            <span>
              <b className="text-ink-2">{thousands(value('servers_total'))}</b> серверов в базе
            </span>
            <span>
              <b className="text-ink-2">24/7</b> мониторинг
            </span>
          </div>
        </Card>
      </section>
    </>
  )
}

/* ------------------------------------------------------------ строительные */

function Counter({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="px-5 py-5">
      <div
        className={cx(
          'text-[22px] leading-none font-semibold tracking-tight',
          accent ? 'text-rust-hot' : 'text-ink',
        )}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-3">{label}</div>
    </div>
  )
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="text-[11.5px] font-medium tracking-[0.14em] text-rust-hot uppercase">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-[26px] leading-tight font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-2 text-[14px] text-ink-2">{sub}</p>}
    </div>
  )
}

function Feature({
  title,
  text,
  note,
  preview,
  reverse,
}: {
  title: string
  text: string
  note: string
  preview: ReactNode
  reverse?: boolean
}) {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-2">
      <div className={cx(reverse && 'lg:order-2')}>
        <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">{text}</p>
        <p className="mt-3 border-l-2 border-line pl-3 text-[12.5px] text-ink-3">{note}</p>
      </div>
      <div className={cx(reverse && 'lg:order-1')}>{preview}</div>
    </div>
  )
}

/* Превью — настоящие компоненты интерфейса, не картинки. Данные в них
   демонстрационные и подписаны как пример. */

function ServersPreview() {
  const rows = [
    { name: 'EU RENEGADE 2x Monthly Medium', meta: 'Mod · x2 · набирает', on: 106, max: 150, wipe: 'вайп 9 часов назад', fresh: true, next: 'через 2 дня', soon: false },
    { name: '[EU] RustValley 10x PVE #2', meta: 'Mod · x10 · стабилен', on: 28, max: 100, wipe: 'вайп 21 час назад', fresh: true, next: 'завтра', soon: true },
    { name: 'Rustoria.co - EU East Medium', meta: 'Vanilla · x1', on: 209, max: 225, wipe: 'вайп 4 дня назад', fresh: false, next: 'цикл не определён', soon: false },
  ]
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Выдача поиска" sub="пример" />
      <div className="divide-y divide-line/70">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-ink">{r.name}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{r.meta}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="tnum text-[11.5px] text-ink-2">
                  {r.on}
                  <span className="text-ink-3">/{r.max}</span>
                </span>
                <span className="w-14">
                  <Meter value={r.on} max={r.max} />
                </span>
                <span className={cx('text-[11.5px]', r.fresh ? 'text-good' : 'text-ink-3')}>
                  {r.wipe}
                </span>
              </div>
            </div>
            <StatusPill tone={r.soon ? 'hot' : r.next.startsWith('цикл') ? 'muted' : 'plain'} dot={r.soon}>
              {r.next}
            </StatusPill>
          </div>
        ))}
      </div>
    </Card>
  )
}

function PlayerPreview() {
  const factors = [
    ['Возраст аккаунта · с 2021', 28, 38],
    ['Часы в Rust · 1 611 ч', 34, 45],
    ['Профиль открыт', 12, 12],
    ['Жалобы игроков', -10, 25],
  ] as const
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Досье" sub="пример" />
      <div className="flex flex-wrap items-end gap-4 px-4 pt-4">
        <div>
          <div className="text-[11px] tracking-wide text-ink-3 uppercase">Trust Score</div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-[38px] leading-none font-semibold text-good">73</span>
            <span className="pb-1 text-[12.5px] text-ink-3">из 100 · высокий</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[13px] font-medium text-ink">paparazzi34</div>
          <div className="font-mono text-[11px] text-ink-3">76561198012345678</div>
        </div>
      </div>
      <div className="space-y-2 px-4 pt-4 pb-4">
        {factors.map(([label, points, max]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_56px_32px] items-center gap-2">
            <span className="truncate text-[12px] text-ink-2">{label}</span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-ink-3/15">
              <span
                className={cx(
                  'absolute inset-y-0 rounded-full',
                  points < 0 ? 'right-0 bg-danger' : 'left-0 bg-good',
                )}
                style={{ width: `${Math.min(100, (Math.abs(points) / max) * 100)}%` }}
              />
            </span>
            <span className={cx('tnum text-right text-[11.5px]', points < 0 ? 'text-danger' : 'text-ink')}>
              {points > 0 ? `+${points}` : points}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function WatchlistPreview() {
  const rows = [
    ['xX_Raider_Xx', 'на Magic Rust #4', 'зашёл 2 часа назад', 'on'],
    ['НагибаторВаня', 'профиль скрыт · вижу через A2S', 'зашёл 15 минут назад', 'hidden'],
    ['sleepy_bob', 'офлайн', 'был вчера в 23:10', 'off'],
  ] as const
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Вочлист" sub="пример" />
      <div className="divide-y divide-line/70">
        {rows.map(([nick, where, when, state]) => (
          <div key={nick} className="flex items-center gap-3 px-4 py-3">
            <span
              className={cx(
                'size-2 shrink-0 rounded-full',
                state === 'on' && 'animate-live bg-good',
                state === 'hidden' && 'bg-rust',
                state === 'off' && 'bg-ink-3/50',
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{nick}</span>
              <span className="block truncate text-[11.5px] text-ink-3">{where}</span>
            </span>
            <span className="shrink-0 text-[11.5px] text-ink-3">{when}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RustPlusPreview() {
  const rows = [
    ['!', 'Рейд.', 'Взрыв у базы — Smart Alarm «Главная дверь»', '14:32', 'raid'],
    ['~', 'Smart Alarm.', '«Ловушка в гараже» — движение', '11:07', 'alarm'],
    ['×', 'Смерть.', 'ShadowKiller_228 — AK-47, 87 м', '23:48', 'death'],
  ] as const
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Лента Rust+" sub="пример" />
      <div className="divide-y divide-line/70">
        {rows.map(([glyph, title, detail, time, kind]) => (
          <div key={title} className="flex items-start gap-3 px-4 py-3">
            <span
              className={cx(
                'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[4px] border text-[13px] font-semibold',
                kind === 'raid' && 'border-danger/40 bg-danger/10 text-danger',
                kind === 'alarm' && 'border-rust/40 bg-rust/10 text-rust-hot',
                kind === 'death' && 'border-line bg-surface-2 text-ink-2',
              )}
              aria-hidden
            >
              {glyph}
            </span>
            <span className="min-w-0 flex-1 text-[13px] text-ink">
              <b className="font-semibold">{title}</b> {detail}
            </span>
            <span className="tnum shrink-0 text-[11.5px] text-ink-3">{time}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

const FAQ = [
  {
    q: 'Откуда у тебя данные?',
    a: 'Три источника: публичная статистика мониторингов, прямой A2S-опрос серверов (тот же протокол, которым пользуется сама игра) и собственная база истории, которая пишется круглосуточно с мая. Снапшот покажет любой — историю надо было начать собирать вовремя.',
  },
  {
    q: 'Почему нельзя просто верить дате вайпа на мониторинге?',
    a: 'Потому что её заполняет админ сервера руками. Кто-то честно обновляет, кто-то забывает месяцами, а кто-то врёт специально, чтобы сервер выглядел свежим и собирал онлайн. Я валидирую каждую дату по форме онлайна: пик, провал, рост. Эту подпись подделать нельзя — она требует, чтобы с сервера реально вылетели все игроки.',
  },
  {
    q: 'Профиль игрока закрыт — что ты вообще увидишь?',
    a: 'Больше, чем кажется. Закрытый профиль прячет статистику Steam, но не прячет самого игрока на сервере: топ-500 серверов я опрашиваю напрямую и вижу, кто где играет — по факту присутствия. А чего не вижу, о том честно пишу «неизвестно».',
  },
  {
    q: 'Почему у некоторых серверов «цикл не определён»?',
    a: 'Потому что интервалы между их вайпами разбросаны — то четыре дня, то одиннадцать. Из такого ряда прогноз не строится. Можно было бы нарисовать среднее и сделать вид, что это дата, но тогда весь смысл проекта пропадает. Лучше прочерк, чем уверенное враньё.',
  },
  {
    q: 'Это бесплатно?',
    a: 'База — да: поиск, вайпы, досье. Продвинутым штукам вроде слежки за пачкой целей и громких рейд-алертов со временем появится подписка. Но сначала я должен быть полезен, а потом просить денег, а не наоборот.',
  },
  {
    q: 'А если сервер маленький и его нет в твоей базе?',
    a: 'Найду через поиск и возьму под наблюдение — с этого момента история начнёт писаться. Чем раньше добавишь свой сервер, тем длиннее будет его память к следующему циклу.',
  },
]
