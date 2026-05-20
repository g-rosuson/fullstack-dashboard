# Scraper tool

The scraper is a **job tool** (`type: 'scraper'`) that searches Swiss job portals, extracts listing snapshots, runs a deterministic **screen** on each row, and returns per-target **results** plus a **summary** for persistence and live UI updates.

Implementation lives under [`backend/src/aop/delegator/tools/scraper/`](../../../aop/delegator/tools/scraper/). It is invoked by the [Delegator](../../../aop/delegator/index.ts) during job execution, not by HTTP handlers directly.

## Role in the job pipeline

```mermaid
flowchart TB
  subgraph jobRun [Job execution]
    delegator[Delegator.delegate]
    scraper[Scraper.execute]
    targets[Portal targets jobs-ch / job-ich]
    screen[buildScreen deterministic]
    persist[Mongo execution document]
    sse[targetFinished SSE events]
  end

  delegator --> scraper
  scraper --> targets
  targets -->|ExecutionScraperToolTargetListing[]| scraper
  scraper --> screen
  screen -->|results + summary| delegator
  delegator --> persist
  delegator --> sse
```

Each listing is stored as one **pipeline row**:

| Field on row | Stage | Status |
|--------------|-------|--------|
| `listing` | Portal scrape | Implemented (targets) |
| `screen` | Deterministic pre-LLM filter | Implemented (orchestrator) |
| `match` | LLM / criteria evaluation | Planned — see [scraper-match-step.md](./scraper-match-step.md) |

OpenAPI types: [`schemas-execution-scraper-tool.ts`](../../../shared/schemas/jobs/tools/execution/schemas-execution-scraper-tool.ts).

## Configuration

A scraper **tool** defines defaults; each **target** can override them.

| Field | Tool | Target | Resolution |
|-------|------|--------|------------|
| `keywords` | optional array (min 1 if set) | optional array (min 1 if set) | At least one side must provide keywords. Runtime merge: `[...toolKeywords, ...targetKeywords]` via [`mappers`](../../../aop/delegator/tools/scraper/mappers/index.ts). |
| `maxPages` | optional non-negative number | optional non-negative number | At least one side must provide a valid `maxPages`. Target wins when both are valid. |
| `targets` | required array | — | Each entry: `target` (`jobs-ch` \| `job-ich`), `targetId`, optional overrides. |

**HTTP validation** (create/update job): [`jobs-validators.ts`](../../jobs/validators/jobs-validators.ts) — rules **JOBS-TLR-001** / **JOBS-TLR-002** in [jobs-http-contract.md](../../../../docs/requirements/jobs-http-contract.md).

