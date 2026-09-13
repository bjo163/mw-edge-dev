#!/usr/bin/env bash
set -euo pipefail

if [[ "$(git log -1 --pretty=%s)" == chore\(release\):* ]]; then
  echo "release commit detected; skipping"
  exit 0
fi

current="$(node -p "require('./package.json').version")"
latest_tag="$(git tag --list 'v*' --sort=-v:refname | head -n1 || true)"
if [ -n "$latest_tag" ]; then range="$latest_tag..HEAD"; else range="HEAD"; fi
subjects="$(git log "$range" --pretty='%s%n%b' 2>/dev/null || git log --pretty='%s%n%b')"

bump="patch"
if printf '%s\n' "$subjects" | grep -Eq 'BREAKING CHANGE|^[a-z]+(\([^)]*\))?!:'; then
  bump="major"
elif printf '%s\n' "$subjects" | grep -Eq '^feat(\([^)]*\))?:'; then
  bump="minor"
fi

next="$(node - "$current" "$bump" <<'NODE'
const [current,bump]=process.argv.slice(2);
let [major,minor,patch]=current.split('.').map(Number);
if (bump==='major') { major++; minor=0; patch=0; }
else if (bump==='minor') { minor++; patch=0; }
else patch++;
process.stdout.write([major,minor,patch].join('.'));
NODE
)"
tag="v$next"

npm version "$next" --no-git-tag-version
previous="$(git tag --list 'v*' --sort=-v:refname | head -n1 || true)"
{
  echo "# Changelog"
  echo
  echo "## $tag - $(date -u +%Y-%m-%d)"
  echo
  if [ -n "$previous" ]; then git log "$previous..HEAD" --pretty='- %s (%h)'; else git log --pretty='- %s (%h)'; fi
  echo
  if [ -f CHANGELOG.md ]; then tail -n +2 CHANGELOG.md; fi
} > CHANGELOG.new
mv CHANGELOG.new CHANGELOG.md

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add package.json CHANGELOG.md
git commit -m "chore(release): $tag"
git tag -a "$tag" -m "$tag"
git push origin HEAD:main --follow-tags
gh release create "$tag" --title "$tag" --generate-notes
