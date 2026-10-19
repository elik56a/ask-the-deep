import type { FormEvent } from "react";
import { ArrowIcon } from "#/components/ArrowIcon";
import { CHAT_COPY, MAX_QUESTION_CHARS } from "#/constants/chat.constants";
import type { Lang } from "#/types/i18n.types";

interface ChatInputProps {
  lang: Lang;
  disabled: boolean;
  onSend: (question: string) => void;
}

export function ChatInput({ lang, disabled, onSend }: ChatInputProps) {
  const copy = CHAT_COPY[lang];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    onSend(String(new FormData(form).get("question") ?? ""));
    form.reset();
  }

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-2 rounded-2xl border border-line-strong bg-sunk py-2 ps-4 pe-2 transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20"
    >
      <label htmlFor="question" className="sr-only">
        {copy.inputLabel}
      </label>
      <input
        id="question"
        name="question"
        dir="auto"
        autoComplete="off"
        required
        maxLength={MAX_QUESTION_CHARS}
        placeholder={copy.placeholder}
        className="min-w-0 flex-1 bg-transparent py-2.5 placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label={copy.send}
        className="grid size-11 flex-none place-items-center rounded-xl bg-accent text-on-accent transition-transform duration-150 ease-out focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 active:scale-95 disabled:opacity-50"
      >
        <ArrowIcon />
      </button>
    </form>
  );
}
