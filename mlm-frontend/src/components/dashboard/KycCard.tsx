"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ShieldCheck, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listMyKyc, submitKyc, uploadFile, getErrorMessage, type KycDocument } from "@/services/api";
import { cn } from "@/lib/utils";

function statusMeta(status: string): { label: string; cls: string } {
  if (status === "approved") return { label: "Onaylandı", cls: "bg-[#2E7D32]/15 text-[#2E7D32] border-[#2E7D32]/40" };
  if (status === "rejected") return { label: "Reddedildi", cls: "bg-red-500/15 text-red-600 border-red-500/40" };
  return { label: "İnceleniyor", cls: "bg-amber-500/15 text-amber-600 border-amber-500/40" };
}

const docTypeLabel = (t: string) => (t === "identity" ? "Kimlik Belgesi" : "Adres Belgesi");

// KYC: ödeme yapabilmek için kimlik/adres belgesi yükleme ve durum takibi.
export default function KycCard() {
  const [docs, setDocs] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"identity" | "address" | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<"identity" | "address">("identity");

  const load = () => {
    setLoading(true);
    listMyKyc()
      .then(setDocs)
      .catch((e) => {
        // Backend KYC altyapısı henüz yayında değilse (404) hata gösterme,
        // bilgilendirme göster — canlı üye deneyimi bozulmasın.
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          setUnavailable(true);
          setDocs([]);
        } else {
          setErr(getErrorMessage(e));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const pickFile = (type: "identity" | "address") => {
    pendingType.current = type;
    fileRef.current?.click();
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(pendingType.current);
    setErr("");
    setMsg("");
    try {
      const filePath = await uploadFile(file);
      await submitKyc(pendingType.current, filePath);
      setMsg(`${docTypeLabel(pendingType.current)} yüklendi — inceleme bekleniyor.`);
      load();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setUploading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card className="rounded">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="text-primary size-5" />
          KYC — Kimlik Doğrulama
        </h3>
        <span className="text-muted-foreground text-xs">Ödeme yapabilmek için zorunludur</span>
      </div>
      <CardContent className="space-y-3">
        {unavailable ? (
          <p className="text-muted-foreground text-sm">
            KYC doğrulama altyapısı yakında aktif olacak — şimdilik belge yüklemesi yapılamıyor.
          </p>
        ) : (
          <>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={uploading !== null}
            onClick={() => pickFile("identity")}
          >
            {uploading === "identity" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Kimlik Belgesi Yükle
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading !== null}
            onClick={() => pickFile("address")}
          >
            {uploading === "address" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Adres Belgesi Yükle
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {msg && <p className="text-[#2E7D32] text-sm font-medium">{msg}</p>}
        {err && <p className="text-red-600 text-sm font-medium">{err}</p>}
          </>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Yükleniyor…</p>
        ) : docs.length === 0 ? (
          <p className="text-muted-foreground text-sm">Henüz belge yüklemediniz.</p>
        ) : (
          <ul className="divide-border divide-y text-sm">
            {docs.map((d) => {
              const meta = statusMeta(d.status);
              return (
                <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-medium">{docTypeLabel(d.document_type)}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {new Date(d.submitted_at).toLocaleDateString("tr-TR")}
                    </span>
                    <Badge className={cn("border px-2 py-0.5 text-[11px]", meta.cls)}>{meta.label}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
