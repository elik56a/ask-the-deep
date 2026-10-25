import { UserRound } from "lucide-react";

interface AvatarProps {
  /** The agent's face carries its name for screen readers; the visitor's is decoration. */
  label?: string;
  badge?: boolean;
  small?: boolean;
  /** A pulsing dot: the agent is still there to answer. */
  live?: boolean;
}

export function Avatar({
  label,
  badge = true,
  small = false,
  live = false,
}: AvatarProps) {
  if (label === undefined) {
    return (
      <span
        aria-hidden="true"
        className="grid size-8 flex-none place-items-center rounded-full bg-[color-mix(in_oklab,var(--color-haze)_22%,var(--color-surface))] text-haze shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-haze),0_0_14px_-2px_var(--color-haze)]"
      >
        <UserRound aria-hidden="true" className="size-4.5" />
      </span>
    );
  }
  return (
    <span
      className={`relative grid flex-none place-items-center ${small ? "size-6" : "size-8"}`}
    >
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
      {live && (
        <span
          aria-hidden="true"
          className="absolute -end-px -bottom-px size-2.25 animate-[pulse_2.4s_var(--ease-out)_infinite] rounded-full bg-glow shadow-[0_0_0_2px_var(--color-surface),0_0_8px_var(--color-glow)] motion-reduce:animate-none"
        />
      )}
    </span>
  );
}
