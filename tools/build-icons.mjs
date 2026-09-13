#!/usr/bin/env node
// ============================================================
// BestWork ikon üretici — Lucide (derin ESM import)
//
// tools/lucide-esleme.json içindeki eşlemeyi okur ve her uygulama
// için TEK bir yerel ikon modülü üretir. Üretilen modül ikonları
// doğrudan Lucide'ın ikon-başına modüllerinden yeniden ihraç eder:
//
//   export { default as House } from 'lucide-react/dist/esm/icons/house.mjs'
//
// Böylece "barrel import" (import { House } from 'lucide-react')
// yapılmaz ve paketleyici YALNIZCA kullanılan ikonları paketler.
//
// Bu betik hiçbir ikon paketine ihtiyaç duymaz (bağımlılığı yoktur).
//
// Kullanım:
//   node tools/build-icons.mjs           # üret
//   node tools/build-icons.mjs --check   # üretilen dosyalar güncel mi?
// ============================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BURASI = dirname(fileURLToPath(import.meta.url))
const KOK = resolve(BURASI, '..')
const CHECK = process.argv.includes('--check')

const esleme = JSON.parse(readFileSync(join(BURASI, 'lucide-esleme.json'), 'utf8'))
const marka = JSON.parse(readFileSync(join(BURASI, 'brand-icons.json'), 'utf8'))

/** Lucide ikon modülünün gerçekten var olduğunu doğrula */
function lucideVarMi(uygulama, ad) {
  const p = join(KOK, uygulama, 'node_modules/lucide-react/dist/esm/icons', `${ad}.mjs`)
  return existsSync(p)
}

const baslik = (uygulama, adet, ek = '') => `// ============================================================
// BestWork ikonları — ${uygulama}
//
// ⚠️ BU DOSYA OTOMATİK ÜRETİLİR — elle düzenlemeyin.
//    Kaynak: tools/lucide-esleme.json · Üretici: tools/build-icons.mjs
//    Yeniden üretmek için:  node tools/build-icons.mjs
//
// Set     : Lucide (lucide.dev)
// Yöntem  : Derin ESM import — yalnızca kullanılan ikonlar paketlenir
//           ("barrel import" YOK, tüm set asla pakete girmez).
// İkon sayısı: ${adet}${ek}
// ============================================================
`

/** Tip bildirimi: derin import'lar için (Lucide ikon modülleri .d.ts taşımıyor) */
const tipBildirimi = `// Lucide ikon-başına modüllerinin tip bildirimi.
// lucide-react kök paketi tipleri barrel üzerinden verir; derin
// import'larda tip kaybolduğu için burada tanımlıyoruz.
declare module "lucide-react/dist/esm/icons/*.mjs" {
  import type { LucideIcon } from "lucide-react";
  const Icon: LucideIcon;
  export default Icon;
}
`

/** Marka ikonları: Lucide marka ikonu içermediği için yerel bileşen */
function markaModulu(liste) {
  const govdeler = Object.entries(liste).map(([isim, ad]) => {
    const veri = marka[ad]
    if (!veri) throw new Error(`marka verisi yok: ${ad}`)
    const yollar = veri.yol.map((d) => `      <path d="${d}" />`).join('\n')
    return `/** ${isim} — marka işareti (Lucide marka ikonu içermez) */
export function ${isim}({ size = 24, className, title, ...rest }: BrandIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${veri.w} ${veri.h}"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
${yollar}
    </svg>
  )
}`
  })

  return `// ============================================================
// BestWork marka ikonları (marka işaretleri)
//
// ⚠️ BU DOSYA OTOMATİK ÜRETİLİR — kaynak: tools/brand-icons.json
//
// Lucide marka/logo ikonu barındırmadığı için bu işaretler yerel SVG
// bileşeni olarak tutulur. Uygulamadaki tüm ikon kullanımı yine
// @/components/icons üzerinden yapılır.
//
// Kaynak: Font Awesome Free — Brands (CC BY 4.0, https://fontawesome.com)
// Marka işaretleri ilgili sahiplerinin tescilli markalarıdır.
// ============================================================
import type { SVGProps } from "react";

export interface BrandIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Kenar uzunluğu (px). Varsayılan 24. */
  size?: number | string
  title?: string
}

${govdeler.join('\n\n')}
`
}

