#!/usr/bin/env bash
set -euo pipefail

MAX_AGE_SECONDS="${1:-${STEWARD_FRESHNESS_SECONDS:-129600}}"
NOW_EPOCH="${2:-${STEWARD_NOW_EPOCH:-$(date -u +%s)}}"

if ! [[ "$MAX_AGE_SECONDS" =~ ^[0-9]+$ ]] || ! [[ "$NOW_EPOCH" =~ ^[0-9]+$ ]]; then
  echo "freshness seconds and now epoch must be non-negative integers" >&2
  exit 2
fi

payload="$(cat)"
if ! jq -e 'type == "array"' >/dev/null 2>&1 <<<"$payload"; then
  echo "workflow freshness input must be a JSON array" >&2
  exit 2
fi

scheduled="$(jq '[.[] | select(.event == "schedule") | select(.status == "completed")]' <<<"$payload")"
count="$(jq 'length' <<<"$scheduled")"
if [[ "$count" -eq 0 ]]; then
  printf 'NEVER\t0\t\tno completed scheduled run evidence\n'
  exit 0
fi

latest_conclusion="$(jq -r '.[0].conclusion // "unknown"' <<<"$scheduled")"
latest_created="$(jq -r '.[0].createdAt // ""' <<<"$scheduled")"
latest_url="$(jq -r '.[0].url // ""' <<<"$scheduled")"
last_success="$(jq -c '[.[] | select(.conclusion == "success")][0] // null' <<<"$scheduled")"

if [[ "$latest_conclusion" != "success" ]]; then
  evidence="$latest_url"
  [[ -n "$latest_created" ]] && evidence="$evidence ($latest_created)"
  printf 'FAILING\t0\t%s\tlatest scheduled run concluded %s\n' "$evidence" "$latest_conclusion"
  exit 0
fi

if [[ "$last_success" == "null" ]]; then
  printf 'NEVER\t0\t\tno successful scheduled run evidence\n'
  exit 0
fi

success_created="$(jq -r '.createdAt // ""' <<<"$last_success")"
success_url="$(jq -r '.url // ""' <<<"$last_success")"
if [[ -z "$success_created" ]]; then
  printf 'NEVER\t0\t%s\tlast successful scheduled run has no timestamp\n' "$success_url"
  exit 0
fi

success_epoch="$(date -u -d "$success_created" +%s 2>/dev/null || true)"
if ! [[ "$success_epoch" =~ ^[0-9]+$ ]]; then
  printf 'INVALID\t0\t%s\tinvalid last-success timestamp: %s\n' "$success_url" "$success_created"
  exit 0
fi

age="$(( NOW_EPOCH - success_epoch ))"
if (( age < 0 )); then
  age=0
fi

evidence="$success_url ($success_created)"
if (( age > MAX_AGE_SECONDS )); then
  printf 'STALE\t%s\t%s\tlast successful scheduled run is older than freshness window\n' "$age" "$evidence"
else
  printf 'HEALTHY\t%s\t%s\tlast successful scheduled run is fresh\n' "$age" "$evidence"
fi
