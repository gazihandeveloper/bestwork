import type { TreeNode } from "@/services/api";

// Kart ve yerleşim sabitleri — tüm çizim bu değerlerden türetilir
export const CARD_W = 126;
export const CARD_H = 92;
export const AVATAR_R = 12;
export const PLACEHOLDER_W = 108;
export const PLACEHOLDER_H = 38;
export const LEVEL_GAP = CARD_H + 30; // seviyeler arası dikey mesafe (ilk 4 seviye ekrana sığar)
export const SIBLING_GAP = CARD_W + 22; // kardeşler arası yatay mesafe
export const ANIM_MS = 320;
export const LAZY_DEPTH = 2; // "+" rozetine tıklanınca sunucudan yüklenecek derinlik

export interface TreeColors {
  root: string;
  left: string;
  right: string;
  text: string;
  subtext: string;
  card: string;
  divider: string;
  placeholder: string;
  statusActive: string;
  statusPassive: string;
  legLeft: string;
  legRight: string;
}

export const COLORS: TreeColors = {
  root: "#274D24",
  left: "#2E7D32",
  right: "#B4552D",
  text: "#1B3A1E",
  subtext: "#5A6F5C",
  card: "#FFFFFF",
  divider: "#E3EAE2",
  placeholder: "#8FA891",
  statusActive: "#2E9E57",
  statusPassive: "#C62828",
  legLeft: "#3A7BD5",
  legRight: "#E8A33D",
};

/** DARK_COLORS karanlık modda kart ve metinlerin okunabilir kalması için kullanılır. */
export const DARK_COLORS: TreeColors = {
  root: "#6FA26A",
  left: "#52A85C",
  right: "#DE7F4E",
  text: "#E6EDE3",
  subtext: "#A4B5A1",
  card: "#1D2A1E",
  divider: "#33463A",
  placeholder: "#7FA085",
  statusActive: "#3EC26E",
  statusPassive: "#E05A5A",
  legLeft: "#63A0E8",
  legRight: "#E8B054",
};

/** BTNode ağacın iç temsilidir; API TreeNode'dan bir kez dönüştürülür ve yerinde mutasyona uğrar. */
export interface BTNode {
  id: string;
  userId: number;
  name: string;
  memberCode: string;
  position: "L" | "R" | null;
  packageName: string | null;
  rank: string | null;
  imagePath: string | null;
  pv: number;
  cv: number;
  pvLeft: number;
  pvRight: number;
  cvLeft: number;
  cvRight: number;
  isActive: boolean;
  role: string;
  /** Boş bacak göstergesi — gerçek kullanıcı değildir. */
  placeholder: boolean;
  /** Derinlik sınırında kaldı: alt ağacı sunucudan tembel yüklenebilir. */
  boundary: boolean;
  loading: boolean;
  collapsed: boolean;
  children: BTNode[];
}

/** toBTNode API ağacını iç temsile çevirir; depth sınırındaki düğümleri boundary işaretler. */
export function toBTNode(src: TreeNode, remainingDepth: number, position: "L" | "R" | null = null): BTNode {
  const children: BTNode[] = [];
  if (src.left_child) children.push(toBTNode(src.left_child, remainingDepth - 1, "L"));
  if (src.right_child) children.push(toBTNode(src.right_child, remainingDepth - 1, "R"));
  const pos = position ?? (src.position === "L" || src.position === "R" ? src.position : null);
  return {
    id: String(src.user_id),
    userId: src.user_id,
    name: src.name,
    memberCode: src.member_code,
    position: pos,
    packageName: src.package,
    rank: src.rank,
    imagePath: src.image_path,
    pv: src.total_pv_accumulated ?? 0,
    cv: src.total_cv_accumulated ?? 0,
    pvLeft: src.total_pv_left ?? 0,
    pvRight: src.total_pv_right ?? 0,
    cvLeft: src.total_cv_left ?? 0,
    cvRight: src.total_cv_right ?? 0,
    isActive: src.is_active,
    role: src.role,
    placeholder: false,
    // Derinlik sınırında çocuklar API'den null gelir; gerçekte var olabilirler
    boundary: remainingDepth <= 0 && children.length === 0,
    loading: false,
    collapsed: false,
    children,
  };
}

/** graftChildren tembel yüklenen alt ağacı mevcut düğüme aşılar. */
export function graftChildren(node: BTNode, fetched: TreeNode, depth: number): void {
  const sub = toBTNode(fetched, depth, node.position);
  node.children = sub.children;
  node.boundary = false;
  node.loading = false;
}

function makePlaceholder(parent: BTNode, position: "L" | "R"): BTNode {
  return {
    id: `${parent.id}:ph:${position}`,
    userId: -1,
    name: "",
    memberCode: "",
    position,
    packageName: null,
    rank: null,
    imagePath: null,
    pv: 0,
    cv: 0,
    pvLeft: 0,
    pvRight: 0,
    cvLeft: 0,
    cvRight: 0,
    isActive: false,
    role: "",
    placeholder: true,
    boundary: false,
    loading: false,
    collapsed: false,
    children: [],
  };
}

/**
 * visibleChildren yerleşimde gösterilecek çocukları döndürür.
 * Daraltılmış veya henüz yüklenmemiş (boundary) düğümlerde boş liste döner.
 * En az bir bacak doluysa (veya kök boşsa) eksik bacak için boş pozisyon eklenir.
 */
export function visibleChildren(node: BTNode, isRoot = false): BTNode[] {
  if (node.placeholder || node.collapsed || node.boundary) return [];
  const left = node.children.find((c) => c.position === "L") ?? null;
  const right = node.children.find((c) => c.position === "R") ?? null;
  if (!left && !right && !isRoot) return [];
  return [left ?? makePlaceholder(node, "L"), right ?? makePlaceholder(node, "R")];
}

/** countDescendants yüklü alt üye sayısını döndürür (boş pozisyonlar hariç). */
export function countDescendants(node: BTNode): number {
  return node.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}

/**
 * setCollapsedBelowRoot keepDepth'ten derin olan, çocuğu bulunan düğümleri aç/kapat yapar.
 * keepDepth=0 (varsayılan) kök hariç her şeyi kapatır; keepDepth=1 ile kök + 2 seviye (7 kişi) görünür kalır.
 */
export function setCollapsedBelowRoot(root: BTNode, collapsed: boolean, keepDepth = 0): void {
  const walk = (n: BTNode, depth: number) => {
    if (depth > keepDepth && n.children.length > 0) n.collapsed = collapsed;
    n.children.forEach((c) => walk(c, depth + 1));
  };
  walk(root, 0);
}
