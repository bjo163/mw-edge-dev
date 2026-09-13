#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
from_tag="${MW_COMPAT_FROM_TAG:-v0.5.0}"
tmp="$(mktemp -d)"
old_tree="$tmp/old"
data_root="$tmp/data"

cleanup() {
  git -C "$root" worktree remove --force "$old_tree" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT

if ! git -C "$root" rev-parse --verify "${from_tag}^{commit}" >/dev/null 2>&1; then
  git -C "$root" fetch --force --depth=1 origin "refs/tags/${from_tag}:refs/tags/${from_tag}"
fi
git -C "$root" rev-parse --verify "${from_tag}^{commit}" >/dev/null
git -C "$root" worktree add --detach "$old_tree" "$from_tag" >/dev/null
ln -s "$root/node_modules" "$old_tree/node_modules"

profiles=()
while IFS= read -r profile_file; do
  profile="$(basename "$profile_file" .json)"
  [[ -f "$old_tree/profiles/$profile.json" ]] && profiles+=("$profile")
done < <(find "$root/profiles" -maxdepth 1 -name '*.json' -print | sort)

if [[ "${#profiles[@]}" -eq 0 ]]; then
  echo "No shared profiles between $from_tag and current tree" >&2
  exit 1
fi

for profile in "${profiles[@]}"; do
  data_dir="$data_root/$profile"
  mkdir -p "$data_dir"
  echo "==> $from_tag -> current: $profile"

  (
    cd "$old_tree"
    MW_BOOTSTRAP_ADMIN_PASSWORD="compat-bootstrap-password-123456"       "$root/node_modules/.bin/tsx" scripts/migrate.ts --profile "$profile" --data-dir "$data_dir"
  ) >/dev/null

  (
    cd "$root"
    MW_BOOTSTRAP_ADMIN_PASSWORD="compat-bootstrap-password-123456"       ./node_modules/.bin/tsx scripts/migrate.ts --profile "$profile" --data-dir "$data_dir" >/dev/null
    ./node_modules/.bin/tsx scripts/db-integrity.ts --profile "$profile" --data-dir "$data_dir"
  )
done

echo "migration compatibility: ok ($from_tag -> current, ${#profiles[@]} shared profiles)"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Migration compatibility"
    echo
    echo "- PASS \`$from_tag -> current\` across ${#profiles[@]} shared profiles"
  } >> "$GITHUB_STEP_SUMMARY"
fi
