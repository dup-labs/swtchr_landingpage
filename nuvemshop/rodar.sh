#!/bin/bash
# Sobe o SWTCHR local com um comando só:
#   backend (API + metafields)  → http://localhost:8787
#   painel (editor de blocos)   → http://localhost:5173
# Ctrl+C derruba os dois.

cd "$(dirname "$0")"
trap 'kill 0' EXIT

node server.mjs &
(cd panel && npm run dev) &

wait