const yazVeyaDenetle = (yol, icerik) => {
  const tam = resolve(KOK, yol)
  if (CHECK) {
    const mevcut = existsSync(tam) ? readFileSync(tam, 'utf8') : ''
    if (mevcut !== icerik) {
      console.error(`✗ ${yol} güncel değil — 'node tools/build-icons.mjs' çalıştırın`)
      return 1
    }
    console.log(`✓ ${yol} güncel`)
    return 0
  }
  mkdirSync(dirname(tam), { recursive: true })
  writeFileSync(tam, icerik, 'utf8')
  console.log(`✓ ${yol} yazıldı`)
  return 0
}

let hata = 0

// ---------- eshop ----------
{
  const kayitlar = Object.entries(esleme.eshop).sort(([a], [b]) => a.localeCompare(b))
  const eksik = kayitlar.filter(([, lucide]) => !lucideVarMi('eshop', lucide))
  if (eksik.length) {
    console.error(`✗ eshop: Lucide'da bulunamayan ikonlar: ${eksik.map(([a, l]) => `${a}->${l}`).join(', ')}`)
    hata++
  } else {
    const satirlar = kayitlar.map(([ad, lucide]) => `export { default as ${ad} } from "lucide-react/dist/esm/icons/${lucide}.mjs";`)
    const eshopMarka = esleme['marka-eshop'] || {}
    const markaSatiri = Object.keys(eshopMarka).length
      ? `\n// Marka işaretleri (Lucide marka ikonu içermez)\nexport { ${Object.keys(eshopMarka).join(', ')} } from "./brand-icons";\n`
      : ''
    hata += yazVeyaDenetle(
      'eshop/src/components/icons/index.tsx',
      `${baslik('eshop', kayitlar.length, Object.keys(eshopMarka).length ? ` (+${Object.keys(eshopMarka).length} marka işareti)` : '')}\n${satirlar.join('\n')}\n${markaSatiri}`
    )
    if (Object.keys(eshopMarka).length) hata += yazVeyaDenetle('eshop/src/components/icons/brand-icons.tsx', markaModulu(eshopMarka))
    hata += yazVeyaDenetle('eshop/src/types/lucide-deep.d.ts', tipBildirimi)
  }
}

// ---------- yönetim paneli ----------
{
  const kayitlar = Object.entries(esleme.panel).sort(([a], [b]) => a.localeCompare(b))
  const eksik = kayitlar.filter(([, lucide]) => !lucideVarMi('mlm-yonetim-new', lucide))
  if (eksik.length) {
    console.error(`✗ panel: Lucide'da bulunamayan ikonlar: ${eksik.map(([a, l]) => `${a}->${l}`).join(', ')}`)
    hata++
  } else {
    const satirlar = kayitlar.map(([ad, lucide]) => `export { default as ${ad} } from "lucide-react/dist/esm/icons/${lucide}.mjs";`)
    const markaSatiri = `\n// Marka işaretleri (Lucide marka ikonu içermez)\nexport { ${Object.keys(esleme.marka).join(', ')} } from "./brand-icons";\n`
    hata += yazVeyaDenetle(
      'mlm-yonetim-new/src/components/icons/index.tsx',
      `${baslik('mlm-yonetim-new', kayitlar.length, ` (+${Object.keys(marka).length} marka işareti)`) }\n${satirlar.join('\n')}\n${markaSatiri}`
    )
    hata += yazVeyaDenetle('mlm-yonetim-new/src/components/icons/brand-icons.tsx', markaModulu(esleme.marka))
    hata += yazVeyaDenetle('mlm-yonetim-new/src/types/lucide-deep.d.ts', tipBildirimi)
  }
}

if (hata) process.exit(1)
console.log(CHECK ? '\nTüm dosyalar güncel.' : '\nTamamlandı.')
