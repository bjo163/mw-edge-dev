#!/usr/bin/env bash
set -euo pipefail

remote="${REMOTE:-origin}"

git fetch --no-tags "$remote" +refs/heads/main:refs/remotes/origin/main
main_sha="$(git rev-parse origin/main)"

if ! git ls-remote --exit-code --heads "$remote" dev >/dev/null 2>&1; then
  git push "$remote" "$main_sha:refs/heads/dev"
  remote_dev="$(git ls-remote "$remote" refs/heads/dev | awk '{print $1}')"
  [[ "$remote_dev" == "$main_sha" ]] || { echo "dev recreation verification failed" >&2; exit 1; }
  echo "state=BLOCKED action=recreated-dev sha=$main_sha"
  exit 0
fi

git fetch --no-tags "$remote" +refs/heads/dev:refs/remotes/origin/dev
state="$(bash .github/scripts/branch-state.sh origin/main origin/dev)"

case "$state" in
  CLEAN)
    echo "state=CLEAN action=no-op sha=$main_sha"
    ;;
  MAIN_AHEAD_RELEASE)
    git push "$remote" "$main_sha:refs/heads/dev"
    remote_dev="$(git ls-remote "$remote" refs/heads/dev | awk '{print $1}')"
    [[ "$remote_dev" == "$main_sha" ]] || { echo "dev fast-forward verification failed" >&2; exit 1; }
    echo "state=MAIN_AHEAD_RELEASE action=fast-forwarded-dev sha=$main_sha"
    ;;
  DEV_AHEAD)
    echo "state=DEV_AHEAD action=no-op detail=dev-already-contains-main"
    ;;
  DIVERGED|BLOCKED)
    echo "state=$state action=blocked" >&2
    exit 1
    ;;
  *)
    echo "unknown branch state: $state" >&2
    exit 1
    ;;
esac
