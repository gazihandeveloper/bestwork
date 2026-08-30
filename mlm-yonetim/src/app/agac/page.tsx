"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader, { PageCard } from "@/components/PageHeader";
import StatBox, { InfoAlert, Loading } from "@/components/StatBox";
import ConfirmModal from "@/components/ConfirmModal";
import { api, getErrorMessage, type AdminUser } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Backend JSON şekilleri ───────────────────────────────────────────────
// GET /sponsor-tree?user_id=&depth= -> { tree: SponsorTreeNode }
interface SponsorTreeNode {
  user_id: number;
  name: string;
  email: string;
  member_code: string;
  role: string;
  package_id: number | null;
  package_name: string;
  is_active: boolean;
  is_in_pending_pool: boolean;
  total_pv_accumulated: number;
  child_count: number;
  children: SponsorTreeNode[];
}

// GET /tree?user_id=&depth= -> { tree: BinaryTreeNode, min_month }
interface BinaryTreeNode {
  user_id: number;
  name: string;
  member_code: string;
  position: string | null;
  package: string | null;
  rank: string | null;
  image_path: string | null;
  total_pv_accumulated: number;
  total_cv_accumulated: number;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  is_active: boolean;
  role: string;
  left_child: BinaryTreeNode | null;
  right_child: BinaryTreeNode | null;
}

// GET /user/card?id= -> { card: UserCard }
interface UserCard {
  user_id: number;
  name: string;
  member_code: string;
  rank: string | null;
  package: string | null;
  is_active: boolean;
  position: string | null;
  sponsor_name: string | null;
  wallet_balance: number;
  chip_balance: number;
  total_pv_left: number;
  total_pv_right: number;
  total_cv_left: number;
  total_cv_right: number;
  left_team_count: number;
  right_team_count: number;
  total_team_count: number;
}

// ── Sayfa içinde tanımlı API çağrıları ───────────────────────────────────
async function searchUsers(q: string): Promise<AdminUser[]> {
  const { data } = await api.get<{ users: AdminUser[] }>("/admin/users", { params: { q, limit: 10 } });
  return data.users ?? [];
}

async function getSponsorTree(userId: number, depth: number): Promise<SponsorTreeNode> {
  const { data } = await api.get<{ tree: SponsorTreeNode }>("/sponsor-tree", {
    params: { user_id: userId, depth },
  });
  return data.tree;
}

async function getBinaryTree(userId: number, depth: number): Promise<BinaryTreeNode> {
  const { data } = await api.get<{ tree: BinaryTreeNode }>("/tree", {
    params: { user_id: userId, depth },
  });
  return data.tree;
}

async function getUserCard(userId: number): Promise<UserCard> {
  const { data } = await api.get<{ card: UserCard }>("/user/card", { params: { id: userId } });
  return data.card;
}

async function moveUserInTree(userId: number, newParentId: number, position: "L" | "R"): Promise<void> {
  await api.post("/admin/tree/move", { user_id: userId, new_parent_id: newParentId, position });
}

