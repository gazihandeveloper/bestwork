// ============================================
// BestWork - Binary Ağaç: tipler, sabitler, yardımcılar
//
// API SÖZLEŞMESİ (mlm-backend/internal/models/dashboard.go → TreeNode):
//   GET /tree/level?id=&month=  → { node, min_month }
//   node.left_child / right_child yalnızca BİR seviye derinlikte dolu gelir;
//   her çocuğun kendi alt-çocuğu var mı bilgisi has_left / has_right ile taşınır.
// Bu yüzden ağaç "düğüm düğüm" büyütülür; tüm alt ağaç asla çekilmez.
// ============================================

export interface TreeNode {
  user_id: number
  name: string
  member_code: string
  position: string | null
  package: string | null
  rank: string | null
  image_path?: string | null
  total_pv_accumulated: number
  total_cv_accumulated: number
  total_pv_left: number
  total_pv_right: number
  total_cv_left: number
  total_cv_right: number
  is_active: boolean
  role: string
  has_left: boolean
  has_right: boolean
  left_child: TreeNode | null
  right_child: TreeNode | null
}

// Normalize edilmiş düğüm: çocuk nesnesi yerine yalnızca kimlik saklanır.
// Böylece düğümler tek bir düzlemde birleştirilir (derin iç içe kopya yok).
export interface NodeRec {
  user_id: number
  name: string
  member_code: string
  position: string | null
  package: string | null
  rank: string | null
  image_path: string | null
  total_pv_accumulated: number
  total_cv_accumulated: number
  total_pv_left: number
  total_pv_right: number
  total_cv_left: number
  total_cv_right: number
  is_active: boolean
  role: string
  has_left: boolean
  has_right: boolean
  leftId: number | null
  rightId: number | null
}

export interface SearchResult {
  node: TreeNode
  path: number[]
}

/** Kart ölçüleri — d3 yerleşimi ve foreignObject bu değerleri kullanır. */
export const CARD_W = 188
export const CARD_H = 84
export const FO_PAD = 14
export const FO_W = CARD_W + FO_PAD * 2
export const FO_H = CARD_H + FO_PAD * 2
export const H_GAP = 32
export const V_GAP = 62
export const NODE_DX = CARD_W + H_GAP
export const NODE_DY = CARD_H + V_GAP

/** Yüklenen görsel yolunu tam adrese çevirir (uploads/... → https://…/uploads/...). */
const UPLOAD_BASE = 'https://mahmutgazihanarslan.com.tr'
export function toAbs(p?: string | null): string | null {
  if (!p) return null
  if (/^https?:\/\//.test(p)) return p
  return UPLOAD_BASE + (p.startsWith('/') ? '' : '/') + p
}

export function initials(name?: string) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('tr-TR')
}

export const fmt = (v?: number) => (Number(v) || 0).toLocaleString('tr-TR')

/** Bacak oranı — sol/sağ leg PV toplamına göre. İki bacak da boşsa yön belirsiz. */
export function legStats(rec: NodeRec) {
  const l = Number(rec.total_pv_left) || 0
  const r = Number(rec.total_pv_right) || 0
  const tot = l + r
  if (tot <= 0) return { sol: 0, sag: 0, weak: '—' }
  const sol = Math.round((l / tot) * 100)
  return { sol, sag: 100 - sol, weak: l === r ? 'EŞİT' : l < r ? 'SOL' : 'SAĞ' }
}
