import * as d3 from "d3";
import { fileUrl } from "@/services/api";
import {
  ANIM_MS,
  AVATAR_R,
  CARD_H,
  CARD_W,
  COLORS,
  LEVEL_GAP,
  PLACEHOLDER_H,
  PLACEHOLDER_W,
  SIBLING_GAP,
  countDescendants,
  visibleChildren,
  type BTNode,
} from "./types";

type SvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;
type GSel = d3.Selection<SVGGElement, unknown, null, undefined>;
type HNode = d3.HierarchyPointNode<BTNode>;
type HLink = d3.HierarchyPointLink<BTNode>;

export interface RendererCallbacks {
  /** Kartı aç/kapat veya tembel yükleme tetiklenir. */
  onNodeClick: (node: BTNode) => void;
  onHover: (event: MouseEvent, node: BTNode) => void;
  onHoverMove: (event: MouseEvent) => void;
  onHoverEnd: () => void;
  /** Boş pozisyon "+" tıklandığında: o bacağa üye yerleştirilmek istenir. */
  onPlaceholderClick: (parentId: number, position: "L" | "R") => void;
}

function accent(d: HNode): string {
  if (d.depth === 0) return COLORS.root;
  return d.data.position === "R" ? COLORS.right : COLORS.left;
}

function truncate(v: string, max: number): string {
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function linkPath(sx: number, sy: number, tx: number, ty: number, targetPlaceholder: boolean): string {
  const y0 = sy + CARD_H / 2;
  const y1 = ty - (targetPlaceholder ? PLACEHOLDER_H : CARD_H) / 2;
  const my = (y0 + y1) / 2;
  return `M ${sx},${y0} C ${sx},${my} ${tx},${my} ${tx},${y1}`;
}

/**
 * BinaryTreeRenderer sahneyi bir kez kurar; her render() çağrısında yalnızca
 * değişen düğüm/bağlantıları keyed join + transition ile günceller.
 * SVG asla sıfırlanmadığı için zoom/pan durumu korunur ve arayüz kilitlenmez.
 */
export class BinaryTreeRenderer {
  private svg: SvgSel;
  private zoomLayer: GSel;
  private linkLayer: GSel;
  private nodeLayer: GSel;
  private defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;
  private zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private layout = d3
    .tree<BTNode>()
    .nodeSize([SIBLING_GAP, LEVEL_GAP])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.12));
  private prevPos = new Map<string, { x: number; y: number }>();
  private currentNodes: HNode[] = [];
  private clipIds = new Set<string>();
  private cb: RendererCallbacks;
  private measure: () => { w: number; h: number };

  constructor(svgEl: SVGSVGElement, cb: RendererCallbacks, measure: () => { w: number; h: number }) {
    this.cb = cb;
    this.measure = measure;
    this.svg = d3.select(svgEl);
    this.svg.selectAll("*").remove();

    this.defs = this.svg.append("defs");
    const shadow = this.defs
      .append("filter")
      .attr("id", "bt-card-shadow")
      .attr("x", "-30%")
      .attr("y", "-30%")
      .attr("width", "160%")
      .attr("height", "160%");
    shadow
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 2)
      .attr("stdDeviation", 4)
      .attr("flood-opacity", 0.14)
      .attr("flood-color", COLORS.root);

    this.zoomLayer = this.svg.append("g").attr("class", "bt-zoom");
    this.linkLayer = this.zoomLayer.append("g").attr("class", "bt-links");
    this.nodeLayer = this.zoomLayer.append("g").attr("class", "bt-nodes");

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2.5])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.zoomLayer.attr("transform", event.transform.toString());
      });
    this.svg.call(this.zoom).on("dblclick.zoom", null);
  }

  destroy(): void {
    this.svg.on(".zoom", null);
    this.svg.selectAll("*").interrupt();
    this.svg.selectAll("*").remove();
  }

  /** render ağacı yeniden yerleştirir; sourceId animasyonların çıkış noktasıdır. */
  render(rootData: BTNode, sourceId?: string): void {
    const root = d3.hierarchy(rootData, (n) => visibleChildren(n, n === rootData));
    this.layout(root);
    const nodes = root.descendants() as HNode[];
    const links = root.links() as HLink[];
    this.currentNodes = nodes;

    const origin = this.prevPos.get(sourceId ?? rootData.id) ?? { x: 0, y: 0 };
    const posOf = (id: string) => this.prevPos.get(id) ?? origin;
    const anim = <E extends d3.BaseType, D>(sel: d3.Selection<E, D, SVGGElement, unknown>) =>
      sel.transition().duration(ANIM_MS).ease(d3.easeCubicOut);

    // --- Bağlantılar ---
    const link = this.linkLayer
      .selectAll<SVGPathElement, HLink>("path.bt-link")
      .data(links, (d) => d.target.data.id);

    link
      .enter()
      .append("path")
      .attr("class", "bt-link")
      .attr("fill", "none")
      .attr("stroke", "#9DBB9F")
      .attr("stroke-width", 1.6)
      .attr("stroke-dasharray", (d) => (d.target.data.placeholder ? "5 5" : null))
      .attr("opacity", 0)
      .attr("d", (d) => {
        const p = posOf(d.source.data.id);
        return linkPath(p.x, p.y, p.x, p.y, d.target.data.placeholder);
      })
      .merge(link)
      .call((s) =>
        anim(s)
          .attr("opacity", (d) => (d.target.data.placeholder ? 0.55 : 1))
          .attr("d", (d) => linkPath(d.source.x, d.source.y, d.target.x, d.target.y, d.target.data.placeholder)),
      );

    link
      .exit<HLink>()
      .call((s) =>
        anim(s)
          .attr("opacity", 0)
          .attr("d", (d) => {
            const p = posOf(d.source.data.id);
            return linkPath(p.x, p.y, p.x, p.y, d.target.data.placeholder);
          })
          .remove(),
      );

    // --- Düğümler ---
    const node = this.nodeLayer
      .selectAll<SVGGElement, HNode>("g.bt-node")
      .data(nodes, (d) => d.data.id);

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "bt-node")
      .attr("opacity", 0)
      .attr("transform", (d) => {
        const p = posOf(d.parent?.data.id ?? d.data.id);
        return `translate(${p.x},${p.y})`;
      });

    nodeEnter.filter((d) => !d.data.placeholder).call((s) => this.buildCard(s));
    nodeEnter.filter((d) => d.data.placeholder).call((s) => this.buildPlaceholder(s));

    const nodeMerge = nodeEnter.merge(node);
    nodeMerge.call((s) => anim(s).attr("opacity", 1).attr("transform", (d) => `translate(${d.x},${d.y})`));
    nodeMerge.filter((d) => !d.data.placeholder).call((s) => this.updateBadge(s));

    node
      .exit<HNode>()
      .call((s) =>
        anim(s)
          .attr("opacity", 0)
          .attr("transform", (d) => {
            const p = posOf(d.parent?.data.id ?? d.data.id);
            return `translate(${p.x},${p.y})`;
          })
          .remove(),
      );

    // Bir sonraki animasyon için güncel konumları sakla
    this.prevPos = new Map(nodes.map((d) => [d.data.id, { x: d.x, y: d.y }]));
  }

  /** buildCard üye kartının statik kısımlarını bir kez oluşturur. */
  private buildCard(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel
      .style("cursor", "pointer")
      .on("click", (_e: MouseEvent, d: HNode) => this.cb.onNodeClick(d.data))
      .on("mouseover", (e: MouseEvent, d: HNode) => this.cb.onHover(e, d.data))
      .on("mousemove", (e: MouseEvent) => this.cb.onHoverMove(e))
      .on("mouseout", () => this.cb.onHoverEnd());

    sel
      .append("rect")
      .attr("class", "bt-card")
      .attr("x", -CARD_W / 2)
      .attr("y", -CARD_H / 2)
      .attr("width", CARD_W)
      .attr("height", CARD_H)
      .attr("rx", 14)
      .attr("fill", COLORS.card)
      .attr("stroke", accent)
      .attr("stroke-width", (d) => (d.depth === 0 ? 2.5 : 1.5))
      .attr("filter", "url(#bt-card-shadow)");

    // Sol kenar renk şeridi: bacağı bir bakışta ayırt ettirir
    sel
      .append("path")
      .attr("d", () => {
        const x = -CARD_W / 2;
        const y = -CARD_H / 2;
        return `M ${x + 14},${y} A 14 14 0 0 0 ${x},${y + 14} L ${x},${y + CARD_H - 14} A 14 14 0 0 0 ${x + 14},${y + CARD_H} L ${x + 5},${y + CARD_H} L ${x + 5},${y} Z`;
      })
      .attr("fill", accent);

    this.buildAvatar(sel);

    sel
      .append("text")
      .attr("x", -CARD_W / 2 + 16 + AVATAR_R * 2 + 10)
      .attr("y", -CARD_H / 2 + 26)
      .attr("font-size", 12.5)
      .attr("font-weight", 800)
      .attr("fill", COLORS.text)
      .text((d) => truncate(d.data.name, 16));

    sel
      .append("text")
      .attr("x", -CARD_W / 2 + 16 + AVATAR_R * 2 + 10)
      .attr("y", -CARD_H / 2 + 41)
      .attr("font-size", 10)
      .attr("fill", COLORS.subtext)
      .text((d) => `#${d.data.memberCode}`);

    sel
      .append("line")
      .attr("x1", -CARD_W / 2 + 12)
      .attr("x2", CARD_W / 2 - 12)
      .attr("y1", 4)
      .attr("y2", 4)
      .attr("stroke", COLORS.divider);

    sel
      .append("text")
      .attr("x", -CARD_W / 2 + 12)
      .attr("y", 21)
      .attr("font-size", 10)
      .attr("font-weight", 800)
      .attr("fill", COLORS.left)
      .text((d) => truncate((d.data.rank || "GİRİŞİMCİ").toLocaleUpperCase("tr-TR"), 14));

    sel
      .append("text")
      .attr("x", CARD_W / 2 - 12)
      .attr("y", 21)
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("font-weight", 700)
      .attr("fill", COLORS.right)
      .text((d) => truncate((d.data.packageName || "—").toLocaleUpperCase("tr-TR"), 10));

    sel
      .append("text")
      .attr("x", 0)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 9.5)
      .attr("font-weight", 700)
      .attr("fill", COLORS.subtext)
      .text((d) => `${d.data.pv.toLocaleString("tr-TR")} PV · ${d.data.cv.toLocaleString("tr-TR")} CV`);

    sel.append("g").attr("class", "bt-badge").attr("transform", `translate(0,${CARD_H / 2})`);
  }

  private buildAvatar(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    const cx = -CARD_W / 2 + 16 + AVATAR_R;
    const cy = -CARD_H / 2 + 14 + AVATAR_R;

    sel
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", AVATAR_R)
      .attr("fill", (d) => (d.data.imagePath ? "#F0F5EE" : accent(d)))
      .attr("stroke", accent)
      .attr("stroke-width", 1.5);

    sel
      .filter((d) => !d.data.imagePath)
      .append("text")
      .attr("x", cx)
      .attr("y", cy + 6)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", 800)
      .attr("fill", "#fff")
      .text((d) => (d.data.name.charAt(0) || "?").toLocaleUpperCase("tr-TR"));

    const withImage = sel.filter((d) => !!d.data.imagePath);
    withImage.each((d) => {
      if (this.clipIds.has(d.data.id)) return;
      this.clipIds.add(d.data.id);
      this.defs
        .append("clipPath")
        .attr("id", `bt-clip-${d.data.id}`)
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", AVATAR_R - 1);
    });
    withImage
      .append("image")
      .attr("href", (d) => fileUrl(d.data.imagePath) ?? "")
      .attr("x", cx - AVATAR_R)
      .attr("y", cy - AVATAR_R)
      .attr("width", AVATAR_R * 2)
      .attr("height", AVATAR_R * 2)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("clip-path", (d) => `url(#bt-clip-${d.data.id})`);
  }

  private buildPlaceholder(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel
      .style("cursor", "pointer")
      .on("click", (_e: MouseEvent, d: HNode) => {
        const parentId = d.parent ? Number(d.parent.data.id) : NaN;
        if (Number.isFinite(parentId) && (d.data.position === "L" || d.data.position === "R")) {
          this.cb.onPlaceholderClick(parentId, d.data.position);
        }
      });

    sel
      .append("rect")
      .attr("x", -PLACEHOLDER_W / 2)
      .attr("y", -PLACEHOLDER_H / 2)
      .attr("width", PLACEHOLDER_W)
      .attr("height", PLACEHOLDER_H)
      .attr("rx", 12)
      .attr("fill", "#F6F9F5")
      .attr("stroke", (d) => (d.data.position === "R" ? COLORS.right : COLORS.left))
      .attr("stroke-width", 1.6)
      .attr("stroke-dasharray", "6 5");

    // Büyük "+"
    sel
      .append("text")
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", 26)
      .attr("font-weight", 400)
      .attr("fill", (d) => (d.data.position === "R" ? COLORS.right : COLORS.left))
      .text("+");

    sel
      .append("text")
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 9.5)
      .attr("font-weight", 800)
      .attr("fill", (d) => (d.data.position === "R" ? COLORS.right : COLORS.left))
      .text((d) => (d.data.position === "R" ? "SAĞ BACAK" : "SOL BACAK"));
  }

  /**
   * updateBadge kartın alt rozetini durumuna göre yeniden çizer:
   * daraltılmış → alt üye sayısı, açık → "−", sınırda → "+", yükleniyor → "…".
   */
  private updateBadge(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]).select<SVGGElement>("g.bt-badge");
      g.selectAll("*").remove();
      const n = d.data;
      const hasChildren = n.children.length > 0;
      if (!hasChildren && !n.boundary) return;

      let label: string;
      if (n.loading) label = "…";
      else if (n.boundary) label = "+";
      else if (n.collapsed) label = `+${countDescendants(n)}`;
      else label = "−";

      const w = Math.max(24, label.length * 8 + 14);
      g.append("rect")
        .attr("x", -w / 2)
        .attr("y", -11)
        .attr("width", w)
        .attr("height", 22)
        .attr("rx", 11)
        .attr("fill", n.boundary || n.collapsed ? COLORS.right : COLORS.left)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);
      g.append("text")
        .attr("y", 4.5)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", 800)
        .attr("fill", "#fff")
        .text(label);
    });
  }

  zoomBy(factor: number): void {
    this.svg.transition().duration(200).call(this.zoom.scaleBy, factor);
  }

  /** fit ağacın tamamını görünür alana sığdırır. */
  fit(animate = true): void {
    const el = this.zoomLayer.node();
    if (!el || this.currentNodes.length === 0) return;
    const b = el.getBBox();
    if (b.width === 0 || b.height === 0) return;
    const { w, h } = this.measure();
    const k = Math.min((w - 60) / b.width, (h - 60) / b.height, 1.4);
    const tx = w / 2 - (b.x + b.width / 2) * k;
    const ty = h / 2 - (b.y + b.height / 2) * k;
    const transform = d3.zoomIdentity.translate(tx, ty).scale(k);
    if (animate) this.svg.transition().duration(400).call(this.zoom.transform, transform);
    else this.svg.call(this.zoom.transform, transform);
  }

  /** focusOn düğümü ekran merkezine getirir. */
  focusOn(id: string): void {
    const target = this.currentNodes.find((d) => d.data.id === id);
    if (!target) return;
    const { w, h } = this.measure();
    const k = 1;
    const transform = d3.zoomIdentity.translate(w / 2 - target.x * k, h / 2.5 - target.y * k).scale(k);
    this.svg.transition().duration(400).call(this.zoom.transform, transform);
  }

  /** highlight eşleşmeyen kartları soluklaştırır; ilk eşleşmenin id'sini döndürür. */
  highlight(term: string): string | null {
    const norm = (v: string) => v.toLocaleLowerCase("tr-TR");
    const q = norm(term.trim());
    const sel = this.nodeLayer.selectAll<SVGGElement, HNode>("g.bt-node");
    if (!q) {
      sel.transition().duration(150).style("opacity", 1);
      return null;
    }
    let firstId: string | null = null;
    sel.each(function (d) {
      const hit =
        !d.data.placeholder && (norm(d.data.name).includes(q) || norm(d.data.memberCode).includes(q));
      d3.select(this).transition().duration(150).style("opacity", hit ? 1 : 0.15);
      if (hit && firstId === null) firstId = d.data.id;
    });
    return firstId;
  }
}
