#!/bin/bash
# Workaround for Next.js 16 Turbopack bug:
# Turbopack doesn't generate standalone middleware.js / middleware.js.nft.json
# for edge middleware, but Vercel's build system expects both files.

# Background watcher: continuously ensure the NFT file exists during build
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

# Debug: show what Turbopack generated for middleware
echo "=== DEBUG: .next/server/ contents ==="
ls -la .next/server/ 2>/dev/null
echo "=== DEBUG: middleware-related files ==="
find .next -name '*middleware*' -o -name '*edge*' 2>/dev/null | head -50
echo "=== DEBUG: .next/server/edge/ contents ==="
ls -laR .next/server/edge/ 2>/dev/null | head -50
echo "=== END DEBUG ==="

# Ensure shim files exist for Vercel's post-build
if [ -d ".next/server" ]; then
  [ ! -f ".next/server/middleware.js.nft.json" ] && \
    echo '{"version":1,"files":[]}' > .next/server/middleware.js.nft.json
  [ ! -f ".next/server/middleware.js" ] && \
    echo '"use strict";module.exports={};' > .next/server/middleware.js
fi

exit $BUILD_EXIT
