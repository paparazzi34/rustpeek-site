import type { ReactNode, ButtonHTMLAttributes, FormEvent } from 'react'

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

/* Примитивы намеренно тонкие: почти вся форма живёт в theme.css классами
   .btn / .seg / .tag / .bar / .field. Так плотность настраивается в одном
   месте, а не расползается по двадцати компонентам инлайновыми классами. */

/* ------------------------------------------------------------------ Кнопка */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'bare'
}

export function Button({ variant = 'outline', className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        'btn',
        variant === 'solid' && 'btn-solid',
        variant === 'bare' && 'btn-bare',
        className,
      )}
    />
  )
}

/* ------------------------------------------------------------ Переключатель */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T
  options: Array<{ value: T; label: ReactNode; count?: number; hint?: string }>
  onChange: (v: T) => void
  ariaLabel?: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('seg', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          title={o.hint}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count != null && (
            <span className="num ml-1.5 text-[10.5px] normal-case opacity-55">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- Метка состояния
   Цвет никогда не работает в одиночку — рядом всегда слово. */

export type Tone = 'good' | 'warn' | 'rust' | 'mute' | 'bad'

export function Tag({
  tone = 'mute',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return <span className={cx('tag', `tag-${tone}`, className)}>{children}</span>
}

/* ------------------------------------------------------------ Полоса-мера */

export function Meter({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  return (
    <span className="bar" role="img" aria-label={`${value} из ${max}`}>
      <i data-full={ratio >= 0.9 || undefined} style={{ width: `${ratio * 100}%` }} />
    </span>
  )
}

/* --------------------------------------------------------------- Заголовки */

/** Ярлык секции над линией: служебная подпись, а не украшение. */
export function BandTitle({
  label,
  title,
  note,
  right,
}: {
  label: string
  title?: ReactNode
  note?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-rule py-2.5">
      <div className="min-w-0">
        <div className="eyebrow">{label}</div>
        {title && <h2 className="mt-1.5 text-[15px] font-semibold text-ink">{title}</h2>}
        {note && <p className="mt-1 text-[12.5px] text-ink-3">{note}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ---------------------------------------------------------------- Состояния */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cx('skeleton', className)} style={style} />
}

/** Пустое состояние всегда объясняет причину, а не разводит руками. */
export function EmptyState({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="border-l-2 border-rule-2 py-10 pl-4">
      <p className="text-[14px] text-ink-2">{title}</p>
      {hint && <p className="mt-1.5 max-w-xl text-[12.5px] text-ink-3">{hint}</p>}
    </div>
  )
}

export function ErrorState({ title, onRetry }: { title: ReactNode; onRetry?: () => void }) {
  return (
    <div className="border-l-2 border-bad py-10 pl-4">
      <div className="eyebrow" style={{ color: 'var(--color-bad)' }}>
        сбой
      </div>
      <p className="mt-2 text-[13.5px] text-ink-2">{title}</p>
      {onRetry && (
        <Button className="mt-3" onClick={onRetry}>
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
  size = 'md',
  action,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onSubmit?: () => void
  autoFocus?: boolean
  size?: 'md' | 'lg'
  action?: ReactNode
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.()
  }
  return (
    <form onSubmit={submit} className="field" style={{ height: size === 'lg' ? 56 : 38 }}>
      <svg
        width={size === 'lg' ? 19 : 15}
        height={size === 'lg' ? 19 : 15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        className="shrink-0 text-ink-3"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.7-3.7" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontSize: size === 'lg' ? 19 : 13.5 }}
      />
      {action}
    </form>
  )
}
