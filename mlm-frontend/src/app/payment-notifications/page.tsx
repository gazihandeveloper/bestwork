"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import RequireAuth from "@/components/RequireAuth";
import EmptyState from "@/components/EmptyState";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  getOrders,
  createPaymentNotification,
  listPaymentNotifications,
  uploadFile,
  getErrorMessage,
} from "@/services/api";
import type { Order, PaymentNotification } from "@/services/api";

const tl = (v: number) =>
  v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";

const schema = yup.object({
  order_id: yup.string().required("Sipariş seçin"),
  amount: yup.number().typeError("Tutar sayı olmalıdır").positive("Tutar > 0").required("Tutar zorunludur"),
  bank_name: yup.string().optional(),
  reference_no: yup.string().optional(),
  note: yup.string().optional(),
});

type NotificationForm = yup.InferType<typeof schema>;

const statusColors: Record<string, "success" | "error" | "warning"> = {
  approved: "success",
  rejected: "error",
  pending: "warning",
};

function PaymentNotificationsContent() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("");
  const [filePath, setFilePath] = useState("");
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
  	setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NotificationForm>({ resolver: yupResolver(schema) });
	const orderField = register("order_id");

  const load = () => {
    getOrders()
      .then((orders) => setPendingOrders(orders.filter((o) => o.status === "pending")))
      .catch((err) => setError(getErrorMessage(err)));
    listPaymentNotifications()
      .then((d) => setNotifications(d.payment_notifications))
      .catch((err) => setError(getErrorMessage(err)));
  };

  useEffect(load, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const path = await uploadFile(file);
      setFilePath(path);
      setFileName(file.name);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: NotificationForm) => {
    setError("");
    setSuccess("");
    try {
      await createPaymentNotification({
        order_id: Number(values.order_id),
        amount: values.amount,
        bank_name: values.bank_name,
        reference_no: values.reference_no,
        note: values.note,
        file_path: filePath || undefined,
      });
      setSuccess("Ödeme bildiriminiz oluşturuldu, admin onayı bekliyor.");
      reset();
      setFilePath("");
      setFileName("");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        EFT/HAVALE Bildirimleri
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        EFT/HAVALE ile ödediğiniz siparişlerin dekontunu bildirin; admin onayından sonra puan ve
        komisyonlarınız işlenir.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Yeni Bildirim
              </Typography>
              {pendingOrders.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Bekleyen siparişiniz yok. Alışveriş sayfasından EFT/HAVALE ile sipariş oluşturun.
                </Alert>
              )}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  {success && <Alert severity="success">{success}</Alert>}
          <TextField
          select
          label="Sipariş"
          fullWidth
          {...orderField}
          onChange={(event) => {
            void orderField.onChange(event);
            const order = pendingOrders.find((item) => item.id === Number(event.target.value));
            setValue("amount", order?.total_amount ?? 0, { shouldValidate: true });
          }}
          error={!!errors.order_id}
          helperText={errors.order_id?.message}
          >
                    {pendingOrders.map((o) => (
                      <MenuItem key={o.id} value={String(o.id)}>
                        #{o.id} · {tl(o.total_amount)}
                      </MenuItem>
                    ))}
                  </TextField>
				  <TextField label="Tutar (TL)" type="number" fullWidth {...register("amount")} slotProps={{ input: { readOnly: true } }} error={!!errors.amount} helperText={errors.amount?.message} />
                  <TextField label="Banka Adı" fullWidth {...register("bank_name")} error={!!errors.bank_name} helperText={errors.bank_name?.message} />
                  <TextField label="Referans No" fullWidth {...register("reference_no")} error={!!errors.reference_no} helperText={errors.reference_no?.message} />
                  <TextField label="Not" multiline rows={2} fullWidth {...register("note")} error={!!errors.note} helperText={errors.note?.message} />
                  <Box>
                    <Button variant="outlined" component="label" disabled={uploading}>
                      {uploading ? "Yükleniyor..." : "Dekont Yükle (jpg/png/pdf, max 5MB)"}
                      <input type="file" hidden accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} />
                    </Button>
                    {fileName && (
                      <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.5 }}>
                        Yüklendi: {fileName}
                      </Typography>
                    )}
                  </Box>
                  <Button type="submit" variant="contained" disabled={isSubmitting || pendingOrders.length === 0}>
                    {isSubmitting ? "Gönderiliyor..." : "Bildirim Gönder"}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bildirimlerim ({notifications.length})
              </Typography>
              {notifications.length === 0 && (
                <EmptyState icon={<ReceiptLongRoundedIcon />} message="Henüz ödeme bildiriminiz yok." />
              )}
              {notifications.map((pn) => (
                <Box key={pn.id} sx={{ py: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      #{pn.id} · {tl(pn.amount)}
                      {pn.order_id != null && ` · Sipariş #${pn.order_id}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pn.bank_name || "-"} · {pn.reference_no || "-"} · {new Date(pn.created_at).toLocaleString("tr-TR")}
                    </Typography>
                  </Box>
                  <Chip size="small" label={pn.status} color={statusColors[pn.status] || "default"} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function PaymentNotificationsPage() {
  return (
    <RequireAuth>
      <PaymentNotificationsContent />
    </RequireAuth>
  );
}