**Runtime validation** (execution): the orchestrator re-checks merged config. Missing keywords or `maxPages` yields a single error result and an empty summary (see [Error outcomes](#error-outcomes)).

## Orchestrator (`Scraper`)

File: [`scraper/index.ts`](../../../aop/delegator/tools/scraper/index.ts).

For every target in `tool.targets` (concurrent via `Promise.allSettled`):

1. **Resolve target** — kebab-case name → camelCase registry key (`jobs-ch` → `jobsCh`). Unknown names fail fast with `UNKNOWN_TARGET`.
2. **Merge config** — keywords and `maxPages` from tool + target.
3. **Run target** — `target.run(config)` returns `ExecutionScraperToolTargetListing[]`. Each target owns Playwright launch/teardown so one portal failing does not block others.
4. **Screen each listing** — `buildScreen` attaches `screen: { passed, reasonCodes }`.
5. **Summarize** — counts `passed` / `rejected` and a `reasonCounts` histogram from `reasonCodes`.
6. **Callback** — `onTargetFinish({ ...targetSettings, results, summary })` once per target.

The delegator wires `onTargetFinish` to emit `job-target-finished` events and to build the execution payload persisted to Mongo.

### Screen rules (`buildScreen`)

Deterministic checks before any LLM step. Text is **NFKD-normalized**, diacritics stripped, then lowercased for keyword checks.

| Condition | `reasonCodes` | `passed` |
|-----------|---------------|----------|
| `listing.ok === false` | `LISTING_ERROR` | `false` |
| Empty title (after trim) | `EMPTY_TITLE` | `false` if any code present |
| `text` shorter than `minTextLength` (200) | `TEXT_TOO_SHORT` | same |
| No configured keyword in title or body | `KEYWORDS_NOT_IN_TITLE_OR_TEXT` | same |
| All checks pass | `[]` | `true` |

Multiple failures accumulate in `reasonCodes`. Constants: [`scraper/constants/index.ts`](../../../aop/delegator/tools/scraper/constants/index.ts).

### Listing text cap

Successful listings persist `text` capped at **32_000** characters (`maxListingTextLength`) per target when formatting body copy. This bounds BSON size and future LLM input; targets apply the cap via [`helpers.formatListingBodyFromSections`](../../../aop/delegator/tools/scraper/helpers/index.ts).

### Retry behaviour

Passed into each target as `totalAttempts: 3` and `retryDelayMs: 1000` for navigation/scrape retries (`retryWithFixedInterval`).

## Portal targets

Registry: [`targets/index.ts`](../../../aop/delegator/tools/scraper/targets/index.ts).

| Target | Registry key | Module |
|--------|--------------|--------|
| `jobs-ch` | `jobsCh` | [`targets/jobs-ch`](../../../aop/delegator/tools/scraper/targets/jobs-ch/index.ts) |
| `job-ich` | `jobIch` | [`targets/job-ich`](../../../aop/delegator/tools/scraper/targets/job-ich/index.ts) |

Each target:

- Builds search URLs from merged keywords and paginates up to `maxPages`.
- Opens detail pages with Playwright, extracts title, plain-text body, optional `fields`, optional `postedAt`.
- Returns success rows (`ok: true`) or structured failures (`ok: false` with `error.code` / `message`).

Portal-specific selectors and URL builders stay inside the target module; shared formatting lives in [`helpers`](../../../aop/delegator/tools/scraper/helpers/index.ts).

## Execution result shape

Per target (`ExecutionScraperToolTarget`):

```ts
{
  target: 'jobs-ch' | 'job-ich',
  targetId: string,
  results: Array<{
    listing: /* success or fail discriminated by ok */,
    screen?: { passed: boolean, reasonCodes: string[] },
    match?:   /* optional — not populated by scraper today */
  }>,
  summary: {
    total: number,
    passed: number,
    rejected: number,
    reasonCounts: Record<string, number>
  }
}
```

`summary.passed` / `summary.rejected` are driven by **`screen.passed`**, not by `listing.ok` alone. A scrape failure (`ok: false`) is screened as rejected with `LISTING_ERROR`.

## Error outcomes

Orchestrator-level (single synthetic listing, `constants.summary`):

| Code | When |
|------|------|
| `UNKNOWN_TARGET` | Target name not in registry |
| `INVALID_CONFIGURATION` | Merged keywords or `maxPages` missing |

Target-level (on individual listings):

| Code | When |
|------|------|
| `NAVIGATION_FAILED` | Search or detail navigation failed after retries |
| `SCRAPE_FAILED` | Detail extraction failed |
| `TARGET_FAILED` | Unhandled target error (browser teardown) |

Screen-level (on `screen.reasonCodes`):

| Code | When |
|------|------|
| `LISTING_ERROR` | `listing.ok === false` |
| `EMPTY_TITLE` | Blank title |
| `TEXT_TOO_SHORT` | Body under 200 characters |
| `KEYWORDS_NOT_IN_TITLE_OR_TEXT` | Keyword not found in title or text |

**Note:** If `target.run()` throws, `onTargetFinish` is **not** called for that target today; the rejection is swallowed by `Promise.allSettled`. Callers should not assume one finish event per configured target until error handling is extended.

## Events and UI

- **SSE:** Each finished target emits `job-target-finished` ([`Emitter`](../../../aop/emitter/index.ts)) with the full target payload for incremental UI updates.
- **Persistence:** After all tools run, the delegator writes one execution document with tools → targets → results.
- **Frontend:** [`ScraperTarget.tsx`](../../../../../frontend/src/components/pages/jobs/components/jobDetailSheet/execution/toolPanel/scraper/ScraperTarget.tsx) renders title/URL from `results[].listing` (screen/match columns not shown yet).

## Tests

| Area | File |
|------|------|
| Orchestrator (screen, summary, config errors) | [`scraper.test.ts`](../../../aop/delegator/tools/scraper/scraper.test.ts) |
| Config mappers | [`mappers/mappers.test.ts`](../../../aop/delegator/tools/scraper/mappers/mappers.test.ts) |
| `jobs-ch` target | [`jobs-ch.test.ts`](../../../aop/delegator/tools/scraper/targets/jobs-ch/jobs-ch.test.ts) |
| `job-ich` target | [`job-ich.test.ts`](../../../aop/delegator/tools/scraper/targets/job-ich/job-ich.test.ts) |

Run:

```bash
cd backend && npm test -- --run src/aop/delegator/tools/scraper
```

## Related docs

- [Match step](./scraper-match-step.md) — planned LLM evaluation stage on each row.
- [Jobs HTTP contract](../../../../../docs/requirements/jobs-http-contract.md) — scraper tool validation on create/update.
