#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANALYZER="$ROOT/.github/scripts/steward-workflow-history.sh"

run_case() {
  local name="$1" expected="$2" payload="$3"
  local actual
  actual="$(printf '%s' "$payload" | "$ANALYZER" 2 2 | cut -f1)"
  if [[ "$actual" != "$expected" ]]; then
    echo "$name: expected $expected, got $actual" >&2
    exit 1
  fi
}

run_case repeated REPEATED '[
  {"status":"completed","conclusion":"success","url":"u1","createdAt":"2026-09-14T04:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"u2","createdAt":"2026-09-14T03:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"u3","createdAt":"2026-09-14T02:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"u4","createdAt":"2026-09-14T01:00:00Z","event":"schedule"}
]'

run_case transient HEALTHY '[
  {"status":"completed","conclusion":"success","url":"u1","createdAt":"2026-09-14T04:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"u2","createdAt":"2026-09-14T03:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"u3","createdAt":"2026-09-14T02:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"u4","createdAt":"2026-09-14T01:00:00Z","event":"schedule"}
]'

run_case recovered HEALTHY '[
  {"status":"completed","conclusion":"failure","url":"u3","createdAt":"2026-09-14T02:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"u1","createdAt":"2026-09-14T04:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"u4","createdAt":"2026-09-14T01:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"u2","createdAt":"2026-09-14T03:00:00Z","event":"schedule"}
]'

run_case ignores_manual HEALTHY '[
  {"status":"completed","conclusion":"failure","url":"u1","createdAt":"2026-09-14T04:00:00Z","event":"workflow_dispatch"},
  {"status":"completed","conclusion":"success","url":"u2","createdAt":"2026-09-14T03:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"u3","createdAt":"2026-09-14T02:00:00Z","event":"schedule"}
]'

run_case unordered_history REPEATED '[
  {"status":"completed","conclusion":"success","url":"old-success-1","createdAt":"2026-09-14T01:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"new-failure-1","createdAt":"2026-09-14T04:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"old-success-2","createdAt":"2026-09-14T02:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"new-failure-2","createdAt":"2026-09-14T03:00:00Z","event":"schedule"}
]'

echo "steward workflow history fixtures: ok"
