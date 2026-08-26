"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { getTree, getErrorMessage } from "@/services/api";
import type { TreeNode } from "@/services/api";

// d3 tabanlı ağır ağaç bileşeni tembel yüklenir (sayfa anında açılır)
const BinaryTree = dynamic(() => import("@/components/binary-tree/BinaryTree"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress />
    </Box>
  ),
});

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TreeContent() {
  const { user } = useAuth();
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<string>(currentMonth);
  const [minMonth, setMinMonth] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    setRoot(null);
    getTree(user.id, 2, period)
      .then((res) => {
        setRoot(res.tree);
        setMinMonth(res.min_month ?? "");
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [user, period]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!root) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h5" color="primary.dark" gutterBottom sx={{ fontWeight: 800 }}>
        Binary Ağacım
      </Typography>

      <BinaryTree data={root} depth={2} period={period} onPeriodChange={setPeriod} minMonth={minMonth} />
    </Container>
  );
}

export default function TreePage() {
  return (
    <RequireAuth>
      <TreeContent />
    </RequireAuth>
  );
}
