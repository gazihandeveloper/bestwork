"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { MaterialIcon } from "@/components/MaterialIcon";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { checkReferral } from "@/services/api";
import { ILLER } from "@/data/iller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const PROVINCES = [
  "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
  "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
  "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane",
  "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli",
  "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş",
  "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
  "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
  "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye",
  "Düzce",
];

const schema = yup.object({
  ad: yup.string().required("Adınız zorunludur"),
  soyad: yup.string().required("Soyadınız zorunludur"),
  email: yup.string().email("Geçerli bir e-posta girin").required("E-posta zorunludur"),
  phone: yup.string().required("Cep telefonunuz zorunludur"),
  notTurkish: yup.boolean(),
  tcNo: yup.string().when("notTurkish", {
    is: false,
    then: (s) => s.matches(/^[0-9]{11}$/, "TC Kimlik No 11 haneli olmalıdır").required("TC Kimlik No zorunludur"),
    otherwise: (s) => s.optional(),
  }),
  birthDay: yup.string().optional(),
  birthMonth: yup.string().optional(),
  birthYear: yup.string().optional(),
  gender: yup.string().optional(),
  password: yup.string().min(8, "Şifre en az 8 karakter olmalıdır").max(72, "Şifre en fazla 72 karakter olmalıdır").required("Şifre zorunludur"),
  passwordRepeat: yup.string().oneOf([yup.ref("password")], "Şifreler eşleşmiyor").required("Şifrenizi tekrar yazın"),
  memberType: yup.string().default("Bireysel"),
  role: yup.string().oneOf(["user", "customer"]).default("user"),
  country: yup.string().required("Ülke zorunludur"),
  city: yup.string().required("İl seçiniz"),
  district: yup.string().required("İlçe zorunludur"),
  neighborhood: yup.string().optional(),
  taxOffice: yup.string().optional(),
  taxNo: yup.string().optional(),
  postalCode: yup.string().optional(),
  address: yup.string().optional(),
  agreeContract: yup.boolean().oneOf([true], "Sözleşmeyi onaylamalısınız"),
  agreeKVKK: yup.boolean().oneOf([true], "KVKK sözleşmesini onaylamalısınız"),
});

type RegisterForm = yup.InferType<typeof schema>;

