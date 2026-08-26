import Hero from "@/components/landing/Hero";
import Benefits from "@/components/landing/Benefits";
import FeaturedProducts from "@/components/landing/FeaturedProducts";
import Corporate from "@/components/landing/Corporate";

// Landing sayfası — yeşil M3 e-ticaret odaklı; hero + avantajlar + ürünlerimiz + kurumsal.
// Menü (SiteNav) ve footer layout'ta globaldir. Auth durumu SiteNav (client) içinde çözülür.
export default function HomePage() {
  return (
    <main>
      <Hero />
      <Benefits />
      <FeaturedProducts />
      <Corporate />
    </main>
  );
}
