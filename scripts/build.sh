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

# Debug: show middleware manifest and function output
echo "=== DEBUG: middleware-manifest.json ==="
cat .next/server/middleware-manifest.json 2>/dev/null
echo ""
echo "=== DEBUG: middleware/ directory ==="
ls -laR .next/server/middleware/ 2>/dev/null
echo "=== DEBUG: _middleware.func ==="
find .next/output/functions/_middleware.func -type f 2>/dev/null | head -20
echo "=== DEBUG: _middleware.func index.js (first 5 lines) ==="
head -5 .next/output/functions/_middleware.func/index.js 2>/dev/null
echo "=== DEBUG: middleware-build-manifest.js ==="
cat .next/server/middleware-build-manifest.js 2>/dev/null
echo ""
echo "=== END DEBUG ==="

# Ensure NFT file exists for Vercel's post-build (but DON'T create dummy middleware.js)
if [ -d ".next/server" ]; then
  [ ! -f ".next/server/middleware.js.nft.json" ] && \
    echo '{"version":1,"files":[]}' > .next/server/middleware.js.nft.json
fi

exit $BUILD_EXIT
