#!/bin/bash
# Workaround for Next.js 16 Turbopack + Vercel middleware bug:
#
# Turbopack compiles edge middleware into chunked files at
#   .next/server/edge/chunks/turbopack-*edge-wrapper*.js
# But Vercel's post-build adapter expects:
#   .next/server/middleware.js        (lstat check)
#   .next/server/middleware.js.nft.json (NFT trace during build)
#
# This script:
# 1. Creates middleware.js.nft.json during build (watcher)
# 2. After build, copies the real edge-wrapper entrypoint to middleware.js

# Background watcher: ensure NFT file exists during "Finalizing page optimization"
(while true; do
  if [ -d ".next/server" ]; then
    if [ ! -f ".next/server/middleware.js.nft.json" ]; then
      echo '{"version":1,"files":[]}' > .next/server/middleware.js.nft.json
    fi
  fi
  sleep 0.3
done) &
WATCHER_PID=$!

# Run the actual build
next build
BUILD_EXIT=$?

# Clean up watcher
kill $WATCHER_PID 2>/dev/null
wait $WATCHER_PID 2>/dev/null

# Post-build: copy real middleware entrypoint to where Vercel expects it
if [ -f ".next/server/middleware-manifest.json" ]; then
  # Extract the middleware entrypoint path from the manifest
  ENTRYPOINT=$(node -e "
    const m = require('./.next/server/middleware-manifest.json');
    const mw = m.middleware && m.middleware['/'];
    if (mw && mw.entrypoint) console.log(mw.entrypoint);
  " 2>/dev/null)

  if [ -n "$ENTRYPOINT" ] && [ -f ".next/$ENTRYPOINT" ]; then
    echo "[build.sh] Copying middleware entrypoint: $ENTRYPOINT -> middleware.js"
    cp ".next/$ENTRYPOINT" .next/server/middleware.js
  else
    echo "[build.sh] WARNING: Could not find middleware entrypoint, creating empty shim"
    echo '"use strict";module.exports={};' > .next/server/middleware.js
  fi
fi

# Ensure NFT file exists
[ -d ".next/server" ] && [ ! -f ".next/server/middleware.js.nft.json" ] && \
  echo '{"version":1,"files":[]}' > .next/server/middleware.js.nft.json

exit $BUILD_EXIT
