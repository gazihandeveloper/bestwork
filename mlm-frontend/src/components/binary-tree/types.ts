import type { TreeNode } from "@/services/api";

// Kart ve yerleşim sabitleri — tüm çizim bu değerlerden türetilir
export const CARD_W = 190;
export const CARD_H = 110;
export const AVATAR_R = 22;
export const PLACEHOLDER_W = 140;
export const PLACEHOLDER_H = 56;
export const LEVEL_GAP = 215; // seviyeler arası dikey mesafe
export const SIBLING_GAP = CARD_W + 40; // kardeşler arası yatay mesafe
export const ANIM_MS = 320;
export const LAZY_DEPTH = 2; // "+" rozetine tıklanınca sunucudan yüklenecek derinlik

export const COLORS = {
  root: "#274D24",
  left: "#2E7D32",
  right: "#B4552D",
  text: "#1B3A1E",
  subtext: "#5A6F5C",
  card: "#FFFFFF",
  divider: "#E3EAE2",
  placeholder: "#8FA891",
} as const;

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

/** setCollapsedBelowRoot kök hariç, çocuğu olan tüm düğümleri aç/kapat yapar. */
export function setCollapsedBelowRoot(root: BTNode, collapsed: boolean): void {
  const walk = (n: BTNode, depth: number) => {
    if (depth > 0 && n.children.length > 0) n.collapsed = collapsed;
    n.children.forEach((c) => walk(c, depth + 1));
  };
  walk(root, 0);
}
