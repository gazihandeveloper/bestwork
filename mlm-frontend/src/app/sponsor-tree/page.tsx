"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import RequireAuth from "@/components/RequireAuth";
import SponsorTreeD3 from "@/components/SponsorTreeD3";
import { getSponsorTree, getErrorMessage } from "@/services/api";
import type { SponsorTreeNode } from "@/services/api";

function SponsorTreeContent() {
  const [root, setRoot] = useState<SponsorTreeNode | null>(null);
  const [depth, setDepth] = useState(3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSponsorTree(undefined, depth)
      .then(setRoot)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [depth]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom>
        Referans ve Ekip Ağacı
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Sponsorluğunuzla gelen üyeler ve onların referansları. Müşteriler de zincirde görünür.
      </Typography>

      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Derinlik:
        </Typography>
        <ToggleButtonGroup
      value={String(depth)}
      exclusive
      size="small"
      onChange={(_, v) => {
      if (v) {
        setLoading(true);
        setDepth(Number(v));
      }
      }}
    >
          {[1, 2, 3, 4, 5].map((d) => (
            <ToggleButton key={d} value={String(d)}>
              {d}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        root && <SponsorTreeD3 data={root} depth={depth} />
      )}
    </Container>
  );
}

export default function SponsorTreePage() {
  return (
    <RequireAuth>
      <SponsorTreeContent />
    </RequireAuth>
  );
}
