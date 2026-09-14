#!/usr/bin/env bash
set -euo pipefail

MAX_AGE_SECONDS="${1:-${STEWARD_FRESHNESS_SECONDS:-129600}}"
NOW_EPOCH="${2:-${STEWARD_NOW_EPOCH:-$(date -u +%s)}}"
MODE="${3:-probe}"
SEVERITY="${4:-P1}"
LABEL="${5:-Scheduled workflow}"

if ! [[ "$MAX_AGE_SECONDS" =~ ^[0-9]+$ ]] || ! [[ "$NOW_EPOCH" =~ ^[0-9]+$ ]]; then
  echo "freshness seconds and now epoch must be non-negative integers" >&2
  exit 2
fi
if [[ "$MODE" != "probe" && "$MODE" != "finding" ]]; then
  echo "usage: $0 [max-age-seconds] [now-epoch] [probe|finding] [severity] [label]" >&2
  exit 64
fi

emit_result() {
  local state="$1" age="$2" evidence="$3" message="$4"
  if [[ "$MODE" == "finding" ]]; then
    case "$state" in
      HEALTHY) return 0 ;;
      NEVER) printf '%s\tworkflow-freshness\t%s has no successful scheduled run evidence.\t%s\n' "$SEVERITY" "$LABEL" "$evidence" ;;
      FAILING) printf '%s\tworkflow-freshness\t%s latest scheduled run is failing.\t%s\n' "$SEVERITY" "$LABEL" "$evidence" ;;
      STALE) printf '%s\tworkflow-freshness\t%s last successful scheduled run is stale.\t%s\n' "$SEVERITY" "$LABEL" "$evidence" ;;
      INVALID) printf '%s\tworkflow-freshness\t%s has invalid scheduled-run freshness evidence.\t%s\n' "$SEVERITY" "$LABEL" "$evidence" ;;
    esac
  else
    printf '%s\t%s\t%s\t%s\n' "$state" "$age" "$evidence" "$message"
  fi
}

payload="$(cat)"
if ! jq -e 'type == "array"' >/dev/null 2>&1 <<<"$payload"; then
  echo "workflow freshness input must be a JSON array" >&2
  exit 2
fi

scheduled="$(jq '[.[] | select(.event == "schedule") | select(.status == "completed")]' <<<"$payload")"
count="$(jq 'length' <<<"$scheduled")"
if [[ "$count" -eq 0 ]]; then
  emit_result NEVER 0 "" "no completed scheduled run evidence"
  exit 0
fi

latest_conclusion="$(jq -r '.[0].conclusion // "unknown"' <<<"$scheduled")"
latest_created="$(jq -r '.[0].createdAt // ""' <<<"$scheduled")"
latest_url="$(jq -r '.[0].url // ""' <<<"$scheduled")"
last_success="$(jq -c '[.[] | select(.conclusion == "success")][0] // null' <<<"$scheduled")"

if [[ "$latest_conclusion" != "success" ]]; then
  evidence="$latest_url"
  [[ -n "$latest_created" ]] && evidence="$evidence ($latest_created)"
  emit_result FAILING 0 "$evidence" "latest scheduled run concluded $latest_conclusion"
  exit 0
fi

if [[ "$last_success" == "null" ]]; then
  emit_result NEVER 0 "" "no successful scheduled run evidence"
  exit 0
fi

success_created="$(jq -r '.createdAt // ""' <<<"$last_success")"
success_url="$(jq -r '.url // ""' <<<"$last_success")"
if [[ -z "$success_created" ]]; then
  emit_result NEVER 0 "$success_url" "last successful scheduled run has no timestamp"
  exit 0
fi

success_epoch="$(date -u -d "$success_created" +%s 2>/dev/null || true)"
if ! [[ "$success_epoch" =~ ^[0-9]+$ ]]; then
  emit_result INVALID 0 "$success_url" "invalid last-success timestamp: $success_created"
  exit 0
fi

age="$(( NOW_EPOCH - success_epoch ))"
if (( age < 0 )); then
  age=0
fi

evidence="$success_url ($success_created)"
if (( age > MAX_AGE_SECONDS )); then
  emit_result STALE "$age" "$evidence" "last successful scheduled run is older than freshness window"
else
  emit_result HEALTHY "$age" "$evidence" "last successful scheduled run is fresh"
fi
