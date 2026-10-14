#!/bin/bash
# Sunucuda BIR KEZ:  bash autosync-setup.sh <GITHUB_TOKEN>
set -e
TOKEN="${1:?kullanim: bash autosync-setup.sh <GITHUB_TOKEN>}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
S="$HOME/bestwork-docker/scripts"
mkdir -p "$S" "$HOME/bestwork-backups"
D="$(cd "$(dirname "$0")" && pwd)"
cp "$D/db-snapshot.sh" "$D/autosync.sh" "$D/autodeploy.sh" "$S/" 2>/dev/null || true
chmod +x "$S/db-snapshot.sh" "$S/autosync.sh" "$S/autodeploy.sh" 2>/dev/null || true
printf '%s' "$TOKEN" > "$HOME/.bestwork-token"; chmod 600 "$HOME/.bestwork-token"

mkplist(){ # $1 label $2 script $3 interval
cat > "$HOME/Library/LaunchAgents/$1.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>$1</string>
<key>ProgramArguments</key><array>
<string>/bin/bash</string><string>-lc</string>
<string>\$HOME/bestwork-docker/scripts/$2</string>
</array>
<key>StartInterval</key><integer>$3</integer>
<key>RunAtLoad</key><true/>
<key>StandardOutPath</key><string>\$HOME/bestwork-backups/$1.out.log</string>
<key>StandardErrorPath</key><string>\$HOME/bestwork-backups/$1.err.log</string>
</dict></plist>
PL
launchctl bootout "gui/$(id -u)/$1" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/$1.plist"
}

mkplist com.bestwork.autodeploy autodeploy.sh 600
mkplist com.bestwork.autosync   autosync.sh   1800
echo "Kuruldu: autodeploy (10 dk) + autosync (30 dk). Token kaydedildi."
