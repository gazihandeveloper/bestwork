package handlers

import (
	"html/template"
	"net/http"
	"strconv"
	"strings"
)

// Varsayılan yayın adresleri (HLS).
const defaultSportStream = "https://2i4.d72577a9dd0ec71.cfd/patron/mono.m3u8"
const defaultSportStream2 = "https://corestream.ardastream.live//hls/bein1.m3u8"

// SportGet herkese açık /sport canlı yayın sayfasıdır (Plyr + HLS, şifre yok).
func (h *Handler) SportGet(w http.ResponseWriter, r *http.Request) {
	custom := r.URL.Query().Get("v")
	override := custom != "" && strings.HasPrefix(custom, "https://")
	first := defaultSportStream2
	if override {
		first = custom
	}

	// Sayfa için yayın/CDN erişimine izin veren daha esnek CSP.
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
	w.Header().Set("Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "+
			"img-src 'self' data: blob: https:; media-src 'self' blob: https:; "+
			"connect-src 'self' blob: https:; font-src 'self' data: https:; frame-src 'none'; form-action 'self'")

	// Kanal listesi: [["ETİKET","URL"], ...]
	type chanDef struct{ L, U string }
	chs := []chanDef{{"BEIN 1", first}, {"MONO", defaultSportStream}}
	var b strings.Builder
	for i, c := range chs {
		if i > 0 {
			b.WriteString(",")
		}
		b.WriteString("[" + strconv.Quote(c.L) + "," + strconv.Quote(c.U) + "]")
	}

	html := strings.ReplaceAll(sportPage, "__ATTR__", template.HTMLEscapeString(first))
	html = strings.ReplaceAll(html, "__JS__", strconv.Quote(first))
	html = strings.ReplaceAll(html, "__CHS__", b.String())
	if override {
		html = strings.ReplaceAll(html, "__CUSTOM__", "true")
	} else {
		html = strings.ReplaceAll(html, "__CUSTOM__", "false")
	}
	w.Write([]byte(html))
}

