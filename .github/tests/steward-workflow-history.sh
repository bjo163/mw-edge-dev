#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANALYZER="$ROOT/.github/scripts/steward-workflow-history.sh"
CONTROLLER="$ROOT/.github/scripts/mw-edge-steward.sh"

run_case() {
  local name="$1" expected="$2" payload="$3"
  local actual
  actual="$(printf '%s' "$payload" | "$ANALYZER" 2 2 | cut -f1)"
  if [[ "$actual" != "$expected" ]]; then
    echo "$name: expected $expected, got $actual" >&2
    exit 1
  fi
}

assert_controller_has() {
  local label="$1" pattern="$2"
  if ! grep -Fq -- "$pattern" "$CONTROLLER"; then
    echo "$label: controller wiring missing: $pattern" >&2
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

assert_controller_has 'plugin-lock probe' 'steward-plugin-lock.sh finding'
assert_controller_has 'governance probe' 'steward-governance-drift.sh finding'
assert_controller_has 'CodeQL scheduled history' 'check_scheduled_history codeql.yml P0 "CodeQL"'
assert_controller_has 'Scorecard scheduled history' 'check_scheduled_history scorecard.yml P0 "OpenSSF Scorecard"'
assert_controller_has 'workflow-security scheduled history' 'check_scheduled_history workflow-security.yml P0 "Workflow security"'
assert_controller_has 'nightly scheduled history' 'check_scheduled_history nightly.yml P1 "Nightly lifecycle"'
assert_controller_has 'canonical health resolver' 'steward-health-issue-resolver.sh "$HEALTH_TITLE"'
assert_controller_has 'recovery evidence' 'steward-recovery-evidence.sh "$health"'
assert_controller_has 'visibility fail-closed guard' 'if [[ "$health_resolution_state" == "UNKNOWN" ]]'

bash -n "$ANALYZER" "$CONTROLLER" "$0"
echo "steward workflow history and controller wiring fixtures: ok"