const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const years = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="mt-1 flex items-center gap-1.25">
      <span className="bg-primary flex size-[26px] shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white">
        {number}
      </span>
      <h2 className="text-primary-dark text-[1.05rem] font-bold">{title}</h2>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive mt-1 text-xs font-medium">{message}</p>;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [noSponsor, setNoSponsor] = useState(false);
  const [stage, setStage] = useState<"sponsor" | "form">("sponsor");
  const [refStatus, setRefStatus] = useState<"idle" | "checking" | "found" | "notfound">("idle");
  const [refOwner, setRefOwner] = useState("");
  const [refCode, setRefCode] = useState("");

  // Referans linkinden gelen ?ref= kodu ile başla.
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && !refCode) {
      const t = setTimeout(() => setRefCode(ref), 0);
      return () => clearTimeout(t);
    }
  }, [searchParams, refCode]);

  const {
    register: registerField,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      memberType: "Bireysel",
      country: "Türkiye",
      notTurkish: false,
      agreeContract: false,
      agreeKVKK: false,
    },
  });

  // İl seçilince ilçeler otomatik dolar; il değişince ilçe sıfırlanır.
  const selectedCity = watch("city");
  useEffect(() => {
    setValue("district", "");
  }, [selectedCity, setValue]);

  // Referans kodunu 500ms debounce ile sistemde ara.
  useEffect(() => {
    const code = refCode.trim();
    const id = setTimeout(() => {
      if (!code) {
        setRefStatus("idle");
        return;
      }
      checkReferral(code).then((res) => {
        setRefStatus(res.found ? "found" : "notfound");
        setRefOwner(res.found ? `${res.name} (${res.member_code})` : "");
      });
    }, 500);
    return () => clearTimeout(id);
  }, [refCode]);

  // ?ref= ile gelindiyse ve kod bulunduysa forma otomatik geç.
  useEffect(() => {
    if (refStatus === "found" && stage === "sponsor") {
      const t = setTimeout(() => setStage("form"), 0);
      return () => clearTimeout(t);
    }
  }, [refStatus, stage]);

  const searchRef = () => {
    const code = refCode.trim();
    if (!code) {
      setRefStatus("notfound");
      return;
    }
    setRefStatus("checking");
    checkReferral(code).then((res) => {
      setRefStatus(res.found ? "found" : "notfound");
      setRefOwner(res.found ? `${res.name} (${res.member_code})` : "");
    });
  };

  const continueWithRef = () => {
    setStage("form");
  };

  const continueWithout = () => {
    setNoSponsor(true);
    setStage("form");
  };

  const onSubmit = async (values: RegisterForm) => {
    setError("");
    try {
      const birthDate =
        values.birthDay && values.birthMonth && values.birthYear
          ? `${values.birthDay}/${values.birthMonth}/${values.birthYear}`
          : "";
      await register(
        `${values.ad.trim()} ${values.soyad.trim()}`,
        values.email,
        values.password,
        noSponsor ? undefined : (refCode.trim() || undefined),
        values.role,
        values.phone,
        {
          member_type: values.memberType,
          country: values.country,
          city: values.city,
          district: values.district,
          neighborhood: values.neighborhood || "",
          tax_office: values.taxOffice || "",
          tax_no: values.taxNo || "",
          postal_code: values.postalCode || "",
          address: values.address || "",
          gender: values.gender || "",
          birth_date: birthDate,
          tc_no: values.notTurkish ? "" : values.tcNo || "",
        },
      );
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const inputCls = (hasError?: boolean) =>
    cn(hasError && "border-destructive focus-visible:ring-destructive/40");

  return (
    <div
      className="flex min-h-screen items-center px-0 pt-[104px] pb-6 md:pt-[88px]"
      style={{
        background:
          "linear-gradient(180deg, var(--background) 0%, var(--secondary-light) 100%)",
      }}
    >
      <div className={cn("mx-auto w-full", stage === "sponsor" ? "max-w-sm" : "max-w-4xl")}>
        <div className="border-border bg-card overflow-hidden rounded shadow-[0_2px_4px_rgba(0,0,0,0.18),0_4px_8px_3px_rgba(0,0,0,0.10)]">
          <div
            className="relative px-4 py-3.5 text-center text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--primary-dark), var(--secondary-dark))",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-[50px] -right-10 size-[180px] rounded-full bg-[#D8F0DC] opacity-25"
            />
            <div
              className="bg-[#D8F0DC] text-primary-dark mx-auto mb-1 flex size-[60px] items-center justify-center rounded-full"
            >
              <MaterialIcon name="UserPlus" className="size-8" />
            </div>
            <h1 className="text-2xl font-extrabold">Kayıt Ol</h1>
            <p className="mt-0.5 text-sm text-white/85">
              Üye ol, ağını kur, kazanmaya başla. Üye Numaranız otomatik oluşturulur.
            </p>
          </div>

          <div className="px-4 pt-3 pb-4 md:px-6">
            {stage === "sponsor" ? (
              <div className="border-border bg-secondary/10 flex flex-col gap-1.5 rounded-[17px] border p-4">
                <div className="flex items-center gap-1">
                  <MaterialIcon name="handshake" className="text-primary size-5" />
                  <p className="text-base font-bold">Sponsor Üye Numarası</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Sizi BestWork&apos;e davet eden üyenin numarasını girin
                </p>
                <div className="flex items-start gap-1.5">
                  <div className="flex-1">
                    <Input
                      placeholder="Referans Numaranızı Girin"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value)}
                      className={cn(
                        refStatus === "notfound" &&
                          "border-destructive focus-visible:ring-destructive/40"
                      )}
                    />
                    {refStatus === "notfound" && (
                      <p className="text-destructive mt-1 text-xs">
                        Bu referans kodu bulunamadı.
                      </p>
                    )}
                  </div>
                  <Button onClick={searchRef} disabled={refStatus === "checking"} className="h-10 shrink-0 px-4">
                    {refStatus === "checking" ? <MaterialIcon name="Loader2" className="size-4 animate-spin" /> : "Ara"}
                  </Button>
                </div>

                {refStatus === "found" && (
                  <div className="border-[#2E7D32]/50 bg-[#2E7D32]/10 text-[#2E7D32] flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <MaterialIcon name="check_circle" className="size-5 shrink-0" />
                    <span>
                      Sponsor Üyeniz: <strong>{refOwner}</strong>
                    </span>
                  </div>
                )}
                {refStatus === "notfound" && (
                  <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <MaterialIcon name="error" className="size-5 shrink-0" />
                    Bu referans kodu sistemde bulunamadı. Lütfen kontrol edin.
                  </div>
                )}

                <Button className="mt-0.5 w-full" disabled={refStatus !== "found"} onClick={continueWithRef}>
                  Devam Et
                </Button>
                <Button variant="outline" className="border-[#2E7D32] text-[#2E7D32] w-full hover:bg-[#2E7D32]/5" onClick={continueWithout}>
                  SPONSORUM YOK
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5">
                <Button
                  variant="ghost"
                  onClick={() => setStage("sponsor")}
                  className="text-foreground ml-[-4px] self-start font-semibold"
                >
                  <MaterialIcon name="ArrowRight" className="size-4 rotate-180" />
                  Sponsoru değiştir
                </Button>

                {noSponsor ? (
                  <div className="border-[#0288D1]/50 bg-[#0288D1]/10 text-[#0277BD] flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <span>Sponsorsuz kayıt oluyorsunuz. Üye Numaranız otomatik oluşturulacak.</span>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setStage("sponsor")}>
                      Referans Belirt
                    </Button>
                  </div>
                ) : (
                  <div className="border-[#2E7D32]/50 bg-[#2E7D32]/10 text-[#2E7D32] flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <MaterialIcon name="check_circle" className="size-5 shrink-0" />
                    <span>
                      Sponsor Üyeniz: <strong>{refOwner}</strong>
                    </span>
                  </div>
                )}

                {error && (
                  <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* 1. Kişisel Bilgiler */}
                <SectionHeader number={1} title="Kişisel Bilgileriniz" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Input placeholder="Adınızı yazın" className={inputCls(!!errors.ad)} {...registerField("ad")} />
                    <FieldError message={errors.ad?.message} />
                  </div>
                  <div>
                    <Input placeholder="Soyadınızı yazın" className={inputCls(!!errors.soyad)} {...registerField("soyad")} />
                    <FieldError message={errors.soyad?.message} />
                  </div>
                  <div>
                    <Select {...registerField("birthDay")} defaultValue="">
                      <option value="">Gün</option>
                      {days.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Select {...registerField("birthMonth")} defaultValue="">
                      <option value="">Ay</option>
                      {months.map((m, i) => (
                        <option key={m} value={String(i + 1)}>{m}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Select {...registerField("birthYear")} defaultValue="">
                      <option value="">Yıl</option>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Select {...registerField("gender")} defaultValue="">
                      <option value="">Seçiniz</option>
                      <option value="Kadın">Kadın</option>
                      <option value="Erkek">Erkek</option>
                      <option value="Belirtmek istemiyorum">Belirtmek istemiyorum</option>
                    </Select>
                  </div>
                  <div>
                    <Input
                      placeholder="11 haneli T.C. kimlik numaranız"
                      className={inputCls(!!errors.tcNo)}
                      {...registerField("tcNo")}
                    />
                    <FieldError message={errors.tcNo?.message} />
                    <label className="text-muted-foreground mt-0.5 flex cursor-pointer items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-[#476F16]"
                        {...registerField("notTurkish")}
                      />
                      T.C. uyruklu değilim.
                    </label>
                  </div>
                </div>

                {/* 2. İletişim Bilgileri */}
                <SectionHeader number={2} title="İletişim Bilgileriniz" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Input
                      placeholder="05XX XXX XX XX"
                      className={inputCls(!!errors.phone)}
                      {...registerField("phone")}
                    />
                    <FieldError message={errors.phone?.message} />
                    {!errors.phone && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Şifre sıfırlama ve bildirimler bu numaraya gönderilir
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="ornek@eposta.com"
                      type="email"
                      className={inputCls(!!errors.email)}
                      {...registerField("email")}
                    />
                    <FieldError message={errors.email?.message} />
                  </div>
                </div>

                {/* 3. Şifre */}
                <SectionHeader number={3} title="Şifrenizi Belirleyin" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Input
                      type="password"
                      placeholder="En az 8 karakter"
                      className={inputCls(!!errors.password)}
                      {...registerField("password")}
                    />
                    <FieldError message={errors.password?.message} />
                    {!errors.password && (
                      <p className="text-muted-foreground mt-1 text-xs">En az 8 karakter olmalıdır</p>
                    )}
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Şifrenizi tekrar yazın"
                      className={inputCls(!!errors.passwordRepeat)}
                      {...registerField("passwordRepeat")}
                    />
                    <FieldError message={errors.passwordRepeat?.message} />
                  </div>
                </div>

                {/* 4. Adres Bilgileri */}
                <SectionHeader number={4} title="Adres Bilgileriniz" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div>
                    <Select {...registerField("memberType")}>
                      <option value="Bireysel">Bireysel</option>
                      <option value="Kurumsal">Kurumsal</option>
                    </Select>
                  </div>
                  <div>
                    <Select {...registerField("country")}>
                      <option value="Türkiye">Türkiye</option>
                    </Select>
                  </div>
                  <div>
                    <Select className={inputCls(!!errors.city)} {...registerField("city")} defaultValue="">
                      <option value="">İl seçiniz</option>
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </Select>
                    <FieldError message={errors.city?.message} />
                  </div>
                  <div>
                    <Select
                      className={inputCls(!!errors.district)}
                      {...registerField("district")}
                      defaultValue=""
                      disabled={!selectedCity || !ILLER[selectedCity]?.length}
                    >
                      <option value="">
                        {ILLER[selectedCity]?.length ? "İlçe seçiniz" : "Önce il seçin"}
                      </option>
                      {(ILLER[selectedCity] ?? []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </Select>
                    <FieldError message={errors.district?.message} />
                  </div>
                  <div>
                    <Input placeholder="Önce ilçe seçin" {...registerField("neighborhood")} />
                  </div>
                  <div>
                    <Input {...registerField("taxOffice")} placeholder="Vergi Dairesi" />
                  </div>
                  <div>
                    <Input {...registerField("taxNo")} placeholder="Vergi Numarası" />
                  </div>
                  <div>
                    <Input {...registerField("postalCode")} placeholder="Posta Kodu" />
                  </div>
                  <div className="sm:col-span-3">
                    <Textarea placeholder="Açık adresinizi yazın" rows={2} {...registerField("address")} />
                  </div>
                </div>

                {/* 5. Sözleşmeler */}
                <SectionHeader number={5} title="Sözleşmeler" />
                <div className="flex flex-col gap-0.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-[#476F16]"
                      {...registerField("agreeContract")}
                    />
                    BestWork Bağımsız Girişimci Sözleşmesi&apos;ni Okudum Kabul Ediyorum
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-[#476F16]"
                      {...registerField("agreeKVKK")}
                    />
                    K.V.K.K. Sözleşmesini Okudum Kabul Ediyorum
                  </label>
                  {(errors.agreeContract || errors.agreeKVKK) && (
                    <p className="text-destructive mt-0.5 text-xs">
                      Devam etmek için sözleşmeleri onaylamalısınız.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="mt-1 self-stretch px-6 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.16),0_1px_2px_1px_rgba(0,0,0,0.06)] md:self-end"
                >
                  {isSubmitting ? <MaterialIcon name="Loader2" className="size-5 animate-spin" /> : "Hesabımı Oluştur"}
                </Button>
              </form>
            )}

            <p className="mt-2.5 text-center text-sm">
              Zaten hesabınız var mı?{" "}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-login"))}
                className="cursor-pointer border-none bg-transparent p-0 text-[#2E7D32] text-sm font-bold"
              >
                Giriş yapın
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
