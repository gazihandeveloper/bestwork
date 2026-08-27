"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import { getTree, getErrorMessage } from "@/services/api";
import type { TreeNode } from "@/services/api";

// d3 tabanlı ağır ağaç bileşeni tembel yüklenir (sayfa anında açılır)
const BinaryTree = dynamic(() => import("@/components/binary-tree/BinaryTree"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-10">
      <Loader2 className="text-primary size-10 animate-spin" />
    </div>
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

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive my-4 rounded border px-3 py-2 text-sm font-medium">
        {error}
      </div>
    );
  }
  if (!root) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="text-primary size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-3">
      <h1 className="text-primary-dark mb-3 text-2xl font-extrabold">Binary Ağacım</h1>

      <BinaryTree data={root} depth={2} period={period} onPeriodChange={setPeriod} minMonth={minMonth} />
    </div>
  );
}

export default function TreePage() {
  return (
    <RequireAuth>
      <TreeContent />
    </RequireAuth>
  );
}
