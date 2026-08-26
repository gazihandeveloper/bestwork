import Hero from "@/components/landing2/Hero";
import TrustBar from "@/components/landing2/TrustBar";
import Categories from "@/components/landing2/Categories";
import Products from "@/components/landing2/Products";
import Corporate from "@/components/landing/Corporate";

// Landing sayfası — premium e-ticaret akışı (shadcn/ui + Tailwind).
// Menü (SiteNav) ve footer layout'ta globaldir. Auth durumu SiteNav (client) içinde çözülür.
export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustBar />
      <Categories />
      <Products />
      <Corporate />
    </main>
  );
}
