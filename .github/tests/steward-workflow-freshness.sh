#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANALYZER="$ROOT/.github/scripts/steward-workflow-freshness.sh"
NOW=1789344000
DAY=86400

run_case() {
  local name="$1" expected="$2" max_age="$3" payload="$4"
  local actual
  actual="$(printf '%s' "$payload" | "$ANALYZER" "$max_age" "$NOW" | cut -f1)"
  if [[ "$actual" != "$expected" ]]; then
    echo "$name: expected $expected, got $actual" >&2
    exit 1
  fi
}

run_case never NEVER "$((2 * DAY))" '[]'

run_case ignores_manual NEVER "$((2 * DAY))" '[
  {"status":"completed","conclusion":"success","url":"manual","createdAt":"2026-09-13T00:00:00Z","event":"workflow_dispatch"}
]'

run_case active_failure FAILING "$((2 * DAY))" '[
  {"status":"completed","conclusion":"failure","url":"fail","createdAt":"2026-09-14T00:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"old-success","createdAt":"2026-09-13T00:00:00Z","event":"schedule"}
]'

run_case nightly_fresh HEALTHY "$((2 * DAY))" '[
  {"status":"completed","conclusion":"success","url":"fresh","createdAt":"2026-09-13T22:00:00Z","event":"schedule"}
]'

run_case nightly_stale STALE "$((2 * DAY))" '[
  {"status":"completed","conclusion":"success","url":"stale","createdAt":"2026-09-10T00:00:00Z","event":"schedule"}
]'

run_case weekly_fresh HEALTHY "$((9 * DAY))" '[
  {"status":"completed","conclusion":"success","url":"weekly","createdAt":"2026-09-07T00:00:00Z","event":"schedule"}
]'

run_case recovered HEALTHY "$((2 * DAY))" '[
  {"status":"completed","conclusion":"success","url":"recovered","createdAt":"2026-09-13T22:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"prior-failure","createdAt":"2026-09-13T00:00:00Z","event":"schedule"}
]'

echo "steward workflow freshness fixtures: ok"
