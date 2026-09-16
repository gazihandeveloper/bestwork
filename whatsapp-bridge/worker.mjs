// ============================================
// BestWork - WhatsApp İşleyici (worker)
//
// Kural: Yalnızca "panda" ile başlayan mesajlar istek sayılır (virgüllü/
// virgülsüz, büyük/küçük harf fark etmez). "panda" öneki atılır; kalan istek
// opencode ile başsız uygulanır; sonra gönderene "yapıldı" mesajı atılır.
// İstek olmayan mesajlar "ignored" olarak işaretlenir (üzeri çizilmez, soluk).
//
// Çalıştırma:  cd whatsapp-bridge && node worker.mjs
// ============================================
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BRIDGE = process.env.WA_BRIDGE || 'http://localhost:4599'
const REPO = process.env.WA_REPO || '/Users/mahmutgazihanarslan/Desktop/Bestwork'
const MODEL = process.env.WA_MODEL || 'deepseek/deepseek-v4-flash'
const LOG_DIR =
  process.env.WA_LOG_DIR || '/Users/mahmutgazihanarslan/Library/Logs/bestwork'
const LOG = process.env.WA_WORKER_LOG || path.join(LOG_DIR, 'wa-worker.log')
const OPENCODE = process.env.WA_OPENCODE || '/opt/homebrew/bin/opencode'
const EXTRA_PATH = ':/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'

// Kalıcı güçlü session: her iş aynı opencode oturumunu sürdürür (bağlam hafızada kalır).
const SESSION_FILE = path.join(LOG_DIR, 'wa-session.id')
function readSession() {
  try {
    return fs.readFileSync(SESSION_FILE, 'utf8').trim()
  } catch {
    return ''
  }
}
function saveSession(id) {
  try {
    fs.writeFileSync(SESSION_FILE, String(id).trim())
  } catch {
    /* yoksay */
  }
}

fs.mkdirSync(LOG_DIR, { recursive: true })

const isPanda = (t) => /^\s*panda\b/i.test(t)

async function pending() {
  const r = await fetch(BRIDGE + '/pending')
  return (await r.json()).messages || []
}
async function setStatus(id, status) {
  await fetch(BRIDGE + '/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  })
}
async function setResult(id, result) {
  try {
    await fetch(BRIDGE + '/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, result }),
    })
  } catch {
    /* yoksay */
  }
}
async function sendWhatsApp(jid, text) {
  if (!jid) return
  try {
    await fetch(BRIDGE + '/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid, text }),
    })
  } catch {
    /* yoksay */
  }
}

