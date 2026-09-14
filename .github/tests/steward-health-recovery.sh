#!/usr/bin/env bash
set -euo pipefail

SCRIPT="${SCRIPT:-/tmp/steward-recovery-evidence.sh}"

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$expected" != "$actual" ]]; then
    printf 'FAIL %s\nexpected: %q\nactual:   %q\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
}

blocked='**State:** BLOCKED  
**Checked:** 2026-09-14T06:00:00Z  '
actual="$(printf '%s\n' "$blocked" | bash "$SCRIPT" HEALTHY)"
assert_eq 'Recovered from BLOCKED after previous unhealthy check at 2026-09-14T06:00:00Z.' "$actual" 'blocked recovery'

degraded='**State:** DEGRADED  
**Checked:** 2026-09-14T06:30:00Z  '
actual="$(printf '%s\n' "$degraded" | bash "$SCRIPT" HEALTHY)"
assert_eq 'Recovered from DEGRADED after previous unhealthy check at 2026-09-14T06:30:00Z.' "$actual" 'degraded recovery'

healthy='**State:** HEALTHY  
**Checked:** 2026-09-14T07:00:00Z  
**Recovery:** Recovered from DEGRADED after previous unhealthy check at 2026-09-14T06:30:00Z.'
actual="$(printf '%s\n' "$healthy" | bash "$SCRIPT" HEALTHY)"
assert_eq 'Recovered from DEGRADED after previous unhealthy check at 2026-09-14T06:30:00Z.' "$actual" 'preserve recovery'

actual="$(printf '%s\n' "$blocked" | bash "$SCRIPT" DEGRADED)"
assert_eq '' "$actual" 'clear recovery on regression'

if printf '%s\n' "$healthy" | bash "$SCRIPT" UNKNOWN >/dev/null 2>&1; then
  echo 'FAIL invalid state accepted' >&2
  exit 1
fi

echo 'PASS steward recovery evidence fixtures'
