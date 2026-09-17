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
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BRIDGE = process.env.WA_BRIDGE || 'http://localhost:4599'
const REPO = process.env.WA_REPO || '/Users/mahmutgazihanarslan/Desktop/Bestwork'
const MODEL = process.env.WA_MODEL || 'deepseek/deepseek-v4-flash'
const VISION_MODEL = process.env.WA_VISION_MODEL || 'deepseek/deepseek-v4-flash-vision-exp'
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

// Doğrulama: iş gerçekten commit + sunucuya gitti mi?
const SERVER = process.env.WA_SERVER || 'root@212.154.77.35'
const ASKPASS =
  process.env.WA_ASKPASS || '/Users/mahmutgazihanarslan/Desktop/Bestwork/.ssh/askpass.sh'
const SSH_OPTS = [
  '-o',
  'StrictHostKeyChecking=no',
  '-o',
  'UserKnownHostsFile=/dev/null',
  '-o',
  'ConnectTimeout=20',
  '-o',
  'PreferredAuthentications=password',
  '-o',
  'PubkeyAuthentication=no',
]
function git(rev) {
  try {
    return execFileSync('git', ['-C', REPO, 'rev-parse', rev], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}
function dirty() {
  try {
    return execFileSync('git', ['-C', REPO, 'status', '--porcelain'], { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}
function serverHead() {
  try {
    return execFileSync(
      'ssh',
      [...SSH_OPTS, SERVER, 'cd /opt/bestwork-src && git rev-parse origin/main'],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          SSH_ASKPASS: ASKPASS,
          SSH_ASKPASS_REQUIRE: 'force',
          DISPLAY: ':0',
        },
      }
    ).trim()
  } catch {
    return ''
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

function runOpencode(text, image) {
  return new Promise((resolve) => {
    const prompt =
      'Bestwork projesinde WhatsApp üzerinden gelen bir istek var. Sırayı aynen uygula:\n' +
      (image
        ? '0) Sana bir GÖRSEL (ekran görüntüsü olabilir) eklenmiştir; önce resmi dikkatle incele, ' +
          'üzerindeki metin/alan/butonları oku ve isteği ona göre uygula.\n'
        : '') +
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
    const model = image ? VISION_MODEL : MODEL
    const fileArgs = image ? ['-f', image] : []
    const p = spawn(
      OPENCODE,
      ['run', '--auto', '--format', 'json', '--thinking', '-m', model, '--agent', 'whatsapp-task', ...fileArgs, ...sargs, prompt],
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

async function requeueStale() {
  try {
    const r = await fetch(BRIDGE + '/messages')
    const ms = (await r.json()).messages || []
    const stuck = ms.filter((x) => x.status === 'processing')
    for (const m of stuck) {
      await setStatus(m.id, 'pending')
      fs.appendFileSync(LOG, `\n[requeue] takılı processing -> pending: ${m.text}`)
    }
    if (stuck.length) fs.appendFileSync(LOG, `\n[requeue] ${stuck.length} mesaj yeniden kuyruğa alındı`)
  } catch (e) {
    fs.appendFileSync(LOG, `\n[requeue hata] ${e}`)
  }
}

async function loop() {
  for (;;) {
    try {
      const list = await pending()
      for (const m of list) {
        const t = (m.text || '').trim()
        const hasImage = !!m.image
        // "panda" ile başlayanlar VEYA görsel içeren mesajlar istek sayılır.
        if (!isPanda(t) && !hasImage) {
          await setStatus(m.id, 'ignored')
          continue
        }
        const request = isPanda(t) ? t.replace(/^panda\s*,?\s*/i, '').trim() : t
        if (!request && !hasImage) {
          await setStatus(m.id, 'ignored')
          continue
        }
        fs.appendFileSync(
          LOG,
          `\n>> [${new Date().toISOString()}] başladı: ${request}${hasImage ? ' [resim]' : ''}`
        )
        await setStatus(m.id, 'processing')
        const t0 = Date.now()
        const headBefore = git('HEAD')
        const dirtyBefore = dirty().split('\n').filter(Boolean)
        const { ok } = await runOpencode(
          request || 'Ekli görseli incele; görselde bir sorun/istek varsa düzelt.',
          m.image
        )
        const secs = ((Date.now() - t0) / 1000).toFixed(0)
        // Gerçek doğrulama: kod değiştiyse commit edilmiş + sunucuya gitmiş olmalı.
        const headAfter = git('HEAD')
        let verified = ok
        let note = ''
        if (ok && headAfter && headAfter !== headBefore) {
          let sh = ''
          for (let k = 0; k < 8 && sh !== headAfter; k++) {
            sh = serverHead()
            if (sh !== headAfter) await sleep(4000)
          }
          verified = sh === headAfter
          note = verified ? 'sunucuda doğrulandı' : 'commit var ama SUNUCUYA GİTMEDİ'
        } else if (ok) {
          const added = dirty()
            .split('\n')
            .filter(Boolean)
            .filter((l) => !dirtyBefore.includes(l))
          verified = added.length === 0
          note = verified ? 'kod değişikliği yok' : 'değişiklik commit edilmedi (yayına gitmedi)'
        }
        fs.appendFileSync(
          LOG,
          `\n<< [${new Date().toISOString()}] bitti: süre=${secs}s sonuç=${
            verified ? 'OK' : 'FAIL'
          }${note ? ' (' + note + ')' : ''} | ${request}\n`
        )
        await sendWhatsApp(
          m.jid,
          verified
            ? 'İş emriniz tamamlandı 😊'
            : `⚠️ İş emri tamamlanamadı (yayına alınamadı): ${request}`
        )
        await setStatus(m.id, verified ? 'done' : 'error')
      }
    } catch (e) {
      fs.appendFileSync(LOG, `\n[loop hata] ${e}`)
    }
    await new Promise((r) => setTimeout(r, 8000))
  }
}

fs.appendFileSync(LOG, `\n[worker başladı] ${new Date().toISOString()}\n`)
await requeueStale()
loop()
