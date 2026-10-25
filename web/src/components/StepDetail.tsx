import { Check, LoaderCircle, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { RetrievalGate } from "#/components/RetrievalGate";
import { Badge } from "#/components/ui/badge";
import { HOOD_COPY, WRITTEN_BARS } from "#/constants/hood.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
import { formatInt, formatMs, formatUsd } from "#/utils/format.utils";
import { splitAround, writtenBars } from "#/utils/stepDetail.utils";
import { toolList } from "#/utils/stepText.utils";
import { fill } from "#/utils/toolSteps.utils";

interface StepDetailProps {
  item: StreamEvent;
  lang: Lang;
  /** The run's model, for "Thinking with …". */
  model: string;
  /** Answer words streamed so far, of the whole answer. */
  written: { words: number; total: number };
  /** Earlier messages sent with the question. */
  carried: number;
  retrieved: string[];
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

/** The evidence under a step's title: checks, scores, tokens, cost, arguments. */
export function StepDetail({
  item,
  lang,
  model,
  written,
  carried,
  retrieved,
  focusChunk,
  onFocusChunk,
}: StepDetailProps) {
  const hood = HOOD_COPY[lang];
  const copy = hood.card;
  const { event } = item;
  const thinking = splitAround(copy.thinkingWith, "{model}");
  let body: ReactNode = null;

  switch (event.type) {
    case "request.started":
      body = (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="metric">{`${event.provider}:${event.model}`}</Badge>
          <Badge variant="metric">
            {fill(copy.prompt, { v: event.rules_version })}
          </Badge>
          {carried > 0 && (
            <Badge variant="hi">
              {fill(copy.history, { n: String(carried) })}
            </Badge>
          )}
        </div>
      );
      break;
    case "guardrails.checked": {
      body = (
        <ul className="flex flex-wrap gap-1.5">
          {event.checks.map((check, i) => (
            <li
              key={check.name}
              style={{ "--i": i } as CSSProperties}
              className="tick-in inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1.5 font-mono text-xs leading-none group-data-focus/card:text-[13px]"
            >
              {check.passed ? (
                <Check aria-hidden="true" className="size-3.5 text-ok" />
              ) : (
                <X aria-hidden="true" className="size-3.5 text-warn" />
              )}
              {check.name}
            </li>
          ))}
        </ul>
      );
      break;
    }
    case "cache.checked":
      body = (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={event.hit ? "ok" : "metric"}>
            {event.hit ? copy.cacheHit : copy.cacheMiss}
          </Badge>
          {event.similarity !== null && (
            <Badge variant="metric">{event.similarity.toFixed(2)}</Badge>
          )}
        </div>
      );
      break;
    case "llm.started":
      body = (
        <p className="flex items-center gap-2.5 text-accent text-sm">
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          <span>
            {thinking[0]}
            <code dir="ltr" className="font-medium font-mono text-sm">
              {model}
            </code>
            {thinking[1]}
          </span>
        </p>
      );
      break;
    case "llm.completed":
      body = (
        <>
          <p className="text-[0.9375rem] group-data-focus/card:text-[1.0625rem]">
            {event.decision === "tools" ? (
              <>
                {copy.decidedTools}{" "}
                <strong className="font-semibold text-accent">
                  <code
                    dir="ltr"
                    className="font-mono font-semibold text-sm group-data-focus/card:text-base"
                  >
                    {toolList(event.tools)}
                  </code>
                </strong>
              </>
            ) : (
              <strong className="font-semibold text-accent">
                {event.decision === "answer"
                  ? copy.decidedAnswer
                  : copy.decidedText}
              </strong>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="metric">{formatMs(event.duration_ms)}</Badge>
            <Badge variant="metric">
              {fill(copy.tokens, {
                in: formatInt(event.input_tokens),
                out: formatInt(event.output_tokens),
              })}
            </Badge>
            <Badge variant="metric">{formatUsd(event.cost_usd)}</Badge>
            {event.fallback && <Badge variant="warn">{copy.fallback}</Badge>}
            {event.rejected && (
              <Badge variant="warn">
                {fill(copy.rejected, { reason: event.rejected })}
              </Badge>
            )}
          </div>
        </>
      );
      break;
    case "tool.called":
      // The call as the server ran it: the most important line of the step.
      body = (
        <code
          dir="ltr"
          className="block rounded-lg bg-case/60 px-3 py-2.5 text-start font-mono text-[15px] leading-normal [overflow-wrap:anywhere] group-data-focus/card:px-4 group-data-focus/card:py-3 group-data-focus/card:text-lg"
        >
          <span className="font-semibold text-(--c)">{event.tool}</span>
          <span className="text-muted">(</span>
          {Object.entries(event.args).map(([key, value], i) => (
            <span key={key}>
              {i > 0 && <span className="text-muted">, </span>}
              <span className="text-muted">{key}=</span>
              <bdi className="text-text">{`"${value}"`}</bdi>
            </span>
          ))}
          <span className="text-muted">)</span>
        </code>
      );
      break;
    case "tool.completed":
      body = (
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            aria-hidden="true"
            className="font-mono text-(--c) text-base leading-none"
          >
            ↳
          </span>
          {event.ok && <Badge variant="ok">{copy.ok}</Badge>}
          <Badge variant={event.ok ? "metric" : "warn"}>
            {fill(copy.results, { n: String(event.result_count) })}
          </Badge>
          <Badge variant="metric">{formatMs(event.duration_ms)}</Badge>
        </div>
      );
      break;
    case "retrieval.completed":
      body = (
        <RetrievalGate
          event={event}
          lang={lang}
          focusChunk={focusChunk}
          onFocusChunk={onFocusChunk}
        />
      );
      break;
    case "generation.started":
      body = (
        <>
          <p className="flex items-baseline gap-2.5 font-medium font-mono text-[0.9375rem] text-haze leading-[1.2]">
            <b className="font-medium text-[1.75rem] text-text tabular-nums">
              {written.words}
            </b>
            {copy.wordsStreamed}
          </p>
          <div aria-hidden="true" className="flex flex-col gap-1.5">
            {writtenBars(written.words, written.total, WRITTEN_BARS).map(
              (k, line) => (
                <i
                  // biome-ignore lint/suspicious/noArrayIndexKey: the bars are a fixed set
                  key={line}
                  className="block h-2 origin-left rounded bg-linear-to-r from-haze/40 to-haze/10 transition-transform duration-300 ease-out rtl:origin-right"
                  style={{ transform: `scaleX(${k})` }}
                />
              ),
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={event.prompt_cache_hit ? "ok" : "metric"}>
              {event.prompt_cache_hit
                ? copy.promptCacheHit
                : copy.promptCacheMiss}
            </Badge>
          </div>
        </>
      );
      break;
    case "decision.made": {
      const answered = event.action === "answer";
      body = (
        <>
          <p
            dir="auto"
            className="text-[0.9375rem] group-data-focus/card:text-[1.0625rem]"
          >
            {event.reason}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={answered ? "ok" : "warn"}>
              {fill(copy.best, { s: event.best_score.toFixed(2) })}
            </Badge>
            <Badge variant="metric">
              {fill(copy.gate, { t: event.threshold.toFixed(2) })}
            </Badge>
          </div>
        </>
      );
      break;
    }
    case "citations.attached":
      if (event.citations.length === 0) break;
      body = (
        <div className="flex flex-wrap gap-1.5">
          {event.citations.map((citation) => (
            <Badge
              key={citation.chunk_id}
              variant={retrieved.includes(citation.chunk_id) ? "ok" : "warn"}
            >
              {citation.breadcrumb}
            </Badge>
          ))}
        </div>
      );
      break;
    case "error":
      body = (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="warn">{event.code}</Badge>
          <span dir="auto" className="text-muted text-sm">
            {event.message}
          </span>
        </div>
      );
      break;
    case "request.finished":
      body = (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={event.outcome === "answered" ? "ok" : "warn"}>
            {hood.status[event.outcome]}
          </Badge>
        </div>
      );
      break;
    default:
      return null;
  }

  return body;
}
