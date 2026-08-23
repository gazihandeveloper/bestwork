"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import CircularProgress from "@mui/material/CircularProgress";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import HandshakeRoundedIcon from "@mui/icons-material/HandshakeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { alpha } from "@mui/material/styles";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/api";
import { checkReferral } from "@/services/api";
import { PASTELS, ELEVATION } from "@/components/landing/tokens";

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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 1 }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          bgcolor: "primary.main",
          color: "common.white",
          fontSize: 14,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {number}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.dark", fontSize: "1.05rem" }}>
        {title}
      </Typography>
    </Box>
  );
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        pt: { xs: 13, md: 11 },
        pb: 6,
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.background.default} 0%, ${theme.palette.secondary.light} 100%)`,
      }}
    >
      <Container maxWidth={stage === "sponsor" ? "sm" : "lg"}>
        <Card
          sx={{
            borderRadius: "28px",
            overflow: "hidden",
            boxShadow: ELEVATION.l3,
          }}
        >
          <Box
            sx={{
              position: "relative",
              px: 3,
              py: 3.5,
              textAlign: "center",
              background: (theme) =>
                `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              color: "common.white",
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                top: -50,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: "50%",
                bgcolor: PASTELS.mint,
                opacity: 0.25,
              }}
            />
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                bgcolor: PASTELS.mint,
                color: "primary.dark",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1,
              }}
            >
              <PersonAddAltRoundedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Kayıt Ol
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}>
              Üye ol, ağını kur, kazanmaya başla. Üye ID&apos;niz otomatik oluşturulur.
            </Typography>
          </Box>

          <CardContent sx={{ px: { xs: 3, md: 6 }, pt: 3, pb: 4 }}>
            {stage === "sponsor" ? (
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 3,
                  p: 3,
                  bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.12),
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <HandshakeRoundedIcon sx={{ color: "primary.main" }} />
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    Sponsor Üye Numarası
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Sizi BestWork&apos;e davet eden üyenin numarasını girin
                </Typography>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <TextField
                    placeholder="Referans Numaranızı Girin"
                    fullWidth
                    value={refCode}
                    onChange={(e) => setRefCode(e.target.value)}
                    error={refStatus === "notfound"}
                    helperText={refStatus === "notfound" ? "Bu referans kodu bulunamadı." : undefined}
                    slotProps={{
                      input: {
                        endAdornment:
                          refStatus === "checking" ? <CircularProgress size={16} /> : undefined,
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    onClick={searchRef}
                    disabled={refStatus === "checking"}
                    sx={{ flexShrink: 0, px: 3, height: 40 }}
                  >
                    Ara
                  </Button>
                </Box>

                {refStatus === "found" && (
                  <Alert
                    icon={<CheckCircleRoundedIcon />}
                    severity="success"
                    sx={{ "& .MuiAlert-icon": { color: "success.main" } }}
                  >
                    Sponsor Üyeniz: <strong>{refOwner}</strong>
                  </Alert>
                )}
                {refStatus === "notfound" && (
                  <Alert
                    icon={<ErrorRoundedIcon />}
                    severity="error"
                    sx={{ "& .MuiAlert-icon": { color: "error.main" } }}
                  >
                    Bu referans kodu sistemde bulunamadı. Lütfen kontrol edin.
                  </Alert>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  disabled={refStatus !== "found"}
                  onClick={continueWithRef}
                  sx={{ mt: 0.5 }}
                >
                  Devam Et
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  color="success"
                  onClick={continueWithout}
                  sx={{ borderColor: "success.main", color: "success.main" }}
                >
                  SPONSORUM YOK
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2.5}>
                  <Button
                    variant="text"
                    startIcon={<ArrowForwardRoundedIcon sx={{ transform: "rotate(180deg)" }} />}
                    onClick={() => setStage("sponsor")}
                    sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600, ml: -1 }}
                  >
                    Sponsoru değiştir
                  </Button>

                  {noSponsor ? (
                    <Alert
                      severity="info"
                      action={
                        <Button color="inherit" size="small" onClick={() => setStage("sponsor")}>
                          Referans Belirt
                        </Button>
                      }
                    >
                      Sponsorsuz kayıt oluyorsunuz. Üye ID&apos;niz otomatik oluşturulacak.
                    </Alert>
                  ) : (
                    <Alert
                      icon={<CheckCircleRoundedIcon />}
                      severity="success"
                      sx={{ "& .MuiAlert-icon": { color: "success.main" } }}
                    >
                      Sponsor Üyeniz: <strong>{refOwner}</strong>
                    </Alert>
                  )}

                  {error && <Alert severity="error">{error}</Alert>}

                  {/* 1. Kişisel Bilgiler */}
                  <SectionHeader number={1} title="Kişisel Bilgileriniz" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Adınız *"
                        placeholder="Adınızı yazın"
                        fullWidth
                        {...registerField("ad")}
                        error={!!errors.ad}
                        helperText={errors.ad?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Soyadınız *"
                        placeholder="Soyadınızı yazın"
                        fullWidth
                        {...registerField("soyad")}
                        error={!!errors.soyad}
                        helperText={errors.soyad?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField select label="Doğum Günü" fullWidth {...registerField("birthDay")}>
                        <MenuItem value="">Gün</MenuItem>
                        {days.map((d) => (
                          <MenuItem key={d} value={d}>{d}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField select label="Doğum Ayı" fullWidth {...registerField("birthMonth")}>
                        <MenuItem value="">Ay</MenuItem>
                        {months.map((m, i) => (
                          <MenuItem key={m} value={String(i + 1)}>{m}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField select label="Doğum Yılı" fullWidth {...registerField("birthYear")}>
                        <MenuItem value="">Yıl</MenuItem>
                        {years.map((y) => (
                          <MenuItem key={y} value={y}>{y}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField select label="Cinsiyetiniz" fullWidth {...registerField("gender")}>
                        <MenuItem value="">Seçiniz</MenuItem>
                        <MenuItem value="Kadın">Kadın</MenuItem>
                        <MenuItem value="Erkek">Erkek</MenuItem>
                        <MenuItem value="Belirtmek istemiyorum">Belirtmek istemiyorum</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="TC Kimlik No"
                        placeholder="11 haneli T.C. kimlik numaranız"
                        fullWidth
                        {...registerField("tcNo")}
                        error={!!errors.tcNo}
                        helperText={errors.tcNo?.message}
                      />
                      <FormControlLabel
                        control={<Checkbox {...registerField("notTurkish")} />}
                        label="T.C. uyruklu değilim."
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>
                  </Grid>

                  {/* 2. İletişim Bilgileri */}
                  <SectionHeader number={2} title="İletişim Bilgileriniz" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Cep Telefonunuz *"
                        placeholder="05XX XXX XX XX"
                        fullWidth
                        {...registerField("phone")}
                        error={!!errors.phone}
                        helperText={errors.phone?.message ?? "Şifre sıfırlama ve bildirimler bu numaraya gönderilir"}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="E-posta Adresiniz *"
                        placeholder="ornek@eposta.com"
                        fullWidth
                        {...registerField("email")}
                        error={!!errors.email}
                        helperText={errors.email?.message}
                      />
                    </Grid>
                  </Grid>

                  {/* 3. Şifre */}
                  <SectionHeader number={3} title="Şifrenizi Belirleyin" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Şifreniz *"
                        type="password"
                        placeholder="En az 8 karakter"
                        fullWidth
                        {...registerField("password")}
                        error={!!errors.password}
                        helperText={errors.password?.message ?? "En az 8 karakter olmalıdır"}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Şifreniz (Tekrar) *"
                        type="password"
                        placeholder="Şifrenizi tekrar yazın"
                        fullWidth
                        {...registerField("passwordRepeat")}
                        error={!!errors.passwordRepeat}
                        helperText={errors.passwordRepeat?.message}
                      />
                    </Grid>
                  </Grid>

                  {/* 4. Adres Bilgileri */}
                  <SectionHeader number={4} title="Adres Bilgileriniz" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField select label="Üyelik Türü" fullWidth {...registerField("memberType")}>
                        <MenuItem value="Bireysel">Bireysel</MenuItem>
                        <MenuItem value="Kurumsal">Kurumsal</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField select label="Ülke *" fullWidth {...registerField("country")}>
                        <MenuItem value="Türkiye">Türkiye</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        select
                        label="Şehir *"
                        fullWidth
                        {...registerField("city")}
                        error={!!errors.city}
                        helperText={errors.city?.message}
                      >
                        <MenuItem value="">İl seçiniz</MenuItem>
                        {PROVINCES.map((p) => (
                          <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="İlçe *"
                        placeholder="Önce il seçin"
                        fullWidth
                        {...registerField("district")}
                        error={!!errors.district}
                        helperText={errors.district?.message}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="Mahalle/Köy"
                        placeholder="Önce ilçe seçin"
                        fullWidth
                        {...registerField("neighborhood")}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Vergi Dairesi" fullWidth {...registerField("taxOffice")} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Vergi Numarası" fullWidth {...registerField("taxNo")} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField label="Posta Kodu" fullWidth {...registerField("postalCode")} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Adres"
                        placeholder="Açık adresinizi yazın"
                        fullWidth
                        multiline
                        minRows={2}
                        {...registerField("address")}
                      />
                    </Grid>
                  </Grid>

                  {/* 5. Sözleşmeler */}
                  <SectionHeader number={5} title="Sözleşmeler" />
                  <Stack spacing={0.5}>
                    <FormControlLabel
                      control={<Checkbox {...registerField("agreeContract")} />}
                      label="BestWork Bağımsız Girişimci Sözleşmesi'ni Okudum Kabul Ediyorum"
                    />
                    <FormControlLabel
                      control={<Checkbox {...registerField("agreeKVKK")} />}
                      label="K.V.K.K. Sözleşmesini Okudum Kabul Ediyorum"
                    />
                    {(errors.agreeContract || errors.agreeKVKK) && (
                      <Typography variant="caption" color="error">
                        Devam etmek için sözleşmeleri onaylamalısınız.
                      </Typography>
                    )}
                  </Stack>

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={isSubmitting}
                    sx={{ boxShadow: ELEVATION.l1, py: 1.25, alignSelf: { xs: "stretch", md: "flex-end" }, px: 6 }}
                  >
                    {isSubmitting ? <CircularProgress size={22} color="inherit" /> : "Hesabımı Oluştur"}
                  </Button>
                </Stack>
              </Box>
            )}

            <Typography variant="body2" sx={{ mt: 2.5, textAlign: "center" }}>
              Zaten hesabınız var mı?{" "}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-login"))}
                style={{ background: "none", border: "none", padding: 0, color: "#2E7D32", fontWeight: 700, cursor: "pointer", fontSize: "inherit" }}
              >
                Giriş yapın
              </button>
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
