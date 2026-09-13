#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-${GITHUB_REPOSITORY:-}}"
HEALTH_TITLE="${HEALTH_TITLE:-MW EDGE AUTOMATION HEALTH}"
FAIL_ON_FINDINGS="${FAIL_ON_FINDINGS:-false}"
REPORT="${RUNNER_TEMP:-/tmp}/mw-edge-steward-report.md"
FINDINGS="${RUNNER_TEMP:-/tmp}/mw-edge-steward-findings.tsv"
WORKFLOW_ROWS="${RUNNER_TEMP:-/tmp}/mw-edge-steward-workflows.md"
BLOCKED_ROWS="${RUNNER_TEMP:-/tmp}/mw-edge-steward-blocked.md"

if [[ -z "$REPO" ]]; then
  echo "REPO or GITHUB_REPOSITORY is required" >&2
  exit 2
fi

: > "$FINDINGS"
: > "$WORKFLOW_ROWS"
: > "$BLOCKED_ROWS"

add_finding() {
  local severity="$1" area="$2" message="$3" evidence="${4:-}"
  printf '%s\t%s\t%s\t%s\n' "$severity" "$area" "$message" "$evidence" >> "$FINDINGS"
}

branch_exists() {
  git ls-remote --exit-code --heads origin "$1" >/dev/null 2>&1
}

# ---------------------------------------------------------------------------
# Branch topology: main/dev are the only persistent human development refs.
# ---------------------------------------------------------------------------
branch_state="UNKNOWN"
main_sha="missing"
dev_sha="missing"

if ! branch_exists main; then add_finding P0 branch "Required branch main is missing."; fi
if ! branch_exists dev; then add_finding P0 branch "Required branch dev is missing."; fi

if branch_exists main && branch_exists dev; then
  git fetch --no-tags origin \
    +refs/heads/main:refs/remotes/origin/main \
    +refs/heads/dev:refs/remotes/origin/dev >/dev/null
  main_sha="$(git rev-parse refs/remotes/origin/main)"
  dev_sha="$(git rev-parse refs/remotes/origin/dev)"

  if [[ "$main_sha" == "$dev_sha" ]]; then
    branch_state="CLEAN"
  elif git merge-base --is-ancestor refs/remotes/origin/main refs/remotes/origin/dev; then
    branch_state="DEV_AHEAD"
  elif git merge-base --is-ancestor refs/remotes/origin/dev refs/remotes/origin/main; then
    branch_state="MAIN_AHEAD_RELEASE"
  else
    branch_state="DIVERGED"
    add_finding P0 branch "main and dev have diverged; automation must not guess a merge strategy." "main=$main_sha dev=$dev_sha"
  fi
fi

unexpected_branches="$(gh api --paginate "repos/$REPO/branches?per_page=100" --jq '.[].name' 2>/dev/null \
  | grep -Ev '^(main|dev|dependabot/.*|renovate/.*)$' || true)"
if [[ -n "$unexpected_branches" ]]; then
  add_finding P1 branch "Unexpected persistent branch(es) detected outside the main/dev policy." "$(echo "$unexpected_branches" | paste -sd ', ' -)"
fi

# ---------------------------------------------------------------------------
# Integration PR invariant.
# ---------------------------------------------------------------------------
pr_json="$(gh pr list --repo "$REPO" --state open --base main --head dev --limit 20 --json number,url,title 2>/dev/null || echo '[]')"
pr_count="$(jq 'length' <<<"$pr_json")"
pr_url="$(jq -r '.[0].url // ""' <<<"$pr_json")"

case "$branch_state" in
  DEV_AHEAD)
    if [[ "$pr_count" -eq 0 ]]; then
      add_finding P1 branch "dev is ahead of main but no open dev -> main integration PR exists."
    elif [[ "$pr_count" -gt 1 ]]; then
      add_finding P1 branch "More than one dev -> main integration PR is open." "$pr_count open PRs"
    fi
    ;;
  CLEAN)
    if [[ "$pr_count" -gt 0 ]]; then
      add_finding P1 branch "An integration PR is open even though main and dev are identical." "$pr_url"
    fi
    ;;
  MAIN_AHEAD_RELEASE)
    add_finding P1 branch "main is ahead of dev; main -> dev convergence is pending." "main=$main_sha dev=$dev_sha"
    ;;
esac

# ---------------------------------------------------------------------------
# Repository rulesets. If the token cannot verify them, report visibility loss.
# ---------------------------------------------------------------------------
rulesets_json="$(gh api "repos/$REPO/rulesets" 2>/dev/null || true)"
if [[ -z "$rulesets_json" ]]; then
  add_finding P1 policy "Steward cannot verify repository rulesets with the current token."
