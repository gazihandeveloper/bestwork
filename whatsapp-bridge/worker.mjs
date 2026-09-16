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

const BRIDGE = process.env.WA_BRIDGE || 'http://localhost:4599'
const REPO = process.env.WA_REPO || '/Users/mahmutgazihanarslan/Desktop/Bestwork'
const MODEL = process.env.WA_MODEL || 'deepseek/deepseek-flash'
const LOG = process.env.WA_WORKER_LOG || '/tmp/wa-worker.log'
const OPENCODE = process.env.WA_OPENCODE || '/opt/homebrew/bin/opencode'
const EXTRA_PATH = ':/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'

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
      'Aşağıda WhatsApp üzerinden gelen bir istek var. Bu Bestwork projesinde (çalışma dizini) ' +
      'isteği uygula: gerekli kod değişikliğini yap, doğrula (npm run build / go build) ve ' +
      'gerekiyorsa sunucuya deploy et. Sonunda kısa bir özet ver.\n\n' +
      `İSTEK: ${text}`
    const p = spawn(OPENCODE, ['run', '--auto', '--agent', 'whatsapp-task', prompt], {
      cwd: REPO,
      env: { ...process.env, PATH: (process.env.PATH || '') + EXTRA_PATH },
    })
    let out = ''
    p.stdout.on('data', (d) => (out += d))
    p.stderr.on('data', (d) => (out += d))
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
      fs.appendFileSync(
        LOG,
        `\n==== [${new Date().toISOString()}] code=${code}\nISTEK: ${text}\n${out}\n`
      )
      resolve({ ok: code === 0, out })
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
        fs.appendFileSync(LOG, `\n>> işleniyor: ${request}`)
        await setStatus(m.id, 'processing')
        const { ok, out } = await runOpencode(request)
        await setResult(m.id, out)
        await sendWhatsApp(m.jid, ok ? `✅ Yapıldı: ${request}` : `⚠️ Yapılamadı: ${request}`)
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
