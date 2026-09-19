#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANALYZER="$ROOT/.github/scripts/steward-workflow-history.sh"

payload='[
  {"status":"completed","conclusion":"failure","url":"old-failure-1","createdAt":"2026-09-14T01:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"failure","url":"old-failure-2","createdAt":"2026-09-14T00:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"new-success-1","createdAt":"2026-09-14T04:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"cancelled","url":"cancelled","createdAt":"2026-09-14T03:00:00Z","event":"schedule"},
  {"status":"completed","conclusion":"success","url":"new-success-2","createdAt":"2026-09-14T02:00:00Z","event":"schedule"}
]'

actual="$(printf '%s' "$payload" | "$ANALYZER" 2 2 | cut -f1)"
if [[ "$actual" != "HEALTHY" ]]; then
  echo "cancelled scheduled run must not erase recovery evidence: got $actual" >&2
  exit 1
fi

bash -n "$ANALYZER" "$0"
echo "steward cancelled workflow history fixture: ok"
