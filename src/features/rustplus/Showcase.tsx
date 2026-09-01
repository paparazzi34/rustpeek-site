import type { ReactNode } from 'react'

/* Общая витрина для функций, которые пока живут только в боте.
   Одна форма на обе страницы: если функция не работает на сайте, она должна
   выглядеть одинаково честно в обоих местах. */

export function Showcase({
  eyebrow,
  title,
  lead,
  rows,
  note,
  action,
}: {
  eyebrow: string
  title: string
  lead: string
  rows: Array<[string, string]>
  note: string
  action: ReactNode
}) {
  return (
    <>
      <div className="bleed border-b border-rule py-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <div className="eyebrow">{eyebrow}</div>
          <span className="eyebrow" style={{ color: 'var(--color-warn)' }}>
            на сайте пока витрина
          </span>
        </div>
        <h1 className="mt-2 text-[24px] leading-tight font-semibold text-ink">{title}</h1>
        <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-2">{lead}</p>
      </div>

      <div className="bleed py-6">
        <div className="max-w-3xl border-t border-rule">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="grid gap-x-8 gap-y-1 border-b border-rule py-3.5 sm:grid-cols-[210px_1fr]"
            >
              <div className="text-[14px] font-semibold text-ink">{k}</div>
              <div className="text-[13px] leading-relaxed text-ink-2">{v}</div>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-2xl border-l-2 border-rule-2 py-1 pl-4 text-[13px] leading-relaxed text-ink-3">
          {note}
        </p>

        <div className="mt-6">{action}</div>
      </div>
    </>
  )
}
