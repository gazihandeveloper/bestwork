"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import RequireAuth from "@/components/RequireAuth";
import { listSponsored, getErrorMessage } from "@/services/api";
import type { User } from "@/services/api";

function SponsoredContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSponsored()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Sponsor Olduklarım
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Sponsorluğunuzu yaptığınız üyeler ({users.length} kişi).
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && users.length === 0 && (
        <Card>
          <CardContent>
            <Typography color="text.secondary">Henüz sponsor olduğunuz üye yok.</Typography>
          </CardContent>
        </Card>
      )}

      {users.map((u) => (
        <Card key={u.id} sx={{ mb: 1.5 }}>
          <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {u.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {u.email} · {u.member_code}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Chip
                size="small"
                label={u.is_in_pending_pool ? "Bekliyor" : "Ağaçta"}
                color={u.is_in_pending_pool ? "warning" : "success"}
              />
              <Chip size="small" label={`${u.total_pv_accumulated} PV`} variant="outlined" />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}

export default function SponsoredPage() {
  return (
    <RequireAuth>
      <SponsoredContent />
    </RequireAuth>
  );
}
