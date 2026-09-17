// ============================================
// BestWork - WhatsApp Köprüsü (Baileys)
//
// - QR okutarak kendi WhatsApp hesabınıza bağlanır (auth/ klasöründe saklanır).
// - Belirtilen numara(lar)dan gelen mesajları panelde canlı listeler ve
//   whatsapp-bridge/inbox.jsonl dosyasına ekler.
// - Her mesajın durumu vardır: pending | processing | done | error.
//   Panel, işlenen (done/error) mesajların üzerini çizer.
//
// Uçlar:
//   GET  /                 panel (QR + mesaj listesi)
//   GET  /qr               QR (data URL)
//   GET  /messages         tüm mesajlar
//   GET  /pending          yalnız bekleyenler (worker bunu çeker)
//   POST /status           {id,status}
//   POST /inject           {from,name,text}  (test amaçlı)
//
// Çalıştırma:  cd whatsapp-bridge && npm start
// Filtre:      WA_TARGETS="80500...,9055..." npm start
// ============================================
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from '@whiskeysockets/baileys'
import express from 'express'
import QRCode from 'qrcode'
import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, 'auth')
const INBOX = path.join(__dirname, 'inbox.jsonl')
const STATE = path.join(__dirname, 'state.json')
const MEDIA_DIR = path.join(__dirname, 'media')
fs.mkdirSync(MEDIA_DIR, { recursive: true })
const PORT = Number(process.env.WA_PORT || 4599)

const TARGETS = (process.env.WA_TARGETS || '')
  .split(',')
  .map((s) => s.replace(/\D/g, ''))
  .filter(Boolean)

let currentQR = null
let status = 'başlatılıyor'
const messages = []
let sockRef = null

// Kalıcılık: yeniden başlatmada mesajlar/durumlar kaybolmasın.
try {
  const saved = JSON.parse(fs.readFileSync(STATE, 'utf8'))
  if (Array.isArray(saved)) messages.push(...saved.filter((m) => m.status !== 'ignored'))
} catch {
  /* kayıt yok */
}
function persist() {
  try {
    fs.writeFileSync(STATE, JSON.stringify(messages))
  } catch {
    /* yoksay */
  }
}

const app = express()
app.use(express.json())

app.get('/', (_req, res) => res.type('html').send(fs.readFileSync(path.join(__dirname, 'panel.html'), 'utf8')))
app.get('/qr', async (_req, res) => {
  if (!currentQR) return res.json({ qr: null, status })
  res.json({ qr: await QRCode.toDataURL(currentQR), status })
})
app.get('/messages', (_req, res) => res.json({ status, targets: TARGETS, messages }))
app.get('/pending', (_req, res) =>
  res.json({ messages: messages.filter((m) => m.status === 'pending') })
)

// Canlı log (worker'ın düşünceleri + köprü logu)
const WORKER_LOG =
  process.env.WA_WORKER_LOG ||
  '/Users/mahmutgazihanarslan/Library/Logs/bestwork/wa-worker.log'
const BRIDGE_LOG =
  process.env.WA_BRIDGE_LOG ||
  '/Users/mahmutgazihanarslan/Library/Logs/bestwork/wa-bridge.log'
function tailLines(file, n) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').slice(-n).join('\n')
  } catch {
    return '(log yok: ' + file + ')'
  }
}
app.get('/log', (req, res) => {
  const n = Math.min(Math.max(parseInt(req.query.lines || '400', 10) || 400, 20), 4000)
  res.json({ ok: true, worker: tailLines(WORKER_LOG, n), bridge: tailLines(BRIDGE_LOG, 200) })
})
app.post('/clear', (_req, res) => {
  messages.length = 0
  persist()
  res.json({ ok: true })
})
app.post('/status', (req, res) => {
  const { id, status: st } = req.body || {}
  const m = messages.find((x) => x.id === id)
  if (m) {
    if (st === 'ignored') {
      const i = messages.indexOf(m)
      if (i >= 0) messages.splice(i, 1)
    } else {
      m.status = st
      m.updatedAt = Date.now()
    }
    persist()
  }
  res.json({ ok: !!m })
})
app.post('/result', (req, res) => {
  const { id, result } = req.body || {}
  const m = messages.find((x) => x.id === id)
  if (m) {
    m.result = String(result || '').slice(0, 4000)
    persist()
  }
  res.json({ ok: !!m })
})
app.post('/inject', (req, res) => {
  const { from = 'test', name = 'Test', text = '', jid = '', image = '' } = req.body || {}
  if (!text && !image) return res.status(400).json({ ok: false })
  add({ from, name, text: text || (image ? '(resim gönderildi)' : ''), jid, image })
  res.json({ ok: true })
})

