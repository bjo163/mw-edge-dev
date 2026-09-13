#!/usr/bin/env bash
set -euo pipefail

data_dir="${MW_NIGHTLY_DATA_DIR:-$(mktemp -d)}"
artifact_dir="${MW_NIGHTLY_ARTIFACT_DIR:-${RUNNER_TEMP:-/tmp}/mw-edge-nightly}"
port="${MW_NIGHTLY_PORT:-8791}"
server_pid=""

mkdir -p "$artifact_dir"
cleanup() {
  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill -TERM "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf "$data_dir"
}
trap cleanup EXIT

export MW_DATA_DIR="$data_dir"
export MW_PROFILE="standalone-business"
export MW_ALLOW_FACTORY_RESET=1
export MW_BOOTSTRAP_ADMIN_PASSWORD="nightly-bootstrap-password-123456"
export MW_EDGE_HOST="127.0.0.1"
export MW_EDGE_PORT="$port"
export NODE_ENV="production"

echo "==> clean-state migration"
pnpm exec tsx scripts/migrate.ts --profile "$MW_PROFILE" --data-dir "$data_dir" | tee "$artifact_dir/migrate.json"

echo "==> isolated factory reset"
pnpm exec tsx scripts/factory-reset.ts --yes --no-backup --profile "$MW_PROFILE" --data-dir "$data_dir" | tee "$artifact_dir/factory-reset.json"

echo "==> compiled server smoke"
node dist/src/server.js >"$artifact_dir/server.log" 2>&1 &
server_pid="$!"

healthy=0
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error "http://127.0.0.1:$port/health" --output "$artifact_dir/health.json"; then
    healthy=1
    break
  fi
  sleep 1
done
if [[ "$healthy" -ne 1 ]]; then
  cat "$artifact_dir/server.log" >&2
  exit 1
fi

node --input-type=module - "$artifact_dir/health.json" <<'NODE'
import { readFileSync } from "node:fs";
const health = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (health.status !== "ok") throw new Error(`health status is ${health.status}`);
if (health.profile !== "standalone-business") throw new Error(`unexpected profile ${health.profile}`);
if (!(health.models > 0)) throw new Error("health models must be > 0");
if (!(health.components > 0)) throw new Error("health components must be > 0");
console.log(JSON.stringify({ gate: "compiled-health", ...health }));
NODE

kill -TERM "$server_pid"
wait "$server_pid"
server_pid=""

[[ -z "${GITHUB_STEP_SUMMARY:-}" ]] || {
  printf '## Nightly lifecycle\n\n' >> "$GITHUB_STEP_SUMMARY"
  printf -- '- PASS clean-state migration\n' >> "$GITHUB_STEP_SUMMARY"
  printf -- '- PASS isolated factory reset\n' >> "$GITHUB_STEP_SUMMARY"
  printf -- '- PASS compiled server /health smoke\n' >> "$GITHUB_STEP_SUMMARY"
}
echo "nightly lifecycle: ok"
