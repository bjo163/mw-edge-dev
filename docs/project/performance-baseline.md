# Production performance baseline

MW Edge treats performance evidence as a regression budget, not a throughput claim. Results are meaningful only with the exact revision, Node version, runner class, profile, and thresholds recorded alongside them.

## Baseline workloads

[scripts/perf-baseline.ts](../../scripts/perf-baseline.ts) measures three representative paths against the standalone profile:

- cold in-memory runtime/profile startup;
- 1,000 full metadata field scans, representing metadata-driven UI preparation; and
- 100 ORM writes followed by primary-reference reads.

The default regression budgets are 5,000 ms startup, 500 ms metadata scan, and 3,000 ms ORM write/read. They are intentionally broad enough for shared CI runners but narrow enough to catch order-of-magnitude regressions. CI may override them with the documented `MW_PERF_*_MAX_MS` environment variables when a stable runner class has a tighter historical baseline.

A run exits nonzero when any budget is exceeded and emits structured JSON with methodology, metrics, thresholds, and individual checks.

## Interpretation

Do not compare raw requests-per-second from different machines. A threshold change requires a recorded reason and a new evidence run; raising a threshold only to make a failing build green is not acceptable production evidence.
