#!/usr/bin/env bash
set -euo pipefail

ensure_label() {
  local name="$1" color="$2" description="$3"
  local encoded
  encoded="$(jq -rn --arg v "$name" '$v|@uri')"
  gh api "repos/$REPO/labels/$encoded" >/dev/null 2>&1 || gh api -X POST "repos/$REPO/labels" -f name="$name" -f color="$color" -f description="$description" >/dev/null
}

while IFS='|' read -r name color description; do
  ensure_label "$name" "$color" "$description"
done <<'LABELS'
type:task|5319E7|Small executable task
type:feature|1D76DB|Feature or capability
type:bug|D73A4A|Defect
priority:P0|B60205|Release blocker
priority:P1|D93F0B|High priority
priority:P2|FBCA04|Normal priority
priority:P3|C5DEF5|Future or low priority
area:kernel|6F42C1|Kernel and core contracts
area:domain|7057FF|Business domain semantics
area:orm|0E8A16|Native ORM
area:db|0052CC|Database and persistence
area:migration|006B75|Migrations and schema evolution
area:seed|2F855A|Base reference and demo data
area:plugin|8B5CF6|Plugin addon and profile system
area:ui|C2E0C6|Metadata driven UI
area:api|0366D6|HTTP API and contracts
area:security|D4C5F9|Security and authorization boundaries
area:ops|0B7285|Operations backup and observability
area:testing|1F6FEB|Tests and release gates
area:release|A2EEEF|Release and version automation
parallel-safe|BFDADC|Safe to execute in parallel
status:blocked|000000|Blocked by dependency
good first issue|7057FF|Small isolated task
LABELS

ensure_milestone() {
  local title="$1" description="$2"
  local number
  number="$(gh api --paginate "repos/$REPO/milestones?state=all&per_page=100" --jq ".[] | select(.title == \"$title\") | .number" | head -n1)"
  if [ -z "$number" ]; then gh api -X POST "repos/$REPO/milestones" -f title="$title" -f description="$description" >/dev/null; fi
}
ensure_milestone "V0.1 — Business Engine Ready" "Typed domain commands lifecycle deterministic migrations seeds reset and standalone release gate."
ensure_milestone "V0.2 — Platform Hardening" "Authorization integration outbox API SDK observability backup restore and operational hardening."
ensure_milestone "V0.3 — Cloud & Extensibility" "D1 adapter signed plugin supply chain and future WASM WIT extension seam."
ensure_milestone "V1.0 — Production" "Production ecosystem provider integrations and stable extension contracts."

if [ "${GITHUB_EVENT_NAME:-}" != "issues" ]; then exit 0; fi
issue="$(jq -r '.issue.number // empty' "$GITHUB_EVENT_PATH")"
body="$(jq -r '.issue.body // ""' "$GITHUB_EVENT_PATH")"
[ -n "$issue" ] || exit 0
milestone="$(printf '%s\n' "$body" | sed -n 's/^Milestone:[[:space:]]*//p' | head -n1)"
labels="$(printf '%s\n' "$body" | sed -n 's/^Labels:[[:space:]]*//p' | head -n1)"

if [ -n "$milestone" ]; then
  number="$(gh api --paginate "repos/$REPO/milestones?state=all&per_page=100" --jq ".[] | select(.title == \"$milestone\") | .number" | head -n1)"
  [ -z "$number" ] || gh api -X PATCH "repos/$REPO/issues/$issue" -F milestone="$number" >/dev/null
fi

if [ -n "$labels" ]; then
  IFS=',' read -ra parts <<< "$labels"
  args=()
  for part in "${parts[@]}"; do
    label="$(echo "$part" | xargs)"
    [ -z "$label" ] || args+=("-f" "labels[]=$label")
  done
  [ "${#args[@]}" -eq 0 ] || gh api -X POST "repos/$REPO/issues/$issue/labels" "${args[@]}" >/dev/null
fi