elif [[ "$(jq 'length' <<<"$rulesets_json")" -eq 0 ]]; then
  add_finding P0 policy "No repository ruleset is active; main/dev protection is not enforced."
fi

# ---------------------------------------------------------------------------
# Latest workflow health. Findings are based on completed failures; queued or
# running jobs are reported but are not treated as failures.
# ---------------------------------------------------------------------------
check_workflow() {
  local workflow="$1" severity="$2" label="$3"
  local json status conclusion url created head event
  json="$(gh run list --repo "$REPO" --workflow "$workflow" --limit 1 \
    --json status,conclusion,url,createdAt,headSha,event 2>/dev/null || echo '[]')"

  if [[ "$(jq 'length' <<<"$json")" -eq 0 ]]; then
    printf '| `%s` | no run | — | — |\n' "$workflow" >> "$WORKFLOW_ROWS"
    add_finding "$severity" workflow "$label has no workflow run evidence yet." "$workflow"
    return
  fi

  status="$(jq -r '.[0].status // "unknown"' <<<"$json")"
  conclusion="$(jq -r '.[0].conclusion // "pending"' <<<"$json")"
  url="$(jq -r '.[0].url // ""' <<<"$json")"
  created="$(jq -r '.[0].createdAt // ""' <<<"$json")"
  head="$(jq -r '.[0].headSha // ""' <<<"$json")"
  event="$(jq -r '.[0].event // ""' <<<"$json")"
  printf '| `%s` | %s/%s | `%s` | [%s](%s) |\n' "$workflow" "$status" "$conclusion" "${head:0:12}" "$event" "$url" >> "$WORKFLOW_ROWS"

  if [[ "$status" == "completed" && "$conclusion" != "success" && "$conclusion" != "skipped" && "$conclusion" != "neutral" ]]; then
    add_finding "$severity" workflow "$label latest run concluded $conclusion." "$url ($created)"
  fi
}

check_workflow ci.yml P0 "CI"
check_workflow codeql.yml P0 "CodeQL"
check_workflow scorecard.yml P0 "OpenSSF Scorecard"
check_workflow sync-main-to-dev.yml P0 "main -> dev synchronization"
check_workflow ensure-dev-pr.yml P1 "dev -> main PR automation"
check_workflow governance.yml P1 "Governance automation"
check_workflow project-sync.yml P1 "Project synchronization"
check_workflow workflow-security.yml P0 "Workflow security"
check_workflow nightly.yml P1 "Nightly lifecycle"

# ---------------------------------------------------------------------------
# Blocked P0/P1 issues are operational signals. This also surfaces settings or
# secrets that cannot be introspected directly (for example PROJECT_TOKEN).
# ---------------------------------------------------------------------------
issues_json="$(gh issue list --repo "$REPO" --state open --limit 300 --json number,title,url,labels 2>/dev/null || echo '[]')"
while IFS=$'\t' read -r number priority title url; do
  [[ -n "$number" ]] || continue
  printf '| #%s | %s | [%s](%s) |\n' "$number" "$priority" "$title" "$url" >> "$BLOCKED_ROWS"
  if [[ "$number" != "129" ]]; then
    add_finding "$priority" blocker "Blocked $priority issue #$number: $title" "$url"
  fi
