#!/usr/bin/env bash
# Open (or reuse) a PR from lane-b-data into main using the GitHub credential git already has.
# Usage: scripts/open_pr.sh "Title" "Body"
set -e
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
API=https://api.github.com/repos/Devaj6190/FireSight/pulls
existing=$(curl -s -H "Authorization: Bearer $TOKEN" "$API?state=open&head=Devaj6190:lane-b-data" | python -I -c "import json,sys; d=json.load(sys.stdin); print(d[0]['html_url'] if d else '')")
if [ -n "$existing" ]; then echo "already open: $existing"; exit 0; fi
python -I -c "import json,sys; print(json.dumps({'title':sys.argv[1],'body':sys.argv[2],'head':'lane-b-data','base':'main'}))" "$1" "$2" \
  | curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$API" -d @- \
  | python -I -c "import json,sys; d=json.load(sys.stdin); print(d.get('html_url') or d)"
