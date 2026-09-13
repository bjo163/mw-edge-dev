#!/usr/bin/env bash
set -euo pipefail

summary="${GITHUB_STEP_SUMMARY:-}"
expected_sha="${EXPECTED_SHA:-$(git rev-parse HEAD)}"

write_summary() {
  [[ -n "$summary" ]] || return 0
  printf '%s\n' "$1" >> "$summary"
}

git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main +refs/heads/dev:refs/remotes/origin/dev
git fetch --tags origin
main_sha="$(git rev-parse origin/main)"
dev_sha="$(git rev-parse origin/dev)"

# A workflow rerun after a successful release must be a safe no-op.
if [[ "$main_sha" != "$expected_sha" ]]; then
  parent="$(git rev-parse "$main_sha^" 2>/dev/null || true)"
  tag="$(git tag --points-at "$main_sha" --list 'v*' | head -n1)"
  subject="$(git log -1 --pretty=%s "$main_sha" 2>/dev/null || true)"
  if [[ "$parent" == "$expected_sha" && "$subject" == chore\(release\):* && -n "$tag" ]]; then
    if gh release view "$tag" >/dev/null 2>&1; then
      write_summary "- PASS release already exists: $tag at $main_sha for validated $expected_sha"
      echo "release already exists: $tag"
      exit 0
    fi
  fi
  echo "validated SHA $expected_sha is no longer origin/main ($main_sha)" >&2
  exit 1
fi

head_sha="$(git rev-parse HEAD)"
[[ "$head_sha" == "$expected_sha" ]] || { echo "HEAD $head_sha does not match validated SHA $expected_sha" >&2; exit 1; }

state="$(bash .github/scripts/branch-state.sh origin/main origin/dev)"
if [[ "$state" != "CLEAN" && "$state" != "MAIN_AHEAD_RELEASE" ]]; then
  echo "release blocked by branch state $state (main=$main_sha dev=$dev_sha)" >&2
  write_summary "- FAIL release blocked: branch state $state"
  exit 1
fi

if [[ "$(git log -1 --pretty=%s)" == chore\(release\):* ]]; then
  write_summary "- PASS release commit detected; no-op"
  echo "release commit detected; skipping"
  exit 0
fi

current="$(node -p "require('./package.json').version")"
latest_tag="$(git describe --tags --match 'v*' --abbrev=0 HEAD 2>/dev/null || true)"
if [[ -n "$latest_tag" ]]; then range="$latest_tag..HEAD"; else range="HEAD"; fi
subjects="$(git log "$range" --pretty='%s%n%b')"
bump="$(printf '%s\n' "$subjects" | bash .github/scripts/classify-release.sh)"

if [[ "$bump" == "none" ]]; then
  write_summary "- PASS no releasable commits for validated SHA $expected_sha; no release created"
  echo "no releasable commits; skipping"
  exit 0
fi

next="$(node - "$current" "$bump" <<'NODE'
const [current,bump]=process.argv.slice(2);
let [major,minor,patch]=current.split('.').map(Number);
if (bump==='major') { major++; minor=0; patch=0; }
else if (bump==='minor') { minor++; patch=0; }
else if (bump==='patch') { patch++; }
else throw new Error(`Unsupported bump ${bump}`);
process.stdout.write([major,minor,patch].join('.'));
NODE
)"
tag="v$next"
next_major="${next%%.*}"

if (( next_major >= 1 )); then
  export REPO="${REPO:-${GITHUB_REPOSITORY:-}}"
  export RELEASE_CANDIDATE="$tag"
  export EXPECTED_SHA="$expected_sha"
  bash .github/scripts/production-readiness.sh
  write_summary "- PASS production readiness gate for $tag"
fi

if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
  existing="$(git rev-list -n1 "$tag")"
  if gh release view "$tag" >/dev/null 2>&1; then
    write_summary "- PASS $tag already exists at $existing; no duplicate created"
    exit 0
  fi
  echo "tag $tag exists without a matching GitHub Release" >&2
  exit 1
fi

npm version "$next" --no-git-tag-version
{
  echo "# Changelog"
  echo
  echo "## $tag - $(date -u +%Y-%m-%d)"
  echo
  if [[ -n "$latest_tag" ]]; then git log "$latest_tag..HEAD" --pretty='- %s (%h)'; else git log --pretty='- %s (%h)'; fi
  echo
  if [[ -f CHANGELOG.md ]]; then tail -n +2 CHANGELOG.md; fi
} > CHANGELOG.new
mv CHANGELOG.new CHANGELOG.md

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add package.json CHANGELOG.md
git commit -m "chore(release): $tag"
release_sha="$(git rev-parse HEAD)"
git tag -a "$tag" -m "$tag"

# main and dev are updated as one remote transaction so they cannot split.
git push --atomic origin "HEAD:refs/heads/main" "HEAD:refs/heads/dev" "refs/tags/$tag"
remote_main="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
remote_dev="$(git ls-remote origin refs/heads/dev | awk '{print $1}')"
remote_tag="$(git ls-remote origin "refs/tags/$tag^{}" | awk '{print $1}')"
[[ "$remote_main" == "$release_sha" ]] || { echo "main verification failed" >&2; exit 1; }
[[ "$remote_dev" == "$release_sha" ]] || { echo "dev verification failed" >&2; exit 1; }
[[ "$remote_tag" == "$release_sha" ]] || { echo "tag verification failed" >&2; exit 1; }

if ! gh release view "$tag" >/dev/null 2>&1; then
  gh release create "$tag" --title "$tag" --generate-notes
fi

write_summary "- PASS release $tag"
write_summary "  - validated CI SHA: $expected_sha"
write_summary "  - release SHA: $release_sha"
write_summary "  - branch state before mutation: $state"
write_summary "  - semantic bump: $bump"

echo "released $tag from validated $expected_sha as $release_sha"
