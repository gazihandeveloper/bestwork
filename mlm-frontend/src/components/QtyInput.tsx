"use client";

import { useEffect, useState } from "react";

// Adet giriş kutusu — el ile sayı yazmaya izin verir, "015" gibi önde sıfırları temizler.
// Değer yalnızca alan terk edilince (blur) uygulanır; yazarken sepet bozulmaz.
export default function QtyInput({
  qty,
  onChange,
  max = 99,
}: {
  qty: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  const [text, setText] = useState(String(qty));
  useEffect(() => {
    setText(String(qty));
  }, [qty]);

  const apply = () => {
    const cleaned = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    onChange(cleaned === "" ? 0 : Math.min(parseInt(cleaned, 10), Math.max(max, 1)));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="border-border bg-card text-primary-dark h-7 w-11 rounded border px-1 text-center text-sm font-bold"
      aria-label="Adedi elle gir"
    />
  );
}
