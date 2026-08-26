/**
 * İsim formatı: ilk adın baş harfi büyük, kalanı küçük; soyad tamamen BÜYÜK.
 * Örn: "Mahmut Gazihan Arslan" → "Mahmut gazihan ARSLAN"
 */
export function formatMemberName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name;
  const first = parts[0];
  const firstPart = first.charAt(0).toLocaleUpperCase("tr-TR") + first.slice(1).toLocaleLowerCase("tr-TR");
  if (parts.length === 1) return firstPart;
  const last = parts[parts.length - 1].toLocaleUpperCase("tr-TR");
  const middles = parts.slice(1, -1).map((p) => p.toLocaleLowerCase("tr-TR"));
  return [firstPart, ...middles, last].join(" ");
}
