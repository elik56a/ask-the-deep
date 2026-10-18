# 0008. Spend capped at $5 a month

Date: 2026-10-19 · Status: accepted

## Context

The spec suggested a $2 daily cap, which allows up to about $60 a month. The owner's limit is $5 a month in total. The spec also asks for a per-IP cap but gives no value.

## Decision

Three caps, all counted in DynamoDB at paid list prices (ADR 0006):

| Cap | Default | Purpose |
|---|---|---|
| `MONTHLY_BUDGET_USD` | $5 | The hard limit; the kill switch for the rest of the month |
| `DAILY_BUDGET_USD` | $0.50 | One bad day can't burn the whole month |
| `VISITOR_DAILY_BUDGET_USD` | $0.05 | One visitor can use at most 10% of a day |

A question runs only if all three are under their cap. Its real cost is added to all three afterwards. If DynamoDB can't be read, questions are refused.

## Consequences

- The worst month costs about $5 plus a few cents of overshoot from parallel questions.
- While on Gemini's free tier the real bill is $0; the caps then only measure usage.
- The AWS budget alarm (Terraform, $5) is a second, independent alarm for the whole account.
