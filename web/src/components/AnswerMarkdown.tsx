import Markdown, { type Components } from "react-markdown";
import { ANSWER_ELEMENTS } from "#/constants/markdown.constants";

interface AnswerMarkdownProps {
  text: string;
}

const COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-accent underline underline-offset-2"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="flex list-disc flex-col gap-1 ps-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="flex list-decimal flex-col gap-1 ps-5">{children}</ol>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-text/10 px-1 font-mono text-[0.9em]">
      {children}
    </code>
  ),
};

export function AnswerMarkdown({ text }: AnswerMarkdownProps) {
  return (
    <Markdown
      allowedElements={ANSWER_ELEMENTS}
      unwrapDisallowed
      skipHtml
      components={COMPONENTS}
    >
      {text}
    </Markdown>
  );
}
