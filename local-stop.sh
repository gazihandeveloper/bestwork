#!/usr/bin/env bash
# BestWork — yerel geliştirme ortamını durdurur (backend + yönetim paneli + eshop).
#
# Kullanım:
#   ./local-stop.sh          # hepsini durdur
#   ./local-stop.sh api      # sadece backend
#   ./local-stop.sh panel    # sadece yönetim paneli
#   ./local-stop.sh eshop    # sadece eshop
#
# Not: PostgreSQL ve Redis'e dokunmaz (onlar sistem servisi).

set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/.local-logs"
G="\033[32m"; Y="\033[33m"; N="\033[0m"

# durdur <isim> <port>
durdur() {
  local isim="$1" port="$2" oldu=0

  # 1) PID dosyası varsa süreç ağacını kapat
  if [ -f "$LOGS/$isim.pid" ]; then
    local pid; pid="$(cat "$LOGS/$isim.pid" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      pkill -TERM -P "$pid" 2>/dev/null
      kill -TERM "$pid" 2>/dev/null && oldu=1
    fi
    rm -f "$LOGS/$isim.pid"
  fi

  # 2) Port hâlâ doluysa porta bağlı süreçleri kapat (next dev alt süreçleri)
  local i=0
  while [ $i -lt 10 ] && nc -z 127.0.0.1 "$port" 2>/dev/null; do
    local pids; pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)"
    [ -n "$pids" ] && kill -TERM $pids 2>/dev/null && oldu=1
    sleep 0.5; i=$((i+1))
  done

  if nc -z 127.0.0.1 "$port" 2>/dev/null; then
    echo -e "${Y}! $isim hâlâ açık (port $port) — zorla kapatılıyor${N}"
    lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | xargs -r kill -9 2>/dev/null
  fi

  [ "$oldu" -eq 1 ] && echo -e "${G}✓ $isim durduruldu${N}" || echo -e "${Y}! $isim çalışmıyordu${N}"
}

hedef="${1:-hepsi}"
[ "$hedef" = "hepsi" ] || [ "$hedef" = "eshop" ] && durdur "eshop" 3000
[ "$hedef" = "hepsi" ] || [ "$hedef" = "panel" ] && durdur "panel" 3007
[ "$hedef" = "hepsi" ] || [ "$hedef" = "api" ] && durdur "api" 8090

echo
echo "Port durumu:"
for p in 8090 3007 3000; do
  printf "  %-5s " "$p"
  nc -z 127.0.0.1 "$p" 2>/dev/null && echo "açık" || echo "boş ✓"
done
