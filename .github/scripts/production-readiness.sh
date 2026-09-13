#!/usr/bin/env bash
set -euo pipefail

repo="${REPO:-${GITHUB_REPOSITORY:-}}"
summary="${GITHUB_STEP_SUMMARY:-}"
expected_sha="${EXPECTED_SHA:-${GITHUB_SHA:-}}"
candidate="${RELEASE_CANDIDATE:-v1.x}"
required_issues=(53 116 117 118 119 120 121 122 123 132)

write_summary() {
  [[ -n "$summary" ]] || return 0
  printf '%s\n' "$1" >> "$summary"
}

failures=0

if [[ -z "$repo" ]]; then
  echo "production readiness requires REPO or GITHUB_REPOSITORY" >&2
  exit 2
fi
if ! command -v gh >/dev/null 2>&1; then
  echo "production readiness requires GitHub CLI (gh)" >&2
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "production readiness requires jq" >&2
  exit 2
fi

write_summary "### Production readiness for $candidate"
echo "production readiness candidate=$candidate repo=$repo"

if [[ -n "${GITHUB_SHA:-}" && -n "$expected_sha" && "$GITHUB_SHA" != "$expected_sha" ]]; then
  echo "FAIL exact SHA mismatch: GITHUB_SHA=$GITHUB_SHA EXPECTED_SHA=$expected_sha" >&2
  write_summary "- FAIL exact validated SHA mismatch"
  failures=$((failures + 1))
else
  write_summary "- PASS exact validated SHA: ${expected_sha:-local/manual}"
fi

if [[ -n "${GITHUB_REF:-}" && "$GITHUB_REF" != "refs/heads/main" ]]; then
  echo "FAIL production release must run from main, got $GITHUB_REF" >&2
  write_summary "- FAIL release ref is $GITHUB_REF, expected refs/heads/main"
  failures=$((failures + 1))
else
  write_summary "- PASS release ref: ${GITHUB_REF:-local/manual}"
fi

for number in "${required_issues[@]}"; do
  json="$(gh api "repos/$repo/issues/$number")"
  state="$(jq -r '.state' <<<"$json")"
  title="$(jq -r '.title' <<<"$json")"
  url="$(jq -r '.html_url' <<<"$json")"
  if [[ "$state" == "closed" ]]; then
    echo "PASS #$number $title $url"
    write_summary "- PASS #$number — $title ($url)"
  else
    echo "FAIL #$number remains $state: $title $url" >&2
    write_summary "- FAIL #$number — $title remains $state ($url)"
    failures=$((failures + 1))
  fi
done

if [[ "$failures" -ne 0 ]]; then
  echo "production readiness blocked: $failures mandatory gate(s) unresolved" >&2
  write_summary "- RESULT: BLOCKED ($failures unresolved gate(s))"
  exit 1
fi

echo "production readiness: PASS"
write_summary "- RESULT: PASS"
