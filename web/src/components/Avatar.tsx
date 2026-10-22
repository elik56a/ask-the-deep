interface AvatarProps {
  /** The agent's face carries its name for screen readers; the visitor's is decoration. */
  label?: string;
  badge?: boolean;
}

export function Avatar({ label, badge = true }: AvatarProps) {
  if (label === undefined) {
    return (
      <span
        aria-hidden="true"
        className="grid size-8 flex-none place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-haze)_22%,var(--color-surface))] text-haze shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-haze),0_0_14px_-2px_var(--color-haze)]"
      >
        <svg width="19" height="19" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="5.5" r="2.8" fill="currentColor" />
          <path
            d="M2.5 14c.6-3 2.9-4.6 5.5-4.6s4.9 1.6 5.5 4.6Z"
            fill="currentColor"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="relative grid size-8 flex-none place-items-center">
      <img
        src="/eliyahu.jpg"
        alt={label}
        width={32}
        height={32}
        className="size-full rounded-full object-cover shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-glow),0_0_14px_-2px_var(--color-glow)]"
      />
      {badge && (
        <b
          aria-hidden="true"
          className="absolute -end-1.5 -bottom-1 rounded bg-glow px-0.75 py-0.5 font-mono font-semibold text-[8px] text-on-accent leading-none tracking-[0.04em]"
        >
          AI
        </b>
      )}
    </span>
  );
}
