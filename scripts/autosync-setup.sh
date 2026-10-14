#!/bin/bash
# Sunucuda bir kez:  bash autosync-setup.sh <GITHUB_TOKEN>
set -e
TOKEN="${1:?kullanim: autosync-setup.sh <TOKEN>}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
D="$HOME/bestwork-docker/scripts"
mkdir -p "$HOME/bestwork-docker/scripts" "$HOME/bestwork-backups"
cp "$(dirname "$0")/db-snapshot.sh" "$(dirname "$0")/autosync.sh" "$D/" 2>/dev/null || true
chmod +x "$D/db-snapshot.sh" "$D/autosync.sh" 2>/dev/null
printf '%s' "$TOKEN" > "$HOME/.bestwork-token"; chmod 600 "$HOME/.bestwork-token"

PLIST="$HOME/Library/LaunchAgents/com.bestwork.autosync.plist"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.bestwork.autosync</string>
<key>ProgramArguments</key><array>
<string>/bin/bash</string><string>-lc</string>
<string>\$HOME/bestwork-docker/scripts/autosync.sh</string>
</array>
<key>StartInterval</key><integer>1800</integer>
<key>RunAtLoad</key><true/>
<key>StandardOutPath</key><string>\$HOME/bestwork-backups/autosync.out.log</string>
<key>StandardErrorPath</key><string>\$HOME/bestwork-backups/autosync.err.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/com.bestwork.autosync" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "autosync kuruldu (her 30 dk) + token kaydedildi."
