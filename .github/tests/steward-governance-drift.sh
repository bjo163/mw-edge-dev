#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROBE="$ROOT/.github/scripts/steward-governance-drift.sh"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

assert_eq() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL %s\nexpected: %q\nactual:   %q\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
  printf 'PASS %s\n' "$label"
}

cat > "$tmp/healthy.sh" <<'SH'
#!/usr/bin/env bash
echo 'governance drift check: ok'
SH

cat > "$tmp/drift.sh" <<'SH'
#!/usr/bin/env bash
echo 'missing label: priority:P1' >&2
echo 'missing milestone: V0.2 — Platform Hardening' >&2
exit 1
SH

cat > "$tmp/tooling.sh" <<'SH'
#!/usr/bin/env bash
echo 'HTTP 403: Resource not accessible by integration' >&2
exit 1
SH

healthy="$(GOVERNANCE_CHECK_SCRIPT="$tmp/healthy.sh" bash "$PROBE" probe)"
assert_eq $'HEALTHY\tgovernance catalog matches required labels and milestones' "$healthy" 'healthy probe'

healthy_finding="$(GOVERNANCE_CHECK_SCRIPT="$tmp/healthy.sh" bash "$PROBE" finding)"
assert_eq '' "$healthy_finding" 'healthy emits no finding'

drift="$(GOVERNANCE_CHECK_SCRIPT="$tmp/drift.sh" bash "$PROBE" finding)"
assert_eq $'P1\tgovernance\tRequired governance catalog drift detected.\tmissing label: priority:P1 missing milestone: V0.2 — Platform Hardening' "$drift" 'drift finding'

tooling="$(GOVERNANCE_CHECK_SCRIPT="$tmp/tooling.sh" bash "$PROBE" finding)"
assert_eq $'P1\tgovernance\tGovernance drift probe could not complete.\tHTTP 403: Resource not accessible by integration' "$tooling" 'tooling failure finding'

missing="$(GOVERNANCE_CHECK_SCRIPT="$tmp/does-not-exist.sh" bash "$PROBE" probe)"
assert_eq $'TOOLING\tgovernance check script is unavailable: '"$tmp"$'/does-not-exist.sh' "$missing" 'missing script is tooling failure'

bash -n "$PROBE" "$0"
