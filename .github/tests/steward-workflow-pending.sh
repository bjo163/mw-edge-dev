#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANALYZER="$ROOT/.github/scripts/steward-workflow-history.sh"

payload='[
  {"status":"completed","conclusion":"success","url":"new-success","createdAt":"2026-09-16T04:00:00Z","event":"schedule"},
  {"status":"in_progress","conclusion":null,"url":"pending","createdAt":"2026-09-16T03:30:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"older-success","createdAt":"2026-09-16T03:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"old-failure-1","createdAt":"2026-09-16T02:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"old-failure-2","createdAt":"2026-09-16T01:00:00Z","event":"schedule"}
]'

actual="$(printf '%s' "$payload" | "$ANALYZER" 2 2 | cut -f1)"
if [[ "$actual" != "HEALTHY" ]]; then
  echo "pending scheduled run must not interrupt a completed recovery streak: got $actual" >&2
  exit 1
fi

bash -n "$ANALYZER" "$0"
echo "steward pending scheduled-run fixture: ok"