// Belirli bir JID'e WhatsApp mesajı gönderir (worker "yapıldı" cevabı için).
app.post('/send', async (req, res) => {
  const { jid, text } = req.body || {}
  if (!jid || !text || !sockRef) return res.status(400).json({ ok: false })
  try {
    await sockRef.sendMessage(jid, { text })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

app.listen(PORT, () => {
  console.log(`\nWhatsApp köprüsü hazır →  http://localhost:${PORT}\n`)
  if (TARGETS.length) console.log('Filtre (numaralar):', TARGETS.join(', '))
  else console.log('Filtre yok: TÜM gelen mesajlar yakalanacak.')
})

function add({ from, name, text, jid, image }) {
  const ts = Date.now()
  const rec = {
    id: `${ts}-${from}`,
    ts,
    from,
    name,
    text,
    jid: jid || '',
    image: image || '',
    status: 'pending',
  }
  messages.push(rec)
  if (messages.length > 500) messages.shift()
  persist()
  try {
    fs.appendFileSync(INBOX, JSON.stringify(rec) + '\n')
  } catch {
    /* yoksay */
  }
  console.log(`MSG ${from} (${name}): ${text}${image ? ' [resim]' : ''}`)
  return rec
}

async function record(m) {
  const from = (m.key.remoteJid || '').split('@')[0]
  if (TARGETS.length && !TARGETS.includes(from)) return
  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    ''
  // Görsel/ses: medyayı indir, diske kaydet (worker görseli modele ekleyecek).
  let image = ''
  const imgMsg = m.message?.imageMessage
  if (imgMsg) {
    try {
      const buf = await downloadMediaMessage(
        m,
        'buffer',
        {},
        { logger: pino({ level: 'silent' }), reuploadRequest: sockRef?.updateMediaMessage }
      )
      const ext = String(imgMsg.mimetype || 'image/jpeg')
        .split('/')[1]
        .split(';')[0]
        .replace('jpeg', 'jpg')
      const file = path.join(MEDIA_DIR, `${Date.now()}-${from}.${ext}`)
      fs.writeFileSync(file, buf)
      image = file
    } catch (e) {
      console.log('resim indirilemedi:', e?.message || String(e))
    }
  }
  if (!text && !image) return
  add({
    from,
    name: m.pushName || '',
    text: text || (image ? '(resim gönderildi)' : ''),
    jid: m.key.remoteJid || '',
    image,
  })
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['BestWork Bridge', 'Chrome', '1.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sockRef = sock

  sock.ev.on('connection.update', (u) => {
    const { connection, lastDisconnect, qr } = u
    if (qr) {
      currentQR = qr
      status = 'QR bekleniyor'
      console.log('QR hazır → http://localhost:' + PORT)
    }
    if (connection === 'open') {
      currentQR = null
      status = 'bağlı'
      console.log('WhatsApp bağlandı ✓')
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      status = 'bağlantı kapandı'
      if (code !== DisconnectReason.loggedOut) {
        console.log('Bağlantı koptu, yeniden deniyorum…')
        setTimeout(start, 2000)
      } else {
        console.log('Çıkış yapıldı; auth/ silinip yeniden QR gerekir.')
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (type !== 'notify') return
    for (const m of msgs) {
      if (m.key.fromMe) continue
      await record(m)
    }
  })
}

function page() {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BestWork WhatsApp Köprüsü</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,sans-serif;background:#f8fafc;margin:0;color:#0f172a}
  header{background:#1E8B5A;color:#fff;padding:14px 18px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
  .wrap{max-width:760px;margin:20px auto;padding:0 16px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:0 6px 20px -8px rgba(16,24,40,.14)}
  #qr img{width:240px;height:240px}
  .msg{border-bottom:1px solid #f1f5f9;padding:10px 4px;display:flex;gap:10px;align-items:flex-start}
  .meta{font-size:12px;color:#64748b}
  .txt{white-space:pre-wrap;margin-top:2px}
  .pill{background:#fff2;border-radius:999px;padding:2px 10px;font-size:12px}
  .done .txt{text-decoration:line-through;color:#94a3b8}
  .processing .txt{color:#b45309}
  .error .txt{color:#b91c1c}
  .tag{font-size:10px;font-weight:700;border-radius:999px;padding:1px 8px;white-space:nowrap}
  .t-done{background:#dcfce7;color:#166534}
  .t-processing{background:#fef3c7;color:#92400e}
  .t-pending{background:#e0f2fe;color:#075985}
  .t-error{background:#fee2e2;color:#991b1b}
  .t-ignored{background:#f1f5f9;color:#94a3b8}
  .ignored .txt{color:#cbd5e1}
  .ignored .meta{opacity:.6}
  .res{font-size:12px;background:#f8fafc;border:1px solid #eef2f7;border-radius:8px;padding:6px 8px;margin-top:6px;white-space:pre-wrap;color:#334155;max-height:220px;overflow:auto}
</style></head><body>
<header><span>BestWork · WhatsApp Köprüsü</span><span class="pill" id="status">…</span></header>
<div class="wrap">
  <div class="card" id="qr"><div style="font-weight:700;margin-bottom:8px">QR Kodu</div><div id="qrimg">yükleniyor…</div>
    <div class="meta" style="margin-top:8px">Telefon → WhatsApp → Bağlı Cihazlar → Cihaz Bağla → bu QR'ı okutun.</div></div>
  <div class="card"><div style="font-weight:700;margin-bottom:8px">Gelen Mesajlar</div><div id="list"></div></div>
</div>
<script>
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
async function tick(){
  try{const q=await (await fetch('/qr')).json();
    document.getElementById('status').textContent=q.status||'-';
    document.getElementById('qrimg').innerHTML=q.qr?('<img src="'+q.qr+'"/>'):'<span class="meta">QR yok (bağlı veya bekleniyor)</span>';
  }catch(e){}
  try{const d=await (await fetch('/messages')).json();
    const el=document.getElementById('list');
    el.innerHTML=(d.messages||[]).slice().reverse().map(m=>{
      const t=new Date(m.ts).toLocaleString('tr-TR');
      const st=m.status||'pending';
      const label={pending:'bekliyor',processing:'işleniyor',done:'yapıldı',error:'hata',ignored:'yok sayıldı'}[st]||st;
      return '<div class="msg '+st+'"><div style="flex:1"><div class="meta">'+t+' · '+m.from+' '+(m.name?('('+esc(m.name)+')'):'')+'</div><div class="txt">'+esc(m.text)+'</div>'+(m.result?('<div class="res">'+esc(m.result)+'</div>'):'')+'</div><span class="tag t-'+st+'">'+label+'</span></div>';
    }).join('')||'<div class="meta">Henüz mesaj yok.</div>';
  }catch(e){}
}
tick(); setInterval(tick, 2500);
</script></body></html>`
}

start()
