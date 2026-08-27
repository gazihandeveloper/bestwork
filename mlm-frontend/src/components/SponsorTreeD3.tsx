"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { SponsorTreeNode } from "@/services/api";

interface SponsorTreeD3Props {
  data: SponsorTreeNode;
  depth: number;
}

// MD3 yeşil tema ile uyumlu rol renkleri
const roleColors: Record<string, string> = {
  admin: "#C9A227", // altın
  user: "#2E7D32", // koyu yeşil
  customer: "#A5D6A7", // açık yeşil
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  user: "Üye",
  customer: "Müşteri",
};

// Ağaç düğümü iç veri tipi: orijinal children korunur (_children), daraltılınca [] döner.
interface TreeNodeData extends SponsorTreeNode {
  _children?: SponsorTreeNode[];
}

type HierarchyNode = d3.HierarchyNode<TreeNodeData>;
type HierarchyLink = d3.HierarchyLink<TreeNodeData>;

const WIDTH = 960;

function linkPath(d: HierarchyLink): string {
  const sy = d.source.y ?? 0;
  const sx = d.source.x ?? 0;
  const ty = d.target.y ?? 0;
  const tx = d.target.x ?? 0;
  const midY = (sy + ty) / 2;
  return `M ${sy},${sx} C ${midY},${sx} ${midY},${tx} ${ty},${tx}`;
}

// Sürükleme sırasında tüm alt ağacı kaydırır
function shiftDescendants(node: HierarchyNode, dx: number, dy: number) {
  node.descendants().forEach((d) => {
    d.x = (d.x ?? 0) + dx;
    d.y = (d.y ?? 0) + dy;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function SponsorTreeD3({ data, depth }: SponsorTreeD3Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const collapsedRef = useRef<Map<number, boolean>>(new Map());
  const [version, setVersion] = useState(0);

  const showTooltip = (event: MouseEvent, node: SponsorTreeNode) => {
    const el = tooltipRef.current;
    if (!el) return;
    // XSS koruması: kullanıcı kaynaklı tüm alanlar escape edilir
    el.innerHTML = `
      <div style="font-weight:700">${escapeHtml(node.name)}</div>
      <div style="color:#A5D6A7">${escapeHtml(node.member_code)}</div>
      <div style="margin-top:4px">Rol: ${escapeHtml(roleLabels[node.role] || node.role)}</div>
      <div>Paket: ${escapeHtml(node.package_name || "-")}</div>
      <div>Durum: ${node.is_in_pending_pool ? "Bekliyor" : "Aktif"}</div>
      <div>Alt üye: ${node.child_count}</div>
      <div>PV: ${node.total_pv_accumulated}</div>`;
    el.style.display = "block";
    el.style.left = `${event.clientX + 14}px`;
    el.style.top = `${event.clientY + 14}px`;
  };

  const hideTooltip = () => {
    const el = tooltipRef.current;
    if (el) el.style.display = "none";
  };

  const height = Math.max(520, 130 * (Math.min(depth, 5) + 1) + 80);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    // Hiyerarşi: daraltılmış düğümlerde children boş döner, orijinal _children'da saklanır
    const rootData = data as TreeNodeData;
    const root = d3.hierarchy(rootData, (d) => {
      const node = d as TreeNodeData;
      if (collapsedRef.current.get(node.user_id)) {
        node._children = node.children;
        return [];
      }
      node._children = undefined;
      return node.children;
    });

    const treeLayout = d3.tree<TreeNodeData>().size([height - 90, WIDTH - 140]);
    treeLayout(root);

    // Zoom + pan grubu
    const zoomLayer = svg.append("g");
    const inner = zoomLayer.append("g").attr("transform", "translate(70, 45)");

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        zoomLayer.attr("transform", event.transform.toString());
      });
    svg.call(zoomBehavior);

    // Linkler
    const link = inner
      .selectAll<SVGPathElement, HierarchyLink>(".link")
      .data(root.links())
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#9DBB9F")
      .attr("stroke-width", 1.5)
      .attr("d", linkPath);

    // Düğüm grupları
    const node = inner
      .selectAll<SVGGElement, HierarchyNode>(".node")
      .data(root.descendants(), (d) => d.data.user_id)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y ?? 0},${d.x ?? 0})`)
      .style("cursor", "pointer")
      .on("click", (_event: MouseEvent, d: HierarchyNode) => {
        const id = d.data.user_id;
        const current = collapsedRef.current.get(id) ?? false;
        collapsedRef.current.set(id, !current);
        setVersion((v) => v + 1);
      })
      .on("mouseover", (event: MouseEvent, d: HierarchyNode) => showTooltip(event, d.data))
      .on("mousemove", (event: MouseEvent) => {
        const el = tooltipRef.current;
        if (el && el.style.display === "block") {
          el.style.left = `${event.clientX + 14}px`;
          el.style.top = `${event.clientY + 14}px`;
        }
      })
      .on("mouseout", hideTooltip);

    // Daire
    node
      .append("circle")
      .attr("r", 24)
      .attr("fill", (d) => roleColors[d.data.role] || "#2E7D32")
      .attr("stroke", (d) => (d.data.is_in_pending_pool ? "#FF9800" : "#1B5E20"))
      .attr("stroke-width", (d) => (d.data.is_in_pending_pool ? 3.5 : 1.5));

    // İsim + üye kodu
    node
      .append("text")
      .attr("dy", -32)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .attr("font-weight", 600)
      .attr("fill", "#1B3A1E")
      .text((d) => d.data.name);

    node
      .append("text")
      .attr("dy", -18)
      .attr("text-anchor", "middle")
      .attr("font-size", 10)
      .attr("fill", "#5A6F5C")
      .text((d) => d.data.member_code);

    // Alt üye sayısı rozeti
    node
      .append("text")
      .attr("dy", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "#ffffff")
      .text((d) => (d.data.child_count > 0 ? String(d.data.child_count) : ""));

    // Sürükleme: düğüm ve alt ağacı birlikte taşınır
    const dragBehavior = d3
      .drag<SVGGElement, HierarchyNode>()
      .on("drag", (event: d3.D3DragEvent<SVGGElement, HierarchyNode, HierarchyNode>, d: HierarchyNode) => {
        shiftDescendants(d, event.dy, event.dx);
        node.attr("transform", (n) => `translate(${n.y ?? 0},${n.x ?? 0})`);
        link.attr("d", linkPath);
      });

    node.call(dragBehavior);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [data, depth, height, version]);

  return (
    <div>
      <p className="text-muted-foreground mb-1 text-sm">
        Düğüme tıklayarak alt ağacı aç/kapat, sürükleyerek taşı, tekerlekle zoom yap.
      </p>
      <div className="border-border overflow-hidden rounded border bg-[#FDFEFD]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${height}`}
          style={{ width: "100%", height: "auto", minHeight: 460, display: "block" }}
        />
      </div>
      <div
        ref={tooltipRef}
        style={{
          display: "none",
          position: "fixed",
          zIndex: 1300,
          pointerEvents: "none",
          background: "#1B3A1E",
          color: "#fff",
          borderRadius: 4,
          padding: "8px 12px",
          fontSize: 12,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          maxWidth: 220,
        }}
      />
    </div>
  );
}
