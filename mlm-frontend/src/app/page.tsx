import Hero from "@/components/landing2/Hero";
import TrustBar from "@/components/landing2/TrustBar";
import Benefits from "@/components/landing2/Benefits";
import Categories from "@/components/landing2/Categories";
import Products from "@/components/landing2/Products";
import HowItWorks from "@/components/landing2/HowItWorks";
import Earnings from "@/components/landing2/Earnings";
import CtaBanner from "@/components/landing2/CtaBanner";
import Corporate from "@/components/landing/Corporate";

// Landing sayfası — premium e-ticaret akışı (shadcn/ui + Tailwind).
// Menü (SiteNav) ve footer layout'ta globaldir. Auth durumu SiteNav (client) içinde çözülür.
export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustBar />
      <Benefits />
      <Categories />
      <Products />
      <HowItWorks />
      <Earnings />
      <CtaBanner />
      <Corporate />
    </main>
  );
}
