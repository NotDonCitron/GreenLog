#!/bin/bash
# Workaround for Next.js 16 Turbopack bug:
# Turbopack doesn't generate middleware.js.nft.json for edge middleware (Clerk),
# but the "Finalizing page optimization" phase expects it.
#
# This script runs a background watcher that creates the missing file
# as soon as .next/server/ exists, keeping it alive until the build finishes.

# Background watcher: continuously ensure the file exists
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

exit $BUILD_EXIT
