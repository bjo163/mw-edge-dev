#!/usr/bin/env bash
set -euo pipefail

data_dir="$(mktemp -d)"
artifact_dir="${MW_NIGHTLY_ARTIFACT_DIR:-${RUNNER_TEMP:-/tmp}/mw-edge-nightly}"
api_port="${MW_QUICKSTART_API_PORT:-8792}"
pid=""

mkdir -p "$artifact_dir"
cleanup() {
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -rf "$data_dir"
}
trap cleanup EXIT

export MW_DATA_DIR="$data_dir"
export MW_PROFILE="standalone-business"
export MW_EDGE_HOST="127.0.0.1"
export MW_EDGE_PORT="$api_port"
export MW_BOOTSTRAP_ADMIN_PASSWORD="ci-local-$RANDOM-$RANDOM"

pnpm dev:standalone >"$artifact_dir/quickstart.log" 2>&1 &
pid="$!"

api_ok=0
ui_ok=0
for _ in $(seq 1 45); do
  if [[ "$api_ok" -eq 0 ]] && curl --fail --silent "http://127.0.0.1:$api_port/health" --output "$artifact_dir/quickstart-health.json"; then api_ok=1; fi
  if [[ "$ui_ok" -eq 0 ]] && curl --fail --silent "http://127.0.0.1:5173/" --output "$artifact_dir/quickstart-ui.html"; then ui_ok=1; fi
  if [[ "$api_ok" -eq 1 && "$ui_ok" -eq 1 ]]; then break; fi
  if ! kill -0 "$pid" 2>/dev/null; then
    cat "$artifact_dir/quickstart.log" >&2
    exit 1
  fi
  sleep 1
done

if [[ "$api_ok" -ne 1 || "$ui_ok" -ne 1 ]]; then
  cat "$artifact_dir/quickstart.log" >&2
  exit 1
fi

node --input-type=module - "$artifact_dir/quickstart-health.json" <<'NODE'
import { readFileSync } from "node:fs";
const health = JSON.parse(readFileSync(process.argv[2], "utf8"));
if (health.status !== "ok") throw new Error("quickstart health not ok");
if (health.profile !== "standalone-business") throw new Error("unexpected quickstart profile");
if (!(health.models > 0) || !(health.components > 0)) throw new Error("quickstart metadata counts must be positive");
console.log(JSON.stringify({ gate: "quickstart", ...health }));
NODE

kill -TERM "$pid"
wait "$pid" || true
pid=""
echo "quickstart smoke: ok"
