#!/usr/bin/env bash
set -euo pipefail

SRC_IMG=~/birdid-lite/backend/static/images
DST_IMG=~/birdid-site/images
SRC_JSON=~/birdid-lite/backend/data/questions.json
DST_JSON=~/birdid-site/questions.json
SRC_LEDGER_JSON=~/birdid-lite/backend/data/donations.json
SRC_LEDGER_CSV=~/birdid-lite/backend/data/donations.csv
PAGES=~/birdid-site

# 1) Resize images
~/birdid-lite/tools/resize_images.py --src "$SRC_IMG" --dst "$DST_IMG" --max-width 900 --skip-existing

# 2) Sync questions + only referenced images
~/birdid-lite/tools/sync_questions.py \
  --src-json "$SRC_JSON" --dst-json "$DST_JSON" \
  --images-src "$SRC_IMG" --images-dst "$DST_IMG" \
  --rewrite-ext keep --copy-referenced

# 3) Publish ledger (if present)
mkdir -p "$PAGES/ledger"
[ -f "$SRC_LEDGER_JSON" ] && cp "$SRC_LEDGER_JSON" "$PAGES/ledger/donations.json" || true
[ -f "$SRC_LEDGER_CSV"  ] && cp "$SRC_LEDGER_CSV"  "$PAGES/ledger/donations.csv"  || true

# 4) Commit & push
cd "$PAGES"
git add questions.json images ledger
git commit -m "Publish quiz + ledger $(date +'%Y-%m-%d %H:%M')"
git push origin main
echo "✅ Deployed to Cloudflare Pages."