function runOpencode(text) {
  return new Promise((resolve) => {
    const prompt =
      'Bestwork projesinde WhatsApp üzerinden gelen bir istek var. Sırayı aynen uygula:\n' +
      '1) İlgili dosyayı bul, isteği minimal uygula.\n' +
      '2) YEREL doğrula: eshop için `npm run build`; gerekiyorsa `curl -s localhost:3000/` ile kontrol et.\n' +
      '3) Yerel build başarılıysa GIT + SUNUCU için tek komut: ' +
      '`bash /Users/mahmutgazihanarslan/Desktop/Bestwork/whatsapp-bridge/deploy-now.sh "kisa commit mesaji"` ' +
      '(commit + GitHub push + hızlı sunucu deploy).\n' +
      '4) Çıktıda DONE ve BUILD=OK görürsen başarılı say.\n' +
      '5) Tek satır Türkçe özet ver: "Yapıldı: ..." veya "Yapılamadı: ...".\n' +
      'WhatsApp mesajını SEN GÖNDERME.\n\n' +
      `İSTEK: ${text}`
    const sessionId = readSession()
    const sargs = sessionId ? ['-s', sessionId] : []
    const p = spawn(
      OPENCODE,
      ['run', '--auto', '--format', 'json', '--thinking', '-m', MODEL, '--agent', 'whatsapp-task', ...sargs, prompt],
      {
        cwd: REPO,
        env: { ...process.env, PATH: (process.env.PATH || '') + EXTRA_PATH },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
    let raw = ''
    let readable = ''
    let buf = ''
    const fmt = (line) => {
      const t = line.trim()
      if (!t) return
      let ev
      try {
        ev = JSON.parse(t)
      } catch {
        readable += `\n${t}`
        fs.appendFileSync(LOG, `\n   ${t}`)
        return
      }
      const part = ev.part || {}
      const type = ev.type || part.type
      if (ev.sessionID) saveSession(ev.sessionID)
      let text = ''
      if (type === 'reasoning' && part.text) text = `🧠 ${part.text.trim()}`
      else if (type === 'text' && part.text) text = `💬 ${part.text.trim()}`
      else if (type === 'tool' || type === 'tool_use' || part.type === 'tool')
        text = `🔧 ${part.tool || part.name || 'araç'} ${JSON.stringify(
          part.state?.input || part.input || {}
        ).slice(0, 400)}`
      else if (type === 'error') text = `❗ ${JSON.stringify(ev).slice(0, 400)}`
      else if (type === 'step_start') text = '— adım'
      if (!text) return
      readable += `\n${text}`
      fs.appendFileSync(LOG, `\n${text}`)
    }
    p.stdout.on('data', (d) => {
      const s = d.toString()
      raw += s
      buf += s
      const lines = buf.split('\n')
      buf = lines.pop()
      lines.forEach(fmt)
    })
    p.stderr.on('data', (d) => {
      raw += d.toString()
    })
    p.on('error', (err) => {
      fs.appendFileSync(LOG, `\n[spawn hata] ${err}`)
      resolve({ ok: false, out: `opencode başlatılamadı: ${err}` })
    })
    const to = setTimeout(() => {
      try {
        p.kill('SIGKILL')
      } catch {
        /* yoksay */
      }
    }, 15 * 60 * 1000)
    p.on('close', (code) => {
      clearTimeout(to)
      if (buf.trim()) fmt(buf)
      // Panele yalnızca kısa sonuç gider (düşünce/akış log dosyasında kalır).
      const lines = readable
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      const lastText =
        [...lines].reverse().find((l) => l.startsWith('💬')) || lines[lines.length - 1] || ''
      const summary = lastText.replace(/^💬\s*/, '').replace(/^🔧\s*/, '').slice(0, 500)
      fs.appendFileSync(
        LOG,
        `\n==== [${new Date().toISOString()}] code=${code} (ham çıktı ${raw.length}b)\n`
      )
      resolve({ ok: code === 0, out: summary })
    })
  })
}

async function loop() {
  for (;;) {
    try {
      const list = await pending()
      for (const m of list) {
        const t = (m.text || '').trim()
        // Yalnızca "panda" ile başlayanlar istek sayılır.
        if (!isPanda(t)) {
          await setStatus(m.id, 'ignored')
          continue
        }
        const request = t.replace(/^panda\s*,?\s*/i, '').trim()
        if (!request) {
          await setStatus(m.id, 'ignored')
          continue
        }
        fs.appendFileSync(
          LOG,
          `\n>> [${new Date().toISOString()}] başladı: ${request}`
        )
        await setStatus(m.id, 'processing')
        const t0 = Date.now()
        const { ok, out } = await runOpencode(request)
        const secs = ((Date.now() - t0) / 1000).toFixed(0)
        fs.appendFileSync(
          LOG,
          `\n<< [${new Date().toISOString()}] bitti: süre=${secs}s sonuç=${ok ? 'OK' : 'FAIL'} | ${request}\n`
        )
        await sendWhatsApp(
          m.jid,
          ok ? 'İş emriniz tamamlandı 😊' : `⚠️ İş emri tamamlanamadı: ${request}`
        )
        await setStatus(m.id, ok ? 'done' : 'error')
      }
    } catch (e) {
      fs.appendFileSync(LOG, `\n[loop hata] ${e}`)
    }
    await new Promise((r) => setTimeout(r, 8000))
  }
}

fs.appendFileSync(LOG, `\n[worker başladı] ${new Date().toISOString()}\n`)
loop()
