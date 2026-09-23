#!/usr/bin/env bash
set -euo pipefail

health_title="${1:-MW EDGE AUTOMATION HEALTH}"

jq -r --arg title "$health_title" '
  if type != "array" then
    error("issue payload must be an array")
  else
    [
      .[]
      | select(type == "object")
      | select(has("pull_request") | not)
      | select(.title == $title)
    ] as $canonical
    | if any($canonical[]; (.number | type) != "number" or (.number | floor) != .number or .number <= 0 or ((.state == "open" or .state == "closed") | not)) then
        error("canonical health issue has invalid identity/state")
      else
        $canonical
        | map({number, state})
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
      end
  end
'
