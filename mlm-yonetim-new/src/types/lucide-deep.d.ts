// Lucide ikon-başına modüllerinin tip bildirimi.
// lucide-react kök paketi tipleri barrel üzerinden verir; derin
// import'larda tip kaybolduğu için burada tanımlıyoruz.
declare module "lucide-react/dist/esm/icons/*.mjs" {
  import type { LucideIcon } from "lucide-react";
  const Icon: LucideIcon;
  export default Icon;
}
