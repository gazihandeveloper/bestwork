"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/MaterialIcon";
import PanelLayout from "@/components/PanelLayout";
import PageHeader from "@/components/PageHeader";
import DashboardCharts from "@/components/DashboardCharts";
import {
  getAdminDashboard,
  listWithdrawals,
  monthlyClose,
  getAdminRevenue,
  getCommissionSeries,
  getRankDistribution,
  getTopProducts,
  getFraudDuplicates,
  listTopEarners,
  listProducts,
  runBonusJob,
  getJob,
  approveWithdrawal,
  rejectWithdrawal,
  getErrorMessage,
} from "@/lib/api";
import type {
  AdminDashboard,
  RevenuePoint,
  RankDist,
  TopProduct,
  FraudDuplicate,
  WithdrawRequest,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const shortTl = (v: number) => {
  if (Math.abs(v) >= 1000000) return `₺${(v / 1000000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(v) >= 1000) return `₺${(v / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}K`;
  return tl(v);
};

type Period = "daily" | "weekly" | "monthly";

export default function DashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [revPeriod, setRevPeriod] = useState<Period>("monthly");
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [commissions, setCommissions] = useState<RevenuePoint[]>([]);
  const [rankDist, setRankDist] = useState<RankDist[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [fraud, setFraud] = useState<FraudDuplicate[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [topEarners, setTopEarners] = useState<{ user_id: number; name: string; member_code: string; total_earned: number }[]>([]);
  const [stockAlerts, setStockAlerts] = useState<{ name: string; stock: number }[]>([]);
  const [busyW, setBusyW] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeMsg, setCloseMsg] = useState("");
  const [jobState, setJobState] = useState<"idle" | "running" | "done">("idle");
  const [jobPct, setJobPct] = useState(0);
  const [actMsg, setActMsg] = useState("");
  const jobTimer = useRef<number | null>(null);

  const loadMain = () => {
    Promise.all([
      getAdminDashboard(),
      listWithdrawals(),
      getRankDistribution(),
      getTopProducts(5),
      getFraudDuplicates(8),
      listTopEarners(5),
      listProducts(),
    ])
      .then(([d, ws, rd, tp, fd, te, pr]) => {
        setData(d);
        setWithdrawals(ws);
        setRankDist(rd);
        setTopProducts(tp);
        setFraud(fd);
        setTopEarners(te);
        setStockAlerts(pr.filter((p) => p.stock <= 5).slice(0, 8).map((p) => ({ name: p.name, stock: p.stock })));
      })
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(() => {
    loadMain();
  }, []);

  useEffect(() => {
    Promise.all([getAdminRevenue(revPeriod, revPeriod === "daily" ? 30 : 12), getCommissionSeries(revPeriod, revPeriod === "daily" ? 30 : 12)])
      .then(([r, c]) => {
        setRevenue(r);
        setCommissions(c);
      })
      .catch(() => {});
  }, [revPeriod]);

  useEffect(
    () => () => {
      if (jobTimer.current) window.clearInterval(jobTimer.current);
    },
    []
  );

  const handleMonthlyClose = async () => {
    setCloseMsg("");
    setClosing(true);
    try {
      await monthlyClose();
      setCloseMsg("Aylık kapanış tamamlandı.");
      loadMain();
    } catch (err) {
      setCloseMsg(getErrorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  const handleBonusRun = async () => {
    setActMsg("");
    setJobState("running");
    setJobPct(0);
    try {
      const jobId = await runBonusJob("weekly");
      const poll = async () => {
        const job = await getJob(jobId);
        setJobPct(job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0);
        if (job.status === "completed") {
          setJobState("done");
          setActMsg(`Komisyon kapanışı tamamlandı (iş #${jobId}). ${job.total} üye işlendi.`);
          loadMain();
        } else if (job.status === "failed") {
          setJobState("done");
          setActMsg("Komisyon kapanışı başarısız: " + (job.error ?? "bilinmeyen hata"));
        } else {
          jobTimer.current = window.setTimeout(poll, 2000);
        }
      };
      jobTimer.current = window.setTimeout(poll, 2000);
    } catch (err) {
      setActMsg(getErrorMessage(err));
      setJobState("done");
    }
  };

  const actWithdrawal = async (id: number, act: "approve" | "reject") => {
    setBusyW(id);
    try {
      if (act === "approve") await approveWithdrawal(id);
      else await rejectWithdrawal(id);
      setWithdrawals((ws) => ws.filter((w) => w.id !== id));
    } catch (err) {
      setActMsg(getErrorMessage(err));
    } finally {
      setBusyW(null);
    }
  };

  if (error) {
    return (
      <PanelLayout>
        <div className="alert alert-danger py-2">{error}</div>
      </PanelLayout>
    );
  }
  if (!data) {
    return (
      <PanelLayout>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{ width: "2.2rem", height: "2.2rem" }} />
        </div>
      </PanelLayout>
    );
  }

  const payoutPct = data.total_revenue > 0 ? Math.round((data.total_commissions_paid / data.total_revenue) * 1000) / 10 : 0;
  const payoutOver = payoutPct > 50;
  const activePct = data.total_users > 0 ? Math.round((data.active_users / data.total_users) * 100) : 0;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const pendingAmount = pendingWithdrawals.reduce((s, w) => s + (w.amount ?? 0), 0);
  const growth = data.registration_growth ?? [];

  const riskFlags: { tone: string; icon: React.ReactNode; text: string }[] = [];
  if (payoutOver) riskFlags.push({ tone: "danger", icon: <MaterialIcon name="TrendingUp" className="size-4" />, text: `Payout oranı %${payoutPct} — hedef %50 aşıldı, marj kontrolü gerekli.` });
  fraud.slice(0, 4).forEach((f) =>
    riskFlags.push({
      tone: "danger",
      icon: <MaterialIcon name="Fingerprint" className="size-4" />,
      text: `${f.field === "tc" ? "TC" : f.field === "iban" ? "IBAN" : "Telefon"} ile ${f.count} hesap eşleşti (${f.value}).`,
    })
  );
  stockAlerts.slice(0, 4).forEach((s) =>
    riskFlags.push({ tone: "warning", icon: <MaterialIcon name="ShoppingCart" className="size-4" />, text: `Stok kritik: ${s.name} (${s.stock} adet).` })
  );
  if (stockAlerts.length > 4)
    riskFlags.push({ tone: "warning", icon: <MaterialIcon name="ShoppingCart" className="size-4" />, text: `+${stockAlerts.length - 4} kritik stok kalemi daha var.` });
  if (riskFlags.length === 0) riskFlags.push({ tone: "success", icon: <MaterialIcon name="ShieldCheck" className="size-4" />, text: "Şu anda anormal durum yok." });

  return (
    <PanelLayout>
      <PageHeader title="Genel Bakış" subtitle="Organizasyonun finansal sağlığı, büyümesi ve riskleri tek bakışta." />

      {/* 1) KPI kartları */}
      <div className="row kpi-row">
        <div className="col-12 col-sm-6 col-lg mb-3">
          <div className="small-box text-bg-primary">
            <div className="inner">
              <h3>{shortTl(data.total_revenue)}</h3>
              <p>Toplam Ciro</p>
              <small className="fw-bold">Tüm zamanlar</small>
            </div>
            <span className="small-box-icon" aria-hidden="true"><MaterialIcon name="Wallet" size={60} /></span>
            <Link href="/raporlar" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Detay <MaterialIcon name="ArrowUpRight" size={12} />
            </Link>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg mb-3">
          <div className="small-box text-bg-success">
            <div className="inner">
              <h3>{shortTl(data.total_commissions_paid)}</h3>
              <p>Dağıtılan Komisyon</p>
              <small className="fw-bold">Toplam ödenen</small>
            </div>
            <span className="small-box-icon" aria-hidden="true"><MaterialIcon name="Coins" size={60} /></span>
            <Link href="/bonus" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Detay <MaterialIcon name="ArrowUpRight" size={12} />
            </Link>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg mb-3">
          <div className="small-box text-bg-info">
            <div className="inner">
              <h3>{shortTl(data.net_profit)}</h3>
              <p>Net Kâr</p>
              <small className="fw-bold">Payout: %{payoutPct} {payoutOver && "(aşıldı!)"}</small>
            </div>
            <span className="small-box-icon" aria-hidden="true"><MaterialIcon name="TrendingUp" size={60} /></span>
            <Link href="/raporlar" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Detay <MaterialIcon name="ArrowUpRight" size={12} />
            </Link>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg mb-3">
          <div className="small-box text-bg-warning">
            <div className="inner">
              <h3>{pendingWithdrawals.length}</h3>
              <p>Bekleyen Çekim</p>
              <small className="fw-bold">Tutar: {shortTl(pendingAmount)}</small>
            </div>
            <span className="small-box-icon" aria-hidden="true"><MaterialIcon name="Hourglass" size={60} /></span>
            <Link href="/cekimler" className="small-box-footer link-dark link-underline-opacity-0 link-underline-opacity-50-hover">
              İncele <MaterialIcon name="ArrowUpRight" size={12} />
            </Link>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-lg mb-3">
          <div className="small-box text-bg-danger">
            <div className="inner">
              <h3>{data.active_users.toLocaleString("tr-TR")}</h3>
              <p>Aktif Üye</p>
              <small className="fw-bold">%{activePct} aktif oranı</small>
            </div>
            <span className="small-box-icon" aria-hidden="true"><MaterialIcon name="Users" size={60} /></span>
            <Link href="/bekleyenler" className="small-box-footer link-light link-underline-opacity-0 link-underline-opacity-50-hover">
              Detay <MaterialIcon name="ArrowUpRight" size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* 2) Grafikler + 3) Risk */}
      <div className="row">
        <div className="col-lg-8 mb-3">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h3 className="card-title mb-0">Ciro & Komisyon Karşılaştırma</h3>
              <div className="card-tools d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  style={{ width: 120 }}
                  value={revPeriod}
                  onChange={(e) => setRevPeriod(e.target.value as Period)}
                  aria-label="Ciro dönemi"
                >
                  <option value="monthly">Aylık</option>
                  <option value="weekly">Haftalık</option>
                  <option value="daily">Günlük</option>
                </select>
                <button type="button" className="btn btn-warning btn-sm" onClick={handleMonthlyClose} disabled={closing}>
                  {closing ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" /> : <MaterialIcon name="CalendarCheck" size={15} className="me-1" />}
                  {closing ? "Çalışıyor…" : "Aylık Kapanış"}
                </button>
              </div>
            </div>
            <div className="card-body">
              {closeMsg && <div className="alert alert-info py-2">{closeMsg}</div>}
              <div className="d-flex flex-wrap gap-3 mb-3">
                <div className="flex-fill border rounded p-2 text-center">
                  <div className="text-muted small text-uppercase fw-bold">Toplam Ciro</div>
                  <div className="fw-bold fs-5">{shortTl(data.total_revenue)}</div>
                </div>
                <div className="flex-fill border rounded p-2 text-center">
                  <div className="text-muted small text-uppercase fw-bold">Dağıtılan Komisyon</div>
                  <div className="fw-bold fs-5">{shortTl(data.total_commissions_paid)}</div>
                </div>
                <div className="flex-fill border rounded p-2 text-center">
                  <div className="text-muted small text-uppercase fw-bold">Payout Oranı</div>
                  <div className={cn("fw-bold fs-5", payoutOver ? "text-danger" : "text-success")}>%{payoutPct}</div>
                </div>
              </div>
              {revenue.length === 0 && commissions.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">Bu dönem için henüz veri yok.</p>
              ) : (
                <DashboardCharts variant="comparison" period={revPeriod} revenue={revenue} commissions={commissions} growth={growth} rankDist={rankDist} />
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Risk & Güvenlik Alarmları</h3>
            </div>
            <div className="card-body p-3">
              {riskFlags.map((f, i) => (
                <div key={i} className={cn("alert d-flex align-items-start gap-2 py-2 mb-2", `alert-${f.tone}`)}>
                  {f.icon}
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ağ büyüme + Kariyer pastası + Hızlı aksiyonlar */}
      <div className="row">
        <div className="col-lg-8 mb-3">
          <div className="row">
            <div className="col-md-6 mb-3 mb-md-0">
              <div className="card h-100">
                <div className="card-header">
                  <h3 className="card-title">Ağ Büyüme</h3>
                </div>
                <div className="card-body">
                  {growth.length === 0 ? (
                    <p className="text-muted text-center py-4 mb-0">Kayıt verisi yok.</p>
                  ) : (
                    <DashboardCharts variant="growth" period={revPeriod} revenue={revenue} commissions={commissions} growth={growth} rankDist={rankDist} />
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header">
                  <h3 className="card-title">Kariyer Dağılımı</h3>
                </div>
                <div className="card-body">
                  {rankDist.length === 0 ? (
                    <p className="text-muted text-center py-4 mb-0">Kariyer verisi yok.</p>
                  ) : (
                    <DashboardCharts variant="career" period={revPeriod} revenue={revenue} commissions={commissions} growth={growth} rankDist={rankDist} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Hızlı Yönetici Aksiyonları</h3>
            </div>
            <div className="card-body d-flex flex-column gap-2">
              <button className="btn btn-primary" onClick={handleBonusRun} disabled={jobState === "running"}>
                {jobState === "running" ? <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" /> : <MaterialIcon name="cpu" size={15} className="me-1" />}
                {jobState === "running" ? "Çalışıyor…" : "Komisyon Kapanışını Tetikle"}
              </button>
              {jobState === "running" && (
                <div className="progress" style={{ height: 12 }}>
                  <div className="progress-bar" style={{ width: `${jobPct}%` }}>{jobPct}%</div>
                </div>
              )}
              <button className="btn btn-outline-secondary" onClick={() => setActMsg("Bakım modu için backend desteği bekleniyor (settings anahtarı).")}>
                <MaterialIcon name="pause_circle" size={15} className="me-1" /> Bakım Modu / Dondur
              </button>
              <button className="btn btn-outline-secondary" onClick={() => setActMsg("Toplu duyuru/SMS için backend desteği bekleniyor (iletişim modülü).")}>
                <MaterialIcon name="Send" size={15} className="me-1" /> Toplu Duyuru / SMS
              </button>
              {actMsg && <div className="alert alert-info py-2 mb-0">{actMsg}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 4) Hızlı ödeme onayı — tam genişlik */}
      <div className="row">
        <div className="col-12 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Hızlı Ödeme Onayı</h3>
              <div className="card-tools">
                <span className="badge text-bg-warning">{pendingWithdrawals.length} bekliyor</span>
              </div>
            </div>
            <div className="card-body p-0">
              {pendingWithdrawals.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">Onay bekleyen çekim yok.</p>
              ) : (
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Talep</th>
                      <th>Tutar</th>
                      <th className="text-end">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWithdrawals.slice(0, 6).map((w) => (
                      <tr key={w.id}>
                        <td className="fw-semibold">#{w.id} · Üye {w.user_id}</td>
                        <td>{tl(w.amount)}</td>
                        <td className="text-end">
                          <button className="btn btn-sm btn-success me-1" disabled={busyW !== null} onClick={() => actWithdrawal(w.id, "approve")}>
                            {busyW === w.id ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Onayla"}
                          </button>
                          <button className="btn btn-sm btn-outline-danger" disabled={busyW !== null} onClick={() => actWithdrawal(w.id, "reject")}>
                            Reddet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Son kayıtlar & liderler + en çok satan */}
      <div className="row">
        <div className="col-lg-8 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Son Kayıtlar & Liderler</h3>
            </div>
            <div className="card-body p-0">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Üye</th>
                    <th>Üye No</th>
                    <th>Rol</th>
                    <th className="text-end">Toplam Kazanç</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_users.slice(0, 3).map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold">{u.name}</td>
                      <td>{u.member_code}</td>
                      <td><span className={cn("badge", u.role === "admin" || u.role === "super_admin" ? "text-bg-warning" : "text-bg-info")}>{u.role}</span></td>
                      <td className="text-end text-muted">—</td>
                    </tr>
                  ))}
                  {topEarners.slice(0, 3).map((e) => (
                    <tr key={e.user_id}>
                      <td className="fw-semibold">{e.name}</td>
                      <td>{e.member_code}</td>
                      <td><span className="badge text-bg-success">Lider</span></td>
                      <td className="text-end fw-bold">{shortTl(e.total_earned)}</td>
                    </tr>
                  ))}
                  {data.recent_users.length === 0 && topEarners.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-muted py-4">Kayıt yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-lg-4 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">En Çok Satan Ürünler</h3>
            </div>
            <div className="card-body p-0">
              {topProducts.length === 0 ? (
                <p className="text-muted text-center py-4 mb-0">Sipariş verisi yok.</p>
              ) : (
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Ürün</th>
                      <th>Adet</th>
                      <th className="text-end">Ciro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => (
                      <tr key={p.name}>
                        <td className="fw-semibold">{p.name}</td>
                        <td>{p.quantity}</td>
                        <td className="text-end">{shortTl(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5) Coğrafi dağılım */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Coğrafi & Bölgesel Dağılım</h3>
            </div>
            <div className="card-body">
              <div className="alert alert-info d-flex align-items-center gap-2 mb-0">
                <MaterialIcon name="MapPin" size={16} />
                Üye kayıtlarında ülke/şehir bilgisi toplanmaya başlandığında ciro ve ağ büyümesinin ısı haritası burada görünecek.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelLayout>
  );
}
