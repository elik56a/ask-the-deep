import type { ReactNode } from "react";
import { RetrievalGate } from "#/components/RetrievalGate";
import { StepIcon } from "#/components/StepIcon";
import { Badge } from "#/components/ui/badge";
import { CHAT_COPY } from "#/constants/chat.constants";
import { HOOD_COPY } from "#/constants/hood.constants";
import type { StreamEvent } from "#/generated/events.gen";
import type { Lang } from "#/types/i18n.types";
import { formatInt, formatMs, formatUsd } from "#/utils/format.utils";
import { toolList } from "#/utils/stepText.utils";
import { fill } from "#/utils/toolSteps.utils";

interface StepDetailProps {
  item: StreamEvent;
  lang: Lang;
  retrieved: string[];
  focusChunk: string | null;
  onFocusChunk: (chunkId: string | null) => void;
}

/** The evidence under a step's title: checks, scores, tokens, cost, arguments. */
export function StepDetail({
  item,
  lang,
  retrieved,
  focusChunk,
  onFocusChunk,
}: StepDetailProps) {
  const hood = HOOD_COPY[lang];
  const copy = hood.card;
  const { event } = item;
  let body: ReactNode = null;

  switch (event.type) {
    case "request.started":
      body = (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="metric">{`${event.provider}:${event.model}`}</Badge>
          <Badge variant="metric">{`rules ${event.rules_version}`}</Badge>
        </div>
      );
      break;
    case "guardrails.checked": {
      body = (
        <ul className="flex flex-wrap gap-1.5">
          {event.checks.map((check) => (
            <li
              key={check.name}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-1.5 py-1 font-mono text-xs leading-none"
            >
              <span className={check.passed ? "text-ok" : "text-warn"}>
                {check.passed ? "✓" : "✕"}
              </span>
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
        <p className="flex items-center gap-2.5 text-muted text-sm">
          <span className="grid size-4 place-items-center">
            <StepIcon state="running" />
          </span>
          {CHAT_COPY[lang].thinking}
        </p>
      );
      break;
    case "llm.completed":
      body = (
        <>
          <p className="text-sm">
            {event.decision === "tools" ? (
              <>
                {copy.decidedTools}{" "}
                <strong className="font-semibold text-accent">
                  {toolList(event.tools)}
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
            <Badge variant="metric">{event.model}</Badge>
            <Badge variant="metric">{formatMs(event.duration_ms)}</Badge>
            <Badge variant="metric">{`${formatInt(event.input_tokens)} → ${formatInt(event.output_tokens)}`}</Badge>
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
      if (Object.keys(event.args).length === 0) break;
      body = (
        <dl className="overflow-x-auto rounded-lg bg-sunk px-2.5 py-2 text-[13px]">
          {Object.entries(event.args).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <dt className="font-mono text-muted">{key}:</dt>
              <dd dir="auto" className="font-mono">{`"${value}"`}</dd>
            </div>
          ))}
        </dl>
      );
      break;
    case "tool.completed":
      body = (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={event.ok ? "ok" : "warn"}>
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
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={event.prompt_cache_hit ? "ok" : "metric"}>
            {event.prompt_cache_hit
              ? copy.promptCacheHit
              : copy.promptCacheMiss}
          </Badge>
        </div>
      );
      break;
    case "decision.made": {
      const answered = event.action === "answer";
      body = (
        <>
          <p dir="auto" className="text-muted text-sm">
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
    case "citations.attached": {
      const matched = event.citations.filter((citation) =>
        retrieved.includes(citation.chunk_id),
      ).length;
      body = (
        <div className="flex flex-wrap gap-1.5">
          {event.citations.length > 0 ? (
            <Badge variant={matched === event.citations.length ? "ok" : "warn"}>
              {fill(copy.citationsMatched, {
                m: String(matched),
                n: String(event.citations.length),
              })}
            </Badge>
          ) : (
            <Badge variant="metric">{copy.noCitations}</Badge>
          )}
        </div>
      );
      break;
    }
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
