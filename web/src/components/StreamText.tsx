import type { CSSProperties } from "react";
import { streamTokens } from "#/utils/streamWords.utils";

interface StreamTextProps {
  text: string;
  start?: number;
}

/** Every word is laid out from the start and fades in on its turn, so the text never changes size while it streams. */
export function StreamText({ text, start = 0 }: StreamTextProps) {
  return streamTokens(text, start).map((token, i) =>
    token.index === null ? (
      token.text
    ) : (
      <span
        // biome-ignore lint/suspicious/noArrayIndexKey: the tokens of one text never reorder
        key={i}
        className="stream-word"
        style={{ "--i": token.index } as CSSProperties}
      >
        {token.text}
      </span>
    ),
  );
}
