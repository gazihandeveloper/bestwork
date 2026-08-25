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
  /** Kartın altındaki "i" bilgi düğmesi: üye detay modalı açılır. */
  onInfoClick: (node: BTNode) => void;
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
      .attr("flood-opacity", 0.07)
      .attr("flood-color", "#000000");

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
      .attr("stroke", "#B8BDC9")
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
      .attr("rx", 16)
      .attr("fill", this.colors.card)
      .attr("stroke", this.colors.divider)
      .attr("stroke-width", 1)
      .attr("filter", "url(#bt-card-shadow)");

    this.buildAvatar(sel);
    this.buildCardHeader(sel);
    this.buildProgress(sel);
    this.buildStats(sel);
    this.buildFooter(sel);

    sel.append("g").attr("class", "bt-badge").attr("transform", `translate(0,${CARD_H / 2 + 3})`);
  }

  /**
   * buildCardHeader Stitch Network Member Card başlığı: avatar sağında isim + üye kodu,
   * altında pozisyon/rütbe/durum satırı, sağ üstte rütbe simgesi + etiket.
   */
  private buildCardHeader(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const top = -CARD_H / 2;
      const left = -CARD_W / 2;
      const ax = left + 10 + AVATAR_R;
      const tx = ax + AVATAR_R + 8;
      const n = d.data;

      // İsim (Inter/title stilinde)
      g.append("text")
        .attr("x", tx)
        .attr("y", top + 13)
        .attr("font-size", 12.5)
        .attr("font-weight", 700)
        .attr("fill", this.colors.text)
        .text(truncate(n.name, 13));

      // Üye kodu
      g.append("text")
        .attr("x", tx)
        .attr("y", top + 25)
        .attr("font-size", 9)
        .attr("font-weight", 600)
        .attr("fill", this.colors.subtext)
        .text(truncate(`#${n.memberCode}`, 14));

      // Pozisyon rozeti (KÖK/SOL/SAĞ)
      const posLabel = n.position === "R" ? "SAĞ" : n.position === "L" ? "SOL" : "KÖK";
      const accent = this.accent(d);
      const posW = Math.max(18, posLabel.length * 4.6 + 9);
      g.append("rect")
        .attr("x", tx)
        .attr("y", top + 29)
        .attr("width", posW)
        .attr("height", 13)
        .attr("rx", 6.5)
        .attr("fill", accent)
        .attr("fill-opacity", 0.14);
      g.append("text")
        .attr("x", tx + posW / 2)
        .attr("y", top + 38)
        .attr("text-anchor", "middle")
        .attr("font-size", 6.6)
        .attr("font-weight", 800)
        .attr("fill", accent)
        .text(posLabel);

      // Rütbe + durum (referanstaki BRONZ / PASİF satırı)
      let cx2 = tx + posW + 7;
      if (n.rank) {
        const rk = n.rank.toLocaleUpperCase("tr-TR").slice(0, 8);
        g.append("text")
          .attr("x", cx2)
          .attr("y", top + 38)
          .attr("font-size", 6.6)
          .attr("font-weight", 800)
          .attr("fill", "#8A6D1A")
          .text(rk);
        cx2 += rk.length * 4.6 + 9;
      }
      g.append("text")
        .attr("x", cx2)
        .attr("y", top + 38)
        .attr("font-size", 6.6)
        .attr("font-weight", 800)
        .attr("fill", n.isActive ? this.colors.statusActive : this.colors.statusPassive)
        .text(n.isActive ? "AKTİF" : "PASİF");

      // Sağ üst: rütbe simgesi (diamond) + etiket
      const rx = CARD_W / 2 - 10 - 12;
      const ry = top + 14;
      g.append("circle").attr("cx", rx).attr("cy", ry).attr("r", 12).attr("fill", this.colors.divider);
      g.append("text")
        .attr("x", rx)
        .attr("y", ry + 3.4)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", this.colors.subtext)
        .text(n.rank ? "◆" : "◇");
      g.append("text")
        .attr("x", rx)
        .attr("y", ry + 21)
        .attr("text-anchor", "middle")
        .attr("font-size", 6.4)
        .attr("font-weight", 700)
        .attr("letter-spacing", "0.4")
        .attr("fill", this.colors.subtext)
        .text((n.rank ?? "GİRİŞİM").toLocaleUpperCase("tr-TR").slice(0, 8));
    });
  }

  /** buildProgress bacak gücü satırı: SOL % · Zayıf: X · % SAĞ + doğrusal çubuk. */
  private buildProgress(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const l = -CARD_W / 2 + 12;
      const r = CARD_W / 2 - 12;
      const cy = -CARD_H / 2 + 60;
      const total = d.data.pvLeft + d.data.pvRight;
      const pctL = total > 0 ? Math.round((d.data.pvLeft / total) * 100) : 100;
      const pctR = 100 - pctL;
      const weak = d.data.pvLeft >= d.data.pvRight ? "SAĞ" : "SOL";

      g.append("text")
        .attr("x", l)
        .attr("y", cy)
        .attr("font-size", 8)
        .attr("font-weight", 800)
        .attr("fill", this.colors.legLeft)
        .text(`SOL ${pctL}%`);
      g.append("text")
        .attr("x", 0)
        .attr("y", cy)
        .attr("text-anchor", "middle")
        .attr("font-size", 6.5)
        .attr("font-weight", 600)
        .attr("fill", this.colors.subtext)
        .text(`Zayıf: ${weak}`);
      g.append("text")
        .attr("x", r)
        .attr("y", cy)
        .attr("text-anchor", "end")
        .attr("font-size", 8)
        .attr("font-weight", 800)
        .attr("fill", this.colors.legRight)
        .text(`${pctR}% SAĞ`);

      const by = cy + 6;
      const bw = r - l;
      g.append("rect")
        .attr("x", l)
        .attr("y", by)
        .attr("width", bw)
        .attr("height", 5)
        .attr("rx", 2.5)
        .attr("fill", this.colors.divider);
      g.append("rect")
        .attr("x", l)
        .attr("y", by)
        .attr("width", (bw * pctL) / 100)
        .attr("height", 5)
        .attr("rx", 2.5)
        .attr("fill", this.colors.legLeft);
    });
  }

  /** buildStats SOL/SAĞ CV ve PV istatistik tablosu (referanstaki 2 sütunlu grid). */
  private buildStats(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const sx = -CARD_W / 2 + 12;
      const rx = CARD_W / 2 - 12;
      const sy = -CARD_H / 2 + 78;
      const sh = 72;
      const sw = rx - sx;

      g.append("rect")
        .attr("x", sx)
        .attr("y", sy)
        .attr("width", sw)
        .attr("height", sh)
        .attr("rx", 8)
        .attr("fill", this.colors.card)
        .attr("stroke", this.colors.divider)
        .attr("stroke-width", 0.8);
      // Dikey orta ayırıcı + satır ayırıcı
      g.append("line").attr("x1", 0).attr("y1", sy).attr("x2", 0).attr("y2", sy + sh).attr("stroke", this.colors.divider).attr("stroke-width", 0.8);
      g.append("line").attr("x1", sx).attr("y1", sy + sh / 2).attr("x2", rx).attr("y2", sy + sh / 2).attr("stroke", this.colors.divider).attr("stroke-width", 0.8);

      const row = (labelY: number, lLabel: string, rLabel: string, lv: number, rv: number) => {
        // Sol hücre (mavi)
        g.append("text")
          .attr("x", sx + 7)
          .attr("y", labelY)
          .attr("font-size", 6.2)
          .attr("font-weight", 700)
          .attr("letter-spacing", "0.4")
          .attr("fill", this.colors.subtext)
          .text(lLabel);
        g.append("text")
          .attr("x", sx + 7)
          .attr("y", labelY + 14)
          .attr("font-size", 11.5)
          .attr("font-weight", 800)
          .attr("fill", this.colors.legLeft)
          .text(compactNum(lv));
        // Sağ hücre (mor)
        g.append("text")
          .attr("x", rx - 7)
          .attr("y", labelY)
          .attr("text-anchor", "end")
          .attr("font-size", 6.2)
          .attr("font-weight", 700)
          .attr("letter-spacing", "0.4")
          .attr("fill", this.colors.subtext)
          .text(rLabel);
        g.append("text")
          .attr("x", rx - 7)
          .attr("y", labelY + 14)
          .attr("text-anchor", "end")
          .attr("font-size", 11.5)
          .attr("font-weight", 800)
          .attr("fill", this.colors.legRight)
          .text(compactNum(rv));
      };
      row(sy + 12, "SOL.CV", "SAĞ.CV", d.data.cvLeft, d.data.cvRight);
      row(sy + sh / 2 + 12, "SOL.PV", "SAĞ.PV", d.data.pvLeft, d.data.pvRight);
    });
  }

  /** buildFooter alt eylem düğmeleri; ortadaki "i" üye detay modalını açar. */
  private buildFooter(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    sel.each((d, i, groups) => {
      const g = d3.select(groups[i]);
      const cy = CARD_H / 2 - 20;
      const xs = [-26, 0, 26];
      const glyphs = ["↑", "i", "↗"];
      const fills = ["#D4E3FF", "#DAE2F9", "#D9E2FF"];
      const texts = ["#001C3A", "#004786", "#121B30"];

      // Orta düğmenin üstündeki bağlantı çizgisi
      g.append("line")
        .attr("x1", 0)
        .attr("y1", cy - 18)
        .attr("x2", 0)
        .attr("y2", cy - 6)
        .attr("stroke", this.colors.divider)
        .attr("stroke-width", 1);

      xs.forEach((x, k) => {
        const btn = g
          .append("g")
          .attr("transform", `translate(${x},${cy})`)
          .style("cursor", "pointer");
        btn.append("circle").attr("r", 11).attr("fill", fills[k]);
        btn
          .append("text")
          .attr("y", 3.4)
          .attr("text-anchor", "middle")
          .attr("font-size", 10)
          .attr("font-weight", 800)
          .attr("fill", texts[k])
          .text(glyphs[k]);
        if (k === 1) {
          btn.on("click", (event: MouseEvent) => {
            event.stopPropagation();
            this.cb.onInfoClick(d.data);
          });
        }
      });
    });
  }

  private buildAvatar(sel: d3.Selection<SVGGElement, HNode, SVGGElement, unknown>): void {
    const cx = -CARD_W / 2 + 10 + AVATAR_R;
    const cy = -CARD_H / 2 + 10 + AVATAR_R;

    sel
      .append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", AVATAR_R)
      .attr("fill", (d) => (d.data.imagePath ? "#F0F5EE" : this.accent(d)))
      .attr("stroke", (d) => this.accent(d))
      .attr("stroke-width", 1.1);

    sel
      .filter((d) => !d.data.imagePath)
      .append("text")
      .attr("x", cx)
      .attr("y", cy + 5.5)
      .attr("text-anchor", "middle")
      .attr("font-size", 15)
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
      .attr("fill", "#F4F3F6")
      .attr("stroke", (d) => (d.data.position === "R" ? this.colors.right : this.colors.left))
      .attr("stroke-width", 1.4)
      .attr("stroke-dasharray", "6 5");

    // Büyük "+"
    sel
      .append("text")
      .attr("y", -2)
      .attr("text-anchor", "middle")
      .attr("font-size", 22)
      .attr("font-weight", 400)
      .attr("fill", (d) => (d.data.position === "R" ? this.colors.right : this.colors.left))
      .text("+");

    sel
      .append("text")
      .attr("y", 14)
      .attr("text-anchor", "middle")
      .attr("font-size", 8.5)
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
    const k = Math.min((w - 60) / b.width, (h - 60) / b.height, 1.6);
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
