#!/usr/bin/env bash
set -euo pipefail

health_title="${1:-MW EDGE AUTOMATION HEALTH}"

jq -r --arg title "$health_title" '
  [
    .[]
    | select(has("pull_request") | not)
    | select(.title == $title)
    | {number, state: (.state // "unknown")}
  ]
  | sort_by(.number)
  | if length == 0 then
      ["NONE", "", "", "0", ""]
    elif length == 1 then
      ["ONE", (.[0].number | tostring), .[0].state, "1", ""]
    else
      [
        "DUPLICATE",
        (.[0].number | tostring),
        .[0].state,
        (length | tostring),
        (map(.number | tostring) | join(","))
      ]
    end
  | @tsv
'
