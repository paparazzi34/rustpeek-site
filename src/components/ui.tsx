import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { IconAlert } from './icons'

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ Кнопка */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'outline', size = 'md', className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[4px] font-medium whitespace-nowrap',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-[13.5px]',
        variant === 'solid' && 'bg-rust text-white hover:bg-rust-hot',
        variant === 'outline' &&
          'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        className,
      )}
    />
  )
}

/* --------------------------------------------------- Сегментированный набор */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  ariaLabel,
}: {
  value: T
  options: Array<{ value: T; label: ReactNode; hint?: string }>
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-[5px] border border-line bg-surface p-0.5"
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            title={o.hint}
            onClick={() => onChange(o.value)}
            className={cx(
              'rounded-[3px] font-medium whitespace-nowrap transition-colors duration-150',
              size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-3 text-[12.5px]',
              on ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------- Статусная метка
   Цвет никогда не работает в одиночку: рядом всегда текст, а у «горячих»
   состояний ещё и точка. Красный здесь недоступен намеренно — он живёт
   только в ошибках и банах, чтобы не сталкиваться с ржавым. */

export type Tone = 'good' | 'hot' | 'muted' | 'plain'

export function StatusPill({
  tone = 'plain',
  dot = false,
  children,
  className,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-[3px] border px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap',
        tone === 'good' && 'border-good/35 bg-good/10 text-good',
        tone === 'hot' && 'border-rust/35 bg-rust/10 text-rust-hot',
        tone === 'muted' && 'border-line bg-surface-2 text-ink-3',
        tone === 'plain' && 'border-line bg-surface-2 text-ink-2',
        className,
      )}
    >
      {dot && (
        <span
          className={cx(
            'size-1.5 rounded-full',
            tone === 'good' && 'bg-good',
            tone === 'hot' && 'bg-rust-hot',
            (tone === 'muted' || tone === 'plain') && 'bg-ink-3',
          )}
        />
      )}
      {children}
    </span>
  )
}

/* ----------------------------------------------------------------- Карточка */

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}) {
  return (
    <As className={cx('rounded-[6px] border border-line bg-surface', className)}>{children}</As>
  )
}

export function CardHeader({
  title,
  sub,
  right,
}: {
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3">
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold tracking-tight text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-[12px] text-ink-3">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/* --------------------------------------------------------------- Плитка KPI */

export function StatTile({
  label,
  value,
  sub,
  tone = 'plain',
  hint,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: Tone
  hint?: string
}) {
  return (
    <div className="min-w-0 px-4 py-3" title={hint}>
      <div className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">{label}</div>
      <div
        className={cx(
          'mt-1 truncate text-[17px] leading-tight font-semibold',
          tone === 'good' && 'text-good',
          tone === 'hot' && 'text-rust-hot',
          tone === 'muted' && 'text-ink-3',
          tone === 'plain' && 'text-ink',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-ink-3">{sub}</div>}
    </div>
  )
}

/* -------------------------------------------------------------- Полоса-мера
   Заливка несёт состояние, трек — тот же тон на 12%: состояние читается
   по всей длине, а не только там, где закрашено. */

export function Meter({ value, max, full }: { value: number; max: number; full?: boolean }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  const isFull = full ?? (max > 0 && value / max >= 0.9)
  return (
    <span
      className="relative block h-1 w-full overflow-hidden rounded-full bg-ink-3/20"
      role="img"
      aria-label={`${value} из ${max}`}
    >
      <span
        className={cx('absolute inset-y-0 left-0 rounded-full', isFull ? 'bg-rust' : 'bg-ink-2')}
        style={{ width: `${ratio * 100}%` }}
      />
    </span>
  )
}

/* ----------------------------------------------------------------- Состояния */

export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <div className={cx('skeleton rounded-[3px]', className)} style={style} />
}

export function EmptyState({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-[14px] text-ink-2">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-md text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  )
}

export function ErrorState({ title, onRetry }: { title: ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <IconAlert size={20} className="text-danger" />
      <p className="text-[13.5px] text-ink-2">{title}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ Поле поиска */

export function SearchField({
  value,
  onChange,
  placeholder,
  onSubmit,
  autoFocus,
  right,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onSubmit?: () => void
  autoFocus?: boolean
  right?: ReactNode
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      className="flex h-10 items-center gap-2 rounded-[5px] border border-line bg-surface px-3 transition-colors focus-within:border-rust/60"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="shrink-0 text-ink-3"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
      />
      {right}
    </form>
  )
}
