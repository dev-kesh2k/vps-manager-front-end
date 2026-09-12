#!/usr/bin/env bash
set -euo pipefail
SRC="/mnt/c/Users/Jefer/OneDrive/Documentos/GitHub/vps-manager-front-end/dist"
DEST="/hub-apps/apache/central-apps-hub"

if [ ! -d "$SRC" ]; then
  echo "SRC missing: $SRC" >&2
  exit 1
fi
if [ ! -f "$SRC/index.html" ]; then
  echo "SRC index.html missing" >&2
  exit 1
fi
if [ ! -d "$DEST" ]; then
  mkdir -p "$DEST"
fi

# Never allow empty DEST expansion to /*
case "$DEST" in
  /hub-apps/apache/central-apps-hub) ;;
  *) echo "Refuse unexpected DEST=$DEST" >&2; exit 1 ;;
esac

find "$DEST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -a "$SRC"/. "$DEST"/
chmod -R a+rX "$DEST"
echo "DEPLOYED"
ls -la "$DEST"
