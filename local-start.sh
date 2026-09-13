#!/usr/bin/env bash
# BestWork — yerel geliştirme ortamını başlatır (backend + yönetim paneli + eshop).
#
# Kullanım:
#   ./local-start.sh            # hepsini başlat
#   ./local-start.sh api        # sadece backend
#   ./local-start.sh panel      # sadece yönetim paneli
#   ./local-start.sh eshop      # sadece eshop
#
# Durdurmak için: ./local-stop.sh

set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/.local-logs"
mkdir -p "$LOGS"

# Renkler
G="\033[32m"; R="\033[31m"; Y="\033[33m"; N="\033[0m"

hedef="${1:-hepsi}"

# --- Ön koşul kontrolü ---
on_kosul() {
  local eksik=0
  if ! pg_isready -q -h 127.0.0.1 -p 5432 2>/dev/null; then
    echo -e "${R}✗ PostgreSQL çalışmıyor${N}  →  brew services start postgresql@18"; eksik=1
  fi
  if ! redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
    echo -e "${R}✗ Redis çalışmıyor${N}  →  brew services start redis"; eksik=1
  fi
  [ "$eksik" -eq 0 ] && echo -e "${G}✓ PostgreSQL + Redis ayakta${N}"
  return $eksik
}

port_dolu() { nc -z 127.0.0.1 "$1" 2>/dev/null; }

# Arka planda başlat: başlat <isim> <port> <dizin> <komut...>
baslat() {
  local isim="$1" port="$2" dizin="$3"; shift 3
  if port_dolu "$port"; then
    echo -e "${Y}! $isim zaten çalışıyor (port $port) — atlandı${N}"
    return 0
  fi
  # nohup + stdin ayırma: betik/terminal kapansa da süreç yaşamaya devam eder
  ( cd "$dizin" && nohup "$@" >"$LOGS/$isim.log" 2>&1 </dev/null & echo $! >"$LOGS/$isim.pid" )
  echo -e "${G}▸ $isim başlatılıyor${N} (port $port, log: .local-logs/$isim.log)"
}

bekle() {
  local isim="$1" port="$2" url="$3" i=0
  while [ $i -lt 40 ]; do
    if port_dolu "$port"; then
      echo -e "${G}✓ $isim hazır → $url${N}"
      return 0
    fi
    sleep 0.5; i=$((i+1))
  done
  echo -e "${R}✗ $isim açılmadı. Son loglar:${N}"
  tail -15 "$LOGS/$isim.log" 2>/dev/null
  return 1
}

echo "═══ BestWork yerel ortam ═══"
on_kosul || echo -e "${Y}Uyarı: veritabanı/cache olmadan backend açılmaz.${N}"
echo

if [ "$hedef" = "hepsi" ] || [ "$hedef" = "api" ]; then
  # Backend ikili dosyası yoksa derle
  if [ ! -x "$ROOT/mlm-backend/bin/bestwork-api" ]; then
    echo "▸ Backend derleniyor…"
    ( cd "$ROOT/mlm-backend" && GOMODCACHE="$ROOT/.tools/go-mod" GOCACHE="$ROOT/.tools/go-build" \
      go build -o bin/bestwork-api ./cmd/api ) || { echo -e "${R}✗ Derleme başarısız${N}"; exit 1; }
  fi
  baslat "api" 8090 "$ROOT/mlm-backend" ./bin/bestwork-api
  bekle "api" 8090 "http://127.0.0.1:8090/health"
fi

if [ "$hedef" = "hepsi" ] || [ "$hedef" = "panel" ]; then
  baslat "panel" 3007 "$ROOT/mlm-yonetim-new" npm run dev -- -p 3007
  bekle "panel" 3007 "http://localhost:3007/bestmanager"
fi

if [ "$hedef" = "hepsi" ] || [ "$hedef" = "eshop" ]; then
  baslat "eshop" 3000 "$ROOT/eshop" npm run dev -- -p 3000
  bekle "eshop" 3000 "http://localhost:3000"
fi

echo
echo "─── Adresler ───"
echo "  API     : http://127.0.0.1:8090/health"
echo "  Yönetim : http://localhost:3007/bestmanager"
echo "  Eshop   : http://localhost:3000"
echo "  Durdur  : ./local-stop.sh"