// ── Yardımcılar ──────────────────────────────────────────────────────────
const tl = (v: number) =>
  (v ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const positionLabel = (p?: string | null) =>
  p === "L" ? "Sol (L)" : p === "R" ? "Sağ (R)" : "—";

// ── Alt bileşenler: ağaç görünümleri ─────────────────────────────────────
function MemberChip({ label, cls }: { label: string; cls?: string }) {
  return <span className={cn("badge", cls ?? "text-bg-secondary")}>{label}</span>;
}

function EmptySlot({ side }: { side: "L" | "R" }) {
  return (
    <div
      className="border rounded-3 p-2 text-center text-muted small d-inline-block"
      style={{ minWidth: 170 }}
    >
      <MaterialIcon name={side === "L" ? "ArrowLeft" : "ArrowRight"} size={14} /> Boş bacak
    </div>
  );
}

function BinaryNodeCard({
  node,
  isRoot,
  onSelect,
  onRoot,
  onMove,
}: {
  node: BinaryTreeNode;
  isRoot: boolean;
  onSelect: () => void;
  onRoot: () => void;
  onMove: () => void;
}) {
  return (
    <div
      className={cn(
        "border rounded-3 p-2 text-start d-inline-block shadow-sm",
        isRoot ? "border-primary" : "border-secondary-subtle"
      )}
      style={{ minWidth: 178, background: "#fff" }}
    >
      <div className="d-flex justify-content-between gap-2 align-items-start">
        <button
          type="button"
          className="btn btn-link btn-sm p-0 text-start text-decoration-none lh-sm"
          onClick={onSelect}
          title="Üye kartını göster"
        >
          <span className="fw-semibold">{node.name || `Üye ${node.user_id}`}</span>
          {isRoot && <span className="badge text-bg-primary ms-1">Kök</span>}
        </button>
        <div className="d-flex gap-1 flex-shrink-0">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary p-0 px-1"
            onClick={onRoot}
            title="Bu üyeyi kök yap"
          >
            <MaterialIcon name="ArrowUp" size={13} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary p-0 px-1"
            onClick={onMove}
            title="Bu üyeyi taşı"
          >
            <MaterialIcon name="swap_horiz" size={13} />
          </button>
        </div>
      </div>
      <div className="small text-muted">
        {node.member_code || `#${node.user_id}`}
        {node.role === "admin" || node.role === "super_admin" ? ` · ${node.role}` : ""}
      </div>
      <div className="d-flex gap-1 mt-1 flex-wrap">
        {node.package && <MemberChip label={node.package} cls="text-bg-info" />}
        {node.rank && <MemberChip label={node.rank} cls="text-bg-warning" />}
        <MemberChip label={`PV ${node.total_pv_accumulated}`} cls="text-bg-light border" />
        {!node.is_active && <MemberChip label="Pasif" cls="text-bg-danger" />}
      </div>
      <div className="small text-muted mt-1">
        <MaterialIcon name="ArrowLeft" size={12} /> {node.total_pv_left} PV ·{" "}
        <MaterialIcon name="ArrowRight" size={12} /> {node.total_pv_right} PV
      </div>
    </div>
  );
}

function BinarySubtree({
  node,
  rootId,
  onSelect,
  onRoot,
  onMove,
}: {
  node: BinaryTreeNode | null;
  rootId: number;
  onSelect: (id: number) => void;
  onRoot: (node: BinaryTreeNode) => void;
  onMove: (node: BinaryTreeNode) => void;
}) {
  if (!node) return null;
  const hasKids = Boolean(node.left_child || node.right_child);
  return (
    <div className="text-center">
      <BinaryNodeCard
        node={node}
        isRoot={node.user_id === rootId}
        onSelect={() => onSelect(node.user_id)}
        onRoot={() => onRoot(node)}
        onMove={() => onMove(node)}
      />
      {hasKids && (
        <div className="row g-2 mt-1">
          <div className="col-6">
            <div className="small fw-semibold text-primary mb-1">
              <MaterialIcon name="ArrowLeft" size={13} /> Sol (L)
            </div>
            {node.left_child ? (
              <BinarySubtree
                node={node.left_child}
                rootId={rootId}
                onSelect={onSelect}
                onRoot={onRoot}
                onMove={onMove}
              />
            ) : (
              <EmptySlot side="L" />
            )}
          </div>
          <div className="col-6">
            <div className="small fw-semibold text-success mb-1">
              Sağ (R) <MaterialIcon name="ArrowRight" size={13} />
            </div>
            {node.right_child ? (
              <BinarySubtree
                node={node.right_child}
                rootId={rootId}
                onSelect={onSelect}
                onRoot={onRoot}
                onMove={onMove}
              />
            ) : (
              <EmptySlot side="R" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SponsorListItem({
  node,
  depth,
  onSelect,
}: {
  node: SponsorTreeNode;
  depth: number;
  onSelect: (id: number, label: string) => void;
}) {
  return (
    <li>
      <div className="d-flex align-items-center gap-2 py-1 flex-wrap" style={{ paddingLeft: depth * 18 }}>
        {depth > 0 && <span className="text-muted">└</span>}
        <button
          type="button"
          className="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
          onClick={() => onSelect(node.user_id, `${node.name || `Üye ${node.user_id}`} (${node.member_code || `#${node.user_id}`})`)}
          title="Bu üyeyi kök yap"
        >
          {node.name || `Üye ${node.user_id}`}
        </button>
        <MemberChip label={node.member_code || `#${node.user_id}`} cls="text-bg-light border" />
        {node.package_name && <MemberChip label={node.package_name} cls="text-bg-info" />}
        <MemberChip label={`PV ${node.total_pv_accumulated}`} cls="text-bg-light border" />
        {node.child_count > 0 && <MemberChip label={`${node.child_count} alt`} cls="text-bg-light border" />}
        {node.is_in_pending_pool && <MemberChip label="Havuzda" cls="text-bg-warning" />}
        {!node.is_active && <MemberChip label="Pasif" cls="text-bg-danger" />}
      </div>
      {node.children.length > 0 && (
        <ul className="list-unstyled mb-0">
          {node.children.map((c) => (
            <SponsorListItem key={c.user_id} node={c} depth={depth + 1} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Sayfa ────────────────────────────────────────────────────────────────
const DEPTHS = [1, 2, 3, 4, 5];

export default function AgacPage() {
  const [rootId, setRootId] = useState<number | null>(null);
  const [rootLabel, setRootLabel] = useState("");
  const [depth, setDepth] = useState(3);
  const [sponsorTree, setSponsorTree] = useState<SponsorTreeNode | null>(null);
  const [binaryTree, setBinaryTree] = useState<BinaryTreeNode | null>(null);
  const [card, setCard] = useState<UserCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Üye arama
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminUser[] | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Taşıma modalı
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState("");
  const [moveTarget, setMoveTarget] = useState<{ user_id: number; label: string } | null>(null);
  const [moveParentQ, setMoveParentQ] = useState("");
  const [moveParentResults, setMoveParentResults] = useState<AdminUser[] | null>(null);
  const [moveParent, setMoveParent] = useState<{ user_id: number; label: string } | null>(null);
  const [movePosition, setMovePosition] = useState<"L" | "R">("L");
  const parentRef = useRef<HTMLDivElement | null>(null);
  const parentTimer = useRef<number | null>(null);

  // Arama sonucu dışına tıklayınca kapanır
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchResults(null);
      if (parentRef.current && !parentRef.current.contains(target)) setMoveParentResults(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadTree = (userId: number, d: number) => {
    setLoading(true);
    setError("");
    Promise.all([getSponsorTree(userId, d), getBinaryTree(userId, d)])
      .then(([s, b]) => {
        setSponsorTree(s);
        setBinaryTree(b);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  const loadCard = (userId: number) => {
    getUserCard(userId)
      .then(setCard)
      .catch((err) => setError(getErrorMessage(err)));
  };

  // İlk açılışta yöneticinin kendi ağacı yüklenir
  useEffect(() => {
    api
      .get<{ user: AdminUser }>("/user/me")
      .then(({ data }) => {
        const me = data.user;
        setRootId(me.id);
        setRootLabel(`${me.name} (${me.member_code})`);
        loadTree(me.id, 3);
        loadCard(me.id);
      })
      .catch((err) => setError(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRoot = (id: number, label: string) => {
    setRootId(id);
    setRootLabel(label);
    setSearchQ("");
    setSearchResults(null);
    loadTree(id, depth);
    loadCard(id);
  };

  const runSearch = () => {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    searchUsers(q)
      .then(setSearchResults)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setSearching(false));
  };

  const changeDepth = (d: number) => {
    setDepth(d);
    if (rootId) loadTree(rootId, d);
  };

  const openMove = (target: { user_id: number; label: string }) => {
    setMoveTarget(target);
    setMoveParent(null);
    setMoveParentQ("");
    setMoveParentResults(null);
    setMovePosition("L");
    setMoveError("");
    setMoveOpen(true);
  };

  const runParentSearch = (q: string) => {
    setMoveParentQ(q);
    if (parentTimer.current !== null) window.clearTimeout(parentTimer.current);
    parentTimer.current = null;
    const trimmed = q.trim();
    if (!trimmed) {
      setMoveParentResults(null);
      return;
    }
    parentTimer.current = window.setTimeout(() => {
      searchUsers(trimmed)
        .then(setMoveParentResults)
        .catch(() => setMoveParentResults(null));
    }, 300);
  };

  const confirmMove = async () => {
    if (!moveTarget) return;
    if (!moveParent) {
      setMoveError("Taşıma için yeni üst üye seçilmelidir.");
      return;
    }
    if (moveParent.user_id === moveTarget.user_id) {
      setMoveError("Üye kendi altına taşınamaz.");
      return;
    }
    setMoveBusy(true);
    setMoveError("");
    try {
      await moveUserInTree(moveTarget.user_id, moveParent.user_id, movePosition);
      setNotice(`${moveTarget.label} üyesi ${moveParent.label} üyesinin altına taşındı.`);
      setMoveOpen(false);
      if (rootId) loadTree(rootId, depth);
      if (card) loadCard(card.user_id);
    } catch (err) {
      setMoveError(getErrorMessage(err));
    } finally {
      setMoveBusy(false);
    }
  };

  const numericId = /^\d+$/.test(searchQ.trim()) ? Number(searchQ.trim()) : null;

  return (
    <PanelLayout>
      <PageHeader
        title="Ağaç Görüntüleyici"
        subtitle="Sponsorluk ve binary ağaç görünümü — üye arayın, ağacı inceleyin, üyeleri taşıyın."
        breadcrumb={[{ text: "Genel Bakış", href: "/" }, { text: "Ağaç" }]}
      />

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      {/* ── Üye arama ── */}
      <PageCard
        title="Üye Arama"
        subtitle="Ad, e-posta, üye kodu veya telefon ile arayın — ID ile doğrudan açabilirsiniz."
        className="mb-3"
      >
        <div className="d-flex flex-wrap gap-2">
          <div ref={searchRef} className="position-relative flex-grow-1" style={{ maxWidth: 480 }}>
            <input
              className="form-control"
              placeholder="Üye ara… (ad / kod / e-posta / telefon / ID)"
              value={searchQ}
              onChange={(e) => {
                setSearchQ(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
            {searchResults !== null && (
              <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1050, maxHeight: 320, overflowY: "auto" }}>
                {searchResults.length === 0 && !numericId && (
                  <div className="list-group-item text-muted small">Sonuç bulunamadı.</div>
                )}
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2"
                    onClick={() => selectRoot(u.id, `${u.name} (${u.member_code})`)}
                  >
                    <span>
                      <span className="fw-semibold">{u.name}</span>{" "}
                      <span className="text-muted small">{u.member_code}</span>
                      <span className="text-muted small d-block">{u.email}</span>
                    </span>
                    <span>
                      <MemberChip label={u.role === "super_admin" ? "Süper Admin" : u.role === "admin" ? "Admin" : "Üye"} cls={u.role === "super_admin" ? "text-bg-danger" : u.role === "admin" ? "text-bg-warning" : "text-bg-light border"} />
                      {!u.is_active && <MemberChip label="Pasif" cls="text-bg-secondary" />}
                      <MaterialIcon name="ChevronRight" size={16} className="ms-1" />
                    </span>
                  </button>
                ))}
                {numericId !== null && (
                  <button
                    type="button"
                    className="list-group-item list-group-item-action py-2"
                    onClick={() => selectRoot(numericId, `Üye #${numericId}`)}
                  >
                    <MaterialIcon name="Search" size={14} className="me-1" />
                    <span className="fw-semibold">Üye #{numericId}</span>
                    <span className="text-muted small"> — ID ile doğrudan aç</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={runSearch} disabled={searching}>
            {searching ? (
              <MaterialIcon name="Loader2" size={14} className="animate-spin" />
            ) : (
              <MaterialIcon name="Search" size={14} className="me-1" />
            )}
            Ara
          </button>
        </div>

        <div className="d-flex align-items-center gap-2 mt-3 flex-wrap">
          <span className="small text-muted">Derinlik:</span>
          {DEPTHS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => changeDepth(d)}
              className={cn("btn btn-sm", depth === d ? "btn-primary" : "btn-outline-secondary")}
            >
              {d}
            </button>
          ))}
          <button
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={() => rootId && loadTree(rootId, depth)}
            title="Ağaçları yenile"
          >
            <MaterialIcon name="RefreshCw" size={13} className="me-1" />
            Yenile
          </button>
        </div>

        {rootId !== null && (
          <div className="mt-3">
            <InfoAlert>
              Kök üye: <strong>{rootLabel}</strong> — ağaçlar bu üyenin altında gösteriliyor.
            </InfoAlert>
          </div>
        )}
      </PageCard>

      {rootId === null ? (
        !error && <Loading text="Varsayılan üye yükleniyor…" />
      ) : (
        <>
          {/* ── Kök üye özeti ── */}
          {card && (
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <StatBox
                  color="primary"
                  icon={<MaterialIcon name="TrendingUp" size={22} />}
                  title="Sol Bacak PV"
                  value={card.total_pv_left.toLocaleString("tr-TR")}
                  footer={<span>Sol takım: {card.left_team_count} üye</span>}
                />
              </div>
              <div className="col-md-4">
                <StatBox
                  color="success"
                  icon={<MaterialIcon name="TrendingUp" size={22} />}
                  title="Sağ Bacak PV"
                  value={card.total_pv_right.toLocaleString("tr-TR")}
                  footer={<span>Sağ takım: {card.right_team_count} üye</span>}
                />
              </div>
              <div className="col-md-4">
                <StatBox
                  color="info"
                  icon={<MaterialIcon name="Users" size={22} />}
                  title="Toplam Takım"
                  value={card.total_team_count.toLocaleString("tr-TR")}
                  footer={<span>Üye: {card.name}</span>}
                />
              </div>
            </div>
          )}

          {/* ── Üye kartı ── */}
          {card && (
            <PageCard
              title="Üye Kartı"
              subtitle="Ağaç kartlarındaki detay — node'a tıklayınca da yüklenir."
              className="mb-3"
              actions={
                <button className="btn btn-sm btn-outline-primary" onClick={() => openMove({ user_id: card.user_id, label: `${card.name} (${card.member_code})` })}>
                  <MaterialIcon name="swap_horiz" size={13} className="me-1" />
                  Bu Üyeyi Taşı
                </button>
              }
            >
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="text-muted small">Üye</div>
                  <div className="fw-semibold">{card.name || `Üye ${card.user_id}`}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Üye Kodu</div>
                  <div className="fw-semibold">{card.member_code || `#${card.user_id}`}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Durum</div>
                  <div>
                    {card.is_active ? (
                      <MemberChip label="Aktif" cls="text-bg-success" />
                    ) : (
                      <MemberChip label="Pasif" cls="text-bg-danger" />
                    )}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Paket</div>
                  <div>{card.package || "—"}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Kariyer</div>
                  <div>{card.rank || "—"}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Binary Pozisyon</div>
                  <div>{positionLabel(card.position)}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Sponsor</div>
                  <div>{card.sponsor_name || "—"}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Cüzdan Bakiyesi</div>
                  <div className="fw-semibold">{tl(card.wallet_balance)}</div>
                </div>
                <div className="col-md-4">
                  <div className="text-muted small">Çip Bakiyesi</div>
                  <div className="fw-semibold">{tl(card.chip_balance)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted small">Sol PV / CV</div>
                  <div>{card.total_pv_left} / {card.total_cv_left}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted small">Sağ PV / CV</div>
                  <div>{card.total_pv_right} / {card.total_cv_right}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted small">Sol Takım</div>
                  <div>{card.left_team_count} üye</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted small">Sağ Takım</div>
                  <div>{card.right_team_count} üye</div>
                </div>
              </div>
            </PageCard>
          )}

          {/* ── Sponsorluk ağacı ── */}
          <PageCard
            title="Sponsorluk Ağacı"
            subtitle="Her üye kendi sponsorunun altında listelenir."
            className="mb-3"
            actions={<span className="badge text-bg-light border">Derinlik: {depth}</span>}
          >
            {loading ? (
              <Loading text="Ağaç yükleniyor…" />
            ) : sponsorTree ? (
              sponsorTree.children.length === 0 && sponsorTree.child_count === 0 ? (
                <InfoAlert>Bu üyenin altında sponsorluk bağlantısı yok.</InfoAlert>
              ) : (
                <ul className="list-unstyled mb-0">
                  <SponsorListItem node={sponsorTree} depth={0} onSelect={(id, label) => selectRoot(id, label)} />
                </ul>
              )
            ) : (
              <InfoAlert>Önce bir üye seçin.</InfoAlert>
            )}
          </PageCard>

          {/* ── Binary ağaç ── */}
          <PageCard
            title="Binary Ağaç"
            subtitle="Sol (L) ve sağ (R) bacaklar — node'a tıklayın: kart, kök yap, taşı."
            className="mb-3"
          >
            {loading ? (
              <Loading text="Ağaç yükleniyor…" />
            ) : binaryTree ? (
              <div className="overflow-auto">
                <BinarySubtree
                  node={binaryTree}
                  rootId={rootId}
                  onSelect={(id) => loadCard(id)}
                  onRoot={(n) => selectRoot(n.user_id, `${n.name || `Üye ${n.user_id}`} (${n.member_code || `#${n.user_id}`})`)}
                  onMove={(n) => openMove({ user_id: n.user_id, label: `${n.name || `Üye ${n.user_id}`} (${n.member_code || `#${n.user_id}`})` })}
                />
              </div>
            ) : (
              <InfoAlert>Önce bir üye seçin.</InfoAlert>
            )}
          </PageCard>
        </>
      )}

      {/* ── Taşıma modalı ── */}
      <ConfirmModal
        open={moveOpen}
        title="Üyeyi Taşı"
        confirmText="Taşı"
        busy={moveBusy}
        onConfirm={() => void confirmMove()}
        onCancel={() => setMoveOpen(false)}
      >
        {moveTarget && (
          <div className="mb-3">
            <label className="form-label">Taşınacak Üye</label>
            <div className="form-control bg-light">{moveTarget.label}</div>
          </div>
        )}

        <div className="mb-3" ref={parentRef}>
          <label className="form-label">Yeni Üst (Yeni Ebeveyn)</label>
          {moveParent ? (
            <div className="d-flex align-items-center gap-2">
              <div className="form-control bg-light flex-grow-1">{moveParent.label}</div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setMoveParent(null); setMoveParentResults(null); }}>
                <MaterialIcon name="X" size={13} /> Değiştir
              </button>
            </div>
          ) : (
            <div className="position-relative">
              <input
                className="form-control"
                placeholder="Yeni üst üye ara… (ad / kod / ID)"
                value={moveParentQ}
                onChange={(e) => runParentSearch(e.target.value)}
              />
              {moveParentResults !== null && (
                <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1060, maxHeight: 260, overflowY: "auto" }}>
                  {moveParentResults.length === 0 && (
                    <div className="list-group-item text-muted small">Sonuç bulunamadı.</div>
                  )}
                  {moveParentResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="list-group-item list-group-item-action py-2 d-flex justify-content-between align-items-center"
                      onClick={() => {
                        setMoveParent({ user_id: u.id, label: `${u.name} (${u.member_code})` });
                        setMoveParentResults(null);
                        setMoveParentQ("");
                      }}
                    >
                      <span>
                        <span className="fw-semibold">{u.name}</span>{" "}
                        <span className="text-muted small">{u.member_code}</span>
                      </span>
                      <MaterialIcon name="ChevronRight" size={15} />
                    </button>
                  ))}
                  {/^\d+$/.test(moveParentQ.trim()) && (
                    <button
                      type="button"
                      className="list-group-item list-group-item-action py-2"
                      onClick={() => {
                        const id = Number(moveParentQ.trim());
                        setMoveParent({ user_id: id, label: `Üye #${id}` });
                        setMoveParentResults(null);
                        setMoveParentQ("");
                      }}
                    >
                      <MaterialIcon name="Search" size={13} className="me-1" />
                      <span className="fw-semibold">Üye #{moveParentQ.trim()}</span>
                      <span className="text-muted small"> — ID ile seç</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label d-block">Pozisyon (Binary Bacak)</label>
          <div className="d-flex gap-2">
            <button
              type="button"
              className={cn("btn btn-sm", movePosition === "L" ? "btn-primary" : "btn-outline-secondary")}
              onClick={() => setMovePosition("L")}
            >
              <MaterialIcon name="ArrowLeft" size={13} className="me-1" /> Sol (L)
            </button>
            <button
              type="button"
              className={cn("btn btn-sm", movePosition === "R" ? "btn-success" : "btn-outline-secondary")}
              onClick={() => setMovePosition("R")}
            >
              Sağ (R) <MaterialIcon name="ArrowRight" size={13} className="ms-1" />
            </button>
          </div>
        </div>

        {moveError && <div className="alert alert-danger py-2 mb-0">{moveError}</div>}

        <div className="alert alert-warning mt-3 mb-0 py-2 small">
          Üye, alt ağacıyla birlikte taşınır; bacak PV/CV toplamları yeniden hesaplanır ve binary
          eşleşme çalıştırılır. İşlem denetim kaydına yazılır.
        </div>
      </ConfirmModal>
    </PanelLayout>
  );
}
