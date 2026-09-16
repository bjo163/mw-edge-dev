#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESOLVER="$ROOT/.github/scripts/steward-health-issue-resolver.sh"
STEWARD="$ROOT/.github/scripts/mw-edge-steward.sh"

assert_eq() {
  local expected="$1" actual="$2" name="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL %s\nexpected: %q\nactual:   %q\n' "$name" "$expected" "$actual" >&2
    exit 1
  fi
  printf 'PASS %s\n' "$name"
}

assert_contains() {
  local needle="$1" file="$2" name="$3"
  if ! grep -Fq -- "$needle" "$file"; then
    printf 'FAIL %s\nmissing: %s\n' "$name" "$needle" >&2
    exit 1
  fi
  printf 'PASS %s\n' "$name"
}

none="$(printf '%s' '[]' | "$RESOLVER")"
assert_eq $'NONE\t\t\t0\t' "$none" "no canonical issue"

one="$(cat <<'JSON' | "$RESOLVER"
[
  {"number":418,"state":"open","title":"MW EDGE AUTOMATION HEALTH"},
  {"number":419,"state":"open","title":"unrelated"},
  {"number":420,"state":"open","title":"MW EDGE AUTOMATION HEALTH","pull_request":{}}
]
JSON
)"
assert_eq $'ONE\t418\topen\t1\t' "$one" "one canonical issue ignores PRs"

duplicate="$(cat <<'JSON' | "$RESOLVER"
[
  {"number":422,"state":"closed","title":"MW EDGE AUTOMATION HEALTH"},
  {"number":418,"state":"open","title":"MW EDGE AUTOMATION HEALTH"},
  {"number":421,"state":"open","title":"other"}
]
JSON
)"
assert_eq $'DUPLICATE\t418\topen\t2\t418,422' "$duplicate" "duplicates select oldest and expose deterministic evidence"

custom="$(printf '%s' '[{"number":7,"state":"open","title":"custom health"}]' | "$RESOLVER" 'custom health')"
assert_eq $'ONE\t7\topen\t1\t' "$custom" "custom canonical title"

if printf '%s' '{"message":"Forbidden"}' | "$RESOLVER" >/dev/null 2>&1; then
  printf 'FAIL permission-shaped API payload must fail closed\n' >&2
  exit 1
fi
printf 'PASS permission-shaped API payload fails closed\n'

if printf '%s' 'not-json' | "$RESOLVER" >/dev/null 2>&1; then
  printf 'FAIL malformed API payload must fail closed\n' >&2
  exit 1
fi
printf 'PASS malformed API payload fails closed\n'

assert_contains 'steward-health-issue-resolver.sh "$HEALTH_TITLE"' "$STEWARD" "controller delegates canonical selection to resolver"
assert_contains 'Multiple canonical automation-health issues exist; Steward will update only the oldest issue.' "$STEWARD" "controller reports duplicate canonical issues"
assert_contains 'health_resolution_state" == "UNKNOWN"' "$STEWARD" "controller fails closed when canonical issue visibility is unavailable"
