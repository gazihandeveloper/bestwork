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
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import RequireAuth from "@/components/RequireAuth";
import AppSnackbar from "@/components/AppSnackbar";
import EmptyState from "@/components/EmptyState";
import {
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  getErrorMessage,
} from "@/services/api";
import type { BankAccount } from "@/services/api";

const schema = yup.object({
  bank_name: yup.string().required("Banka adı zorunludur"),
  iban: yup.string().min(15, "IBAN en az 15 karakter olmalıdır").max(42, "IBAN en fazla 34 karakter olmalıdır").required("IBAN zorunludur"),
  account_name: yup.string().required("Hesap sahibi zorunludur"),
});

type BankForm = yup.InferType<typeof schema>;

function BankContent() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message: string, severity: "success" | "error" = "success") =>
    setSnackbar({ open: true, message, severity });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankForm>({ resolver: yupResolver(schema) });

  const load = () => {
    listBankAccounts()
      .then(setAccounts)
      .catch((err) => showSnackbar(getErrorMessage(err), "error"));
  };

  useEffect(load, []);

  const onCreate = async (values: BankForm) => {
    try {
      await createBankAccount(values);
      showSnackbar("Banka hesabı eklendi.");
      reset();
      load();
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  };

  const openEdit = (account: BankAccount) => {
    setEditing(account);
    reset({ bank_name: account.bank_name, iban: account.iban, account_name: account.account_name });
  };

  const onEdit = async (values: BankForm) => {
    if (!editing) return;
    try {
      await updateBankAccount(editing.id, values);
      showSnackbar("Banka hesabı güncellendi.");
      setEditing(null);
      load();
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  };

  const onDelete = async (id: number) => {
    try {
      await deleteBankAccount(id);
      showSnackbar("Hesap pasife alındı.");
      load();
    } catch (err) {
      showSnackbar(getErrorMessage(err), "error");
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Banka Bilgilerim
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Yeni Hesap Ekle
              </Typography>
              <Box component="form" onSubmit={handleSubmit(onCreate)}>
                <Stack spacing={2}>
                  <TextField label="Banka Adı" fullWidth {...register("bank_name")} error={!!errors.bank_name} helperText={errors.bank_name?.message} />
                  <TextField label="IBAN" fullWidth {...register("iban")} error={!!errors.iban} helperText={errors.iban?.message} />
                  <TextField label="Hesap Sahibi" fullWidth {...register("account_name")} error={!!errors.account_name} helperText={errors.account_name?.message} />
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? "Ekleniyor..." : "Ekle"}
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
                Hesaplarım ({accounts.length})
              </Typography>
              {accounts.length === 0 && (
                <EmptyState icon={<AccountBalanceRoundedIcon />} message="Henüz banka hesabı eklemediniz." />
              )}
              {accounts.map((a) => (
                <Box key={a.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {a.bank_name} <Chip size="small" label={a.is_active ? "Aktif" : "Pasif"} color={a.is_active ? "success" : "default"} />
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {a.account_name} · {a.iban}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton color="primary" onClick={() => openEdit(a)} aria-label="düzenle">
                      <EditRoundedIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => onDelete(a.id)} aria-label="sil">
                      <DeleteRoundedIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Düzenleme dialogu */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Banka Hesabını Düzenle</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onEdit)}>
          <DialogContent>
            <Stack spacing={2}>
              <TextField label="Banka Adı" fullWidth {...register("bank_name")} error={!!errors.bank_name} helperText={errors.bank_name?.message} />
              <TextField label="IBAN" fullWidth {...register("iban")} error={!!errors.iban} helperText={errors.iban?.message} />
              <TextField label="Hesap Sahibi" fullWidth {...register("account_name")} error={!!errors.account_name} helperText={errors.account_name?.message} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEditing(null)} color="inherit">
              Vazgeç
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      />
    </Container>
  );
}

export default function BankPage() {
  return (
    <RequireAuth>
      <BankContent />
    </RequireAuth>
  );
}
