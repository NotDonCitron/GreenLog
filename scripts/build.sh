#!/bin/bash
# Workaround for Next.js 16 Turbopack bug:
# Turbopack doesn't generate standalone middleware.js / middleware.js.nft.json
# for edge middleware, but Vercel's build system expects both files.
#
# This script runs a background watcher that creates the missing files
# during and after compilation.

# Background watcher: continuously ensure the files exist
(while true; do
  if [ -d ".next/server" ]; then
    # Create missing NFT trace file
    if [ ! -f ".next/server/middleware.js.nft.json" ]; then
      echo '{"version":1,"files":[]}' > .next/server/middleware.js.nft.json
    fi
    # Create missing middleware.js shim
    if [ ! -f ".next/server/middleware.js" ]; then
      echo '"use strict";module.exports={};' > .next/server/middleware.js
    fi
  fi
  sleep 0.3
done) &
WATCHER_PID=$!

# Run the actual build
next build
BUILD_EXIT=$?

# Ensure files exist after build completes (for Vercel post-build step)
if [ -d ".next/server" ]; then
  [ ! -f ".next/server/middleware.js.nft.json" ] && \
    echo '{"version":1,"files":[]}' > .next/server/middleware.js.nft.json
  [ ! -f ".next/server/middleware.js" ] && \
    echo '"use strict";module.exports={};' > .next/server/middleware.js
fi

# Clean up watcher
kill $WATCHER_PID 2>/dev/null
wait $WATCHER_PID 2>/dev/null

exit $BUILD_EXIT
