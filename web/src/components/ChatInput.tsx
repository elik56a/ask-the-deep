import type { FormEvent } from "react";
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
    <form onSubmit={submit} className="flex gap-2">
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
        className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-2 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-xl bg-accent px-4 py-2 font-medium text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {copy.send}
      </button>
    </form>
  );
}