const sportPage = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sis Teknik · Canlı Spor Yayını</title>
<link rel="stylesheet" href="/static/vendor/plyr.css" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: radial-gradient(circle at 20% 0%, #0d2b1e 0%, #050d09 60%);
    color: #eafff2;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .wrap { width: 100%; max-width: 1060px; }
  .brand {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
  }
  .brand h1 {
    font-size: 1.35rem; letter-spacing: .04em; font-weight: 800;
    background: linear-gradient(90deg,#34d399,#059669);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  .live {
    display: inline-flex; align-items: center; gap: 7px;
    background: #dc2626; color: #fff; font-weight: 800; font-size: .72rem;
    letter-spacing: .12em; text-transform: uppercase;
    padding: 5px 11px; border-radius: 999px;
  }
  .live i { width: 9px; height: 9px; border-radius: 50%; background: #fff; animation: blink 1.1s infinite; }
  @keyframes blink { 50% { opacity: .15; } }
  .chans { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .chans .ch {
    cursor: pointer; border: 1px solid rgba(52,211,153,.4);
    background: rgba(6,32,22,.7); color: #a7f3d0;
    font-weight: 800; font-size: .8rem; letter-spacing: .05em;
    padding: 8px 18px; border-radius: 999px; transition: all .15s;
  }
  .chans .ch:hover { background: rgba(16,185,129,.18); }
  .chans .ch.on { background: linear-gradient(90deg,#059669,#10b981); color: #fff; border-color: transparent; box-shadow: 0 8px 22px -8px rgba(16,185,129,.6); }
  .stage {
    position: relative; border-radius: 20px; overflow: hidden;
    border: 1px solid rgba(52,211,153,.25);
    box-shadow: 0 24px 70px -18px rgba(16,185,129,.35);
    background: #000;
  }
  .stage video { width: 100%; aspect-ratio: 16 / 9; display: block; background: #000; }
  #err {
    display: none; position: absolute; inset: 0; z-index: 5;
    background: rgba(3,7,5,.92); align-items: center; justify-content: center;
    flex-direction: column; gap: 14px; text-align: center; padding: 20px;
  }
  #err.show { display: flex; }
  #err p { max-width: 620px; line-height: 1.55; font-size: .95rem; color: #d1fae5; }
  #err b { color: #fbbf24; }
  #err button {
    cursor: pointer; background: #059669; color: #fff; border: 0;
    font-weight: 800; padding: 11px 26px; border-radius: 12px; font-size: .95rem;
  }
  .hint { margin-top: 12px; text-align: center; font-size: .78rem; color: #6ee7b7; opacity: .85; }
  .hint input {
    margin-left: 8px; width: min(420px, 80vw); background: #0b1f16;
    border: 1px solid #14532d; color: #eafff2; border-radius: 9px; padding: 6px 10px; font-size: .78rem;
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <h1>📺 SİS TEKNİK · SPOR</h1>
    <span class="live"><i></i> CANLI</span>
  </div>

  <div class="chans" id="chans"></div>

  <div class="stage">
    <video id="player" playsinline controls preload="auto" data-src="__ATTR__"></video>
    <div id="err">
      <p><b>Yayına bağlanılamadı.</b><br/>Bağlantı geçici olarak kopmuş olabilir. Başka bir kanal seçin ya da yeniden deneyin.</p>
      <button type="button" onclick="location.reload()">↻ Yeniden Dene</button>
    </div>
  </div>

  <div class="hint">
    Yayın kesilirse otomatik yeniden bağlanır. Farklı bir yayın denemek için adres girin:
    <input id="srcInput" type="text" placeholder="https://.../stream.m3u8" onkeydown="if(event.key==='Enter'){go()}" />
  </div>
</div>

<script src="/static/vendor/hls.min.js"></script>
<script src="/static/vendor/plyr.min.js"></script>
<script>
(function(){
  "use strict";
  var SRC = __JS__;
  var CUSTOM_FIRST = __CUSTOM__;
  var CHANNELS = [__CHS__];
  var video = document.getElementById("player");
  var errEl = document.getElementById("err");

  function setSource(url) {
    SRC = url;
    video.removeAttribute("src");
    if (window.Hls && Hls.isSupported()) {
      var hls = new Hls({
        enableWorker: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        backBufferLength: 60
      });
      hls.on(Hls.Events.ERROR, function(evt, data) {
        if (data && data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              errEl.classList.add("show");
              break;
          }
        }
      });
      hls.on(Hls.Events.MANIFEST_PARSED, function(){ tryPlay(); });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", function(){ tryPlay(); });
    } else {
      errEl.classList.add("show");
    }
  }

  var firstTap = false;
  function tryPlay() {
    if (firstTap) return;
    video.muted = true;
    var p = video.play();
    if (p && p.catch) p.catch(function(){});
    firstTap = true;
  }

  video.addEventListener("error", function(){
    if (!errEl.classList.contains("show")) errEl.classList.add("show");
  });
  window.addEventListener("pointerdown", function once(){
    video.muted = false;
    window.removeEventListener("pointerdown", once);
  });

  window.go = function(){
    var u = document.getElementById("srcInput").value.trim();
    if (u && u.indexOf("https://") === 0) {
      errEl.classList.remove("show");
      setSource(u);
      document.getElementById("srcInput").value = "";
    }
  };

  // Kanal seçici (seçim URL ile hatırlanır)
  var cur = 0;
  var savedUrl = null;
  try { savedUrl = localStorage.getItem("sisSportChanUrl"); } catch (e) {}
  if (savedUrl) {
    for (var i = 0; i < CHANNELS.length; i++) { if (CHANNELS[i][1] === savedUrl) { cur = i; break; } }
  }
  if (CUSTOM_FIRST) cur = 0;
  if (cur < 0 || cur >= CHANNELS.length) cur = 0;

  function renderChans() {
    var el = document.getElementById("chans");
    el.innerHTML = "";
    CHANNELS.forEach(function(c, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = c[0];
      b.className = "ch" + (i === cur ? " on" : "");
      b.onclick = function() {
        cur = i;
        try { localStorage.setItem("sisSportChanUrl", CHANNELS[i][1]); } catch (e) {}
        renderChans();
        errEl.classList.remove("show");
        setSource(CHANNELS[i][1]);
      };
      el.appendChild(b);
    });
  }

  // Plyr kurulumu
  var player = new Plyr(video, {
    controls: ["play-large","play","progress","current-time","duration","mute","volume","settings","fullscreen"],
    settings: ["quality","speed"],
    keyboard: { focused: true, global: true },
    tooltips: { controls: true, seek: true },
    storage: { enabled: false }
  });
  window.sportPlayer = player;

  renderChans();
  setSource(CHANNELS[cur] ? CHANNELS[cur][1] : SRC);
})();
</script>
</body>
</html>`
