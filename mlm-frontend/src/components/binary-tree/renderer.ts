import * as d3 from "d3";
import { fileUrl } from "@/services/api";
import {
  ANIM_MS,
  AVATAR_R,
  CARD_H,
  CARD_W,
  COLORS,
  DARK_COLORS,
  LEVEL_GAP,
  PLACEHOLDER_H,
  PLACEHOLDER_W,
  SIBLING_GAP,
  countDescendants,
  visibleChildren,
  type BTNode,
  type TreeColors,
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
  /** Kullanıcı aşağı doğru kaydırınca en derin yüklü seviyeye ulaşıldı: sonraki nesli tembel yükle. */
  onReachBottom: () => void;
}

function truncate(v: string, max: number): string {
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

/** compactNum büyük sayıları okunaklı biçimde kısaltır (8,3B · 10,6Mn · 1,2Mr). */
function compactNum(v: number): string {
  const trim = (x: number) => (x >= 100 ? Math.round(x).toString() : x.toFixed(1).replace(".", ","));
  if (v >= 1_000_000_000) return `${trim(v / 1_000_000_000)} Mr`;
  if (v >= 1_000_000) return `${trim(v / 1_000_000)} Mn`;
  if (v >= 1_000) return `${trim(v / 1_000)} B`;
  return String(v);
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
  /** Aktif renk paleti (karanlık modda DARK_COLORS kullanılır). */
  private colors: TreeColors;
  /** Sonraki nesil yüklenirken yeni tetiklemeyi engeller (basamaklama önlenir). */
  private awaitingLoad = false;

  constructor(svgEl: SVGSVGElement, cb: RendererCallbacks, measure: () => { w: number; h: number }, dark = false) {
    this.cb = cb;
    this.measure = measure;
    this.colors = dark ? DARK_COLORS : COLORS;
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
      .attr("flood-color", this.colors.root);

    this.zoomLayer = this.svg.append("g").attr("class", "bt-zoom");
    this.linkLayer = this.zoomLayer.append("g").attr("class", "bt-links");
    this.nodeLayer = this.zoomLayer.append("g").attr("class", "bt-nodes");

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2.5])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.zoomLayer.attr("transform", event.transform.toString());
        // Yalnızca kullanıcı etkileşiminde (sürükle/tekerlek) dibe ulaşma kontrolü yap;
        // programatik transform'lar (fit vb.) tetiklemez.
        if (event.sourceEvent) this.checkReachBottom(event.transform);
      });
    this.svg.call(this.zoom).on("dblclick.zoom", null);
  }

  /** accent düğümün bacak rengini döndürür (kök daha koyu). */
  private accent(d: HNode): string {
    if (d.depth === 0) return this.colors.root;
    return d.data.position === "R" ? this.colors.right : this.colors.left;
  }

  /**
   * checkReachBottom görünür alanın alt kenarı en derin yüklü düğüme yaklaştığında
   * onReachBottom çağırır (aşağı kaydırdıkça bir sonraki nesil tembel yüklenir).
   */
  private checkReachBottom(t: d3.ZoomTransform): void {
    if (this.awaitingLoad || this.currentNodes.length === 0) return;
    const { h } = this.measure();
    const visibleBottom = (h - t.y) / t.k;
    let maxY = -Infinity;
    for (const n of this.currentNodes) maxY = Math.max(maxY, n.y + CARD_H / 2);
    if (!Number.isFinite(maxY)) return;
    // Görünür alt kenar, en derin kartın altına 80px yaklaştıysa yükle
    if (visibleBottom + 80 >= maxY) {
      this.awaitingLoad = true;
      this.cb.onReachBottom();
    }
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
    // Yeni nesil yüklendikten sonra tekrar dibe ulaşma tetiklemesi serbest kalır
    this.awaitingLoad = false;
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
      .attr("rx", 13)
      .attr("fill", this.colors.card)
      .attr("stroke", (d) => this.accent(d))
      .attr("stroke-width", (d) => (d.depth === 0 ? 2.4 : 1.4))
      .attr("filter", "url(#bt-card-shadow)");

    this.buildAvatar(sel);
    this.buildCardHeader(sel);
    this.buildPositionBadge(sel);
    this.buildBadgeRow(sel);
    this.buildMetrics(sel);
    this.buildLegMeter(sel);

    sel.append("g").attr("class", "bt-badge").attr("transform", `translate(0,${CARD_H / 2 + 3})`);
  }

  /** buildCardHeader isim + üye kodu; avatar sağına hizalanır. */
  private buildCardHeader(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    const x = -CARD_W / 2 + 11 + AVATAR_R * 2 + 8;
    sel
      .append("text")
      .attr("x", x)
      .attr("y", -CARD_H / 2 + 21)
      .attr("font-size", 11.5)
      .attr("font-weight", 800)
      .attr("fill", this.colors.text)
      .text((d) => truncate(d.data.name, 13));

    // Üye ID — büyük, iri, beyaz, belirgin (bacak rengi rozet içinde)
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const code = `#${d.data.memberCode}`;
      const w = Math.max(64, code.length * 6 + 16);
      g.append("rect")
        .attr("x", x)
        .attr("y", -CARD_H / 2 + 26)
        .attr("width", w)
        .attr("height", 18)
        .attr("rx", 9)
        .attr("fill", this.accent(d));
      g.append("text")
        .attr("x", x + w / 2)
        .attr("y", -CARD_H / 2 + 38)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 800)
        .attr("fill", "#ffffff")
        .text(code);
    });
  }

  /** buildPositionBadge bacak etiketini (KÖK/SOL/SAĞ) kartın sağ üst köşesine çizer. */
  private buildPositionBadge(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const label = d.data.position === "R" ? "SAĞ" : d.data.position === "L" ? "SOL" : "KÖK";
      const cx = CARD_W / 2 - 18;
      const cy = -CARD_H / 2 + 18;
      const w = Math.max(26, label.length * 6 + 12);
      g.append("rect")
        .attr("x", cx - w / 2)
        .attr("y", cy - 7.5)
        .attr("width", w)
        .attr("height", 15)
        .attr("rx", 7.5)
        .attr("fill", this.accent(d));
      g.append("text")
        .attr("x", cx)
        .attr("y", cy + 2.8)
        .attr("text-anchor", "middle")
        .attr("font-size", 7.5)
        .attr("font-weight", 800)
        .attr("fill", "#fff")
        .text(label);
    });
  }

  /** buildBadgeRow paket / durum rozetlerini eski yerine (üst orta) sağa yaslı çizer. */
  private buildBadgeRow(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const chips: { text: string; fill: string; color: string; stroke?: string }[] = [];
      if (d.data.packageName)
        chips.push({ text: d.data.packageName.toLocaleUpperCase("tr-TR"), fill: "#EDF3EA", color: this.colors.text });
      if (d.data.isActive) chips.push({ text: "AKTİF", fill: "#E3F3E8", color: this.colors.statusActive });
      else chips.push({ text: "PASİF", fill: "#FBE7E7", color: this.colors.statusPassive, stroke: this.colors.statusPassive });

      // Toplam genişliği hesapla ve ortala
      const widths = chips.map((c) => Math.max(26, c.text.length * 6 + 12));
      const total = widths.reduce((a, b) => a + b, 0) + (chips.length - 1) * 5;
      let x = -total / 2;
      const y = -CARD_H / 2 + 54;
      chips.forEach((c, idx) => {
        const w = widths[idx];
        g.append("rect")
          .attr("x", x)
          .attr("y", y - 7.5)
          .attr("width", w)
          .attr("height", 15)
          .attr("rx", 7.5)
          .attr("fill", c.fill)
          .attr("stroke", c.stroke ?? "none")
          .attr("stroke-width", 1);
        g.append("text")
          .attr("x", x + w / 2)
          .attr("y", y + 2.8)
          .attr("text-anchor", "middle")
          .attr("font-size", 7.5)
          .attr("font-weight", 800)
          .attr("fill", c.color)
          .text(c.text);
        x += w + 5;
      });
    });
  }

  /** buildMetrics sol/sağ bacak PV ve CV değerlerini kompakt biçimde alt kısma dizer. */
  private buildMetrics(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const leftX = -CARD_W / 2 + 12;
      const rightX = CARD_W / 2 - 12;
      g.append("line").attr("x1", leftX).attr("x2", rightX).attr("y1", 5).attr("y2", 5).attr("stroke", this.colors.divider);

      const metric = (y: number, l: string, r: string, lv: number, rv: number) => {
        g.append("circle").attr("cx", leftX).attr("cy", y - 3).attr("r", 3).attr("fill", this.colors.legLeft);
        g.append("text").attr("x", leftX + 6).attr("y", y).attr("font-size", 8.5).attr("font-weight", 700).attr("fill", this.colors.text).text(`${l} ${compactNum(lv)}`);
        g.append("circle").attr("cx", rightX).attr("cy", y - 3).attr("r", 3).attr("fill", this.colors.legRight);
        g.append("text").attr("x", rightX - 6).attr("y", y).attr("text-anchor", "end").attr("font-size", 8.5).attr("font-weight", 700).attr("fill", this.colors.text).text(`${r} ${compactNum(rv)}`);
      };
      metric(21, "SOL PV", "SAĞ PV", d.data.pvLeft, d.data.pvRight);
      metric(37, "SOL CV", "SAĞ CV", d.data.cvLeft, d.data.cvRight);
    });
  }

  /** buildLegMeter bacak dağılımını (güçlü bacak + ilerleme çubuğu) çizer. */
  private buildLegMeter(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const total = d.data.pvLeft + d.data.pvRight;
      const pctL = total > 0 ? Math.round((d.data.pvLeft / total) * 100) : 100;
      const pctR = 100 - pctL;
      const strongL = d.data.pvLeft >= d.data.pvRight;
      const bx = -CARD_W / 2 + 12;
      const bw = CARD_W - 24;
      const by = 52;

      g.append("text")
        .attr("x", 0)
        .attr("y", 50)
        .attr("text-anchor", "middle")
        .attr("font-size", 8)
        .attr("font-weight", 800)
        .attr("fill", strongL ? this.colors.left : this.colors.right)
        .text(strongL ? `GÜÇ: SOL %${pctL}` : `GÜÇ: SAĞ %${pctR}`);
      g.append("rect").attr("x", bx).attr("y", by).attr("width", bw).attr("height", 5).attr("rx", 2.5).attr("fill", "#EDF1EC");
      g.append("rect").attr("x", bx).attr("y", by).attr("width", (bw * pctL) / 100).attr("height", 5).attr("rx", 2.5).attr("fill", this.colors.legLeft);
    });
  }

  private buildAvatar(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    const cx = -CARD_W / 2 + 11 + AVATAR_R;
    const cy = -CARD_H / 2 + 11 + AVATAR_R;

    sel
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", AVATAR_R)
      .attr("fill", (d) => (d.data.imagePath ? "#F0F5EE" : this.accent(d)))
      .attr("stroke", (d) => this.accent(d))
      .attr("stroke-width", 1.5);

    sel
      .filter((d) => !d.data.imagePath)
      .append("text")
      .attr("x", cx)
      .attr("y", cy + 5)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
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

    // Aktif/pasif durum noktası (avatarın sağ-altı)
    sel
      .append("circle")
      .attr("cx", cx + AVATAR_R - 5)
      .attr("cy", cy + AVATAR_R - 5)
      .attr("r", 5)
      .attr("fill", (d) => (d.data.isActive ? this.colors.statusActive : this.colors.statusPassive))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
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
      .attr("stroke", (d) => (d.data.position === "R" ? this.colors.right : this.colors.left))
      .attr("stroke-width", 1.6)
      .attr("stroke-dasharray", "6 5");

    // Büyük "+"
    sel
      .append("text")
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", 26)
      .attr("font-weight", 400)
      .attr("fill", (d) => (d.data.position === "R" ? this.colors.right : this.colors.left))
      .text("+");

    sel
      .append("text")
      .attr("y", 16)
      .attr("text-anchor", "middle")
      .attr("font-size", 9.5)
      .attr("font-weight", 800)
      .attr("fill", (d) => (d.data.position === "R" ? this.colors.right : this.colors.left))
      .text((d) => (d.data.position === "R" ? "SAĞ HAT" : "SOL HAT"));
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
        .attr("fill", n.boundary || n.collapsed ? this.colors.right : this.colors.left)
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
    const k = Math.min((w - 60) / b.width, (h - 60) / b.height, 2.2);
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