done < <(jq -r '
  .[]
  | (.labels | map(.name)) as $labels
  | select($labels | index("status:blocked"))
  | (["priority:P0","priority:P1"] | map(select(. as $p | $labels | index($p))) | .[0] // empty) as $priority
  | select($priority != "")
  | [.number, ($priority | sub("priority:"; "")), .title, .url]
  | @tsv
' <<<"$issues_json")

# Dependabot backlog signal: do not mutate or merge PRs here.
now_epoch="$(date -u +%s)"
stale_dependabot=0
while IFS=$'\t' read -r created url; do
  [[ -n "$created" ]] || continue
  created_epoch="$(date -u -d "$created" +%s 2>/dev/null || echo "$now_epoch")"
  age_days="$(( (now_epoch - created_epoch) / 86400 ))"
  if (( age_days >= 7 )); then stale_dependabot=$((stale_dependabot + 1)); fi
done < <(gh pr list --repo "$REPO" --state open --limit 200 --json author,createdAt,url \
  --jq '.[] | select(.author.login == "dependabot[bot]") | [.createdAt,.url] | @tsv' 2>/dev/null || true)
if (( stale_dependabot > 0 )); then
  add_finding P1 dependency "$stale_dependabot Dependabot PR(s) have been open for at least 7 days."
fi

# ---------------------------------------------------------------------------
# Compose deterministic report.
# ---------------------------------------------------------------------------
p0="$(awk -F '\t' '$1=="P0"{n++} END{print n+0}' "$FINDINGS")"
p1="$(awk -F '\t' '$1=="P1"{n++} END{print n+0}' "$FINDINGS")"
total="$((p0 + p1))"
health="HEALTHY"
[[ "$p1" -gt 0 ]] && health="DEGRADED"
[[ "$p0" -gt 0 ]] && health="BLOCKED"
checked_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
run_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-$REPO}/actions/runs/${GITHUB_RUN_ID:-0}"

{
  echo "# MW EDGE AUTOMATION HEALTH"
  echo
  echo "> Managed by \`mw-edge-steward\`. Do not create duplicate health issues; this issue is updated in place."
  echo
  echo "**State:** $health  "
  echo "**Checked:** $checked_at  "
  echo "**Branch state:** \`$branch_state\`  "
  echo "**Findings:** P0=$p0 · P1=$p1  "
  echo "**Steward run:** $run_url"
  echo
  echo "## Branch topology"
  echo
  echo "| Ref | SHA |"
  echo "|---|---|"
  echo "| main | \`${main_sha:0:12}\` |"
  echo "| dev | \`${dev_sha:0:12}\` |"
  echo "| integration PRs | $pr_count |"
  echo
  echo "## Workflow signals"
  echo
  echo "| Workflow | State | Head | Event |"
  echo "|---|---|---|---|"
  cat "$WORKFLOW_ROWS"
  echo
  echo "## Findings"
  echo
  if [[ "$total" -eq 0 ]]; then
    echo "✅ No mandatory automation-health findings."
  else
    while IFS=$'\t' read -r severity area message evidence; do
      if [[ -n "$evidence" ]]; then
        echo "- **$severity · $area** — $message — $evidence"
      else
        echo "- **$severity · $area** — $message"
      fi
    done < "$FINDINGS"
  fi
  echo
  echo "## Blocked delivery issues"
  echo
  if [[ -s "$BLOCKED_ROWS" ]]; then
    echo "| Issue | Priority | Title |"
    echo "|---|---|---|"
    cat "$BLOCKED_ROWS"
  else
    echo "No blocked P0/P1 issues detected."
  fi
  echo
  echo "## Steward safety contract"
  echo
  echo "- Read repository/workflow/PR state."
  echo "- Maintain this one canonical health issue."
  echo "- Never merge or approve PRs."
  echo "- Never push or force-push \`main\` or \`dev\`."
  echo "- Never modify tracked application source code."
} > "$REPORT"

cat "$REPORT"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then cat "$REPORT" >> "$GITHUB_STEP_SUMMARY"; fi

# ---------------------------------------------------------------------------
# Upsert exactly one canonical health issue and close/reopen it with health.
# ---------------------------------------------------------------------------
health_number="$(gh api --paginate "repos/$REPO/issues?state=all&per_page=100" --jq ".[] | select(has(\"pull_request\")|not) | select(.title == \"$HEALTH_TITLE\") | .number" 2>/dev/null | head -n1 || true)"
if [[ -z "$health_number" ]]; then
  health_url="$(gh issue create --repo "$REPO" --title "$HEALTH_TITLE" --body-file "$REPORT")"
  health_number="${health_url##*/}"
fi

gh issue edit "$health_number" --repo "$REPO" --body-file "$REPORT" >/dev/null
# Labels are best-effort so a governance outage cannot prevent health reporting.
gh issue edit "$health_number" --repo "$REPO" --add-label "area:ops,type:task" >/dev/null 2>&1 || true
gh issue edit "$health_number" --repo "$REPO" --remove-label "priority:P0,priority:P1" >/dev/null 2>&1 || true
if [[ "$p0" -gt 0 ]]; then
  gh issue edit "$health_number" --repo "$REPO" --add-label "priority:P0" >/dev/null 2>&1 || true
elif [[ "$p1" -gt 0 ]]; then
  gh issue edit "$health_number" --repo "$REPO" --add-label "priority:P1" >/dev/null 2>&1 || true
fi

issue_state="$(gh issue view "$health_number" --repo "$REPO" --json state --jq '.state')"
if [[ "$total" -gt 0 ]]; then
  if [[ "$issue_state" != "OPEN" ]]; then gh issue reopen "$health_number" --repo "$REPO" >/dev/null; fi
else
  if [[ "$issue_state" == "OPEN" ]]; then gh issue close "$health_number" --repo "$REPO" --reason completed >/dev/null; fi
fi

echo "Steward state=$health issue=#$health_number findings=$total"

if [[ "$FAIL_ON_FINDINGS" == "true" && "$total" -gt 0 ]]; then
  exit 1
fi
