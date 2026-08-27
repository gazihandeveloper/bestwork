"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Moon, Sun, ShoppingCart, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/contexts/ThemeContext";
import { cartCount } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Anasayfa" },
  { href: "/shop", label: "Ürünler" },
  { href: "/#kurumsal", label: "Kurumsal" },
  { href: "/#iletisim", label: "İletişim" },
];

function Logo() {
  return (
    <Link
      href="/"
      aria-label="BestWork ana sayfa"
      className="inline-flex items-center leading-none no-underline text-inherit"
    >
      <span className="flex flex-col items-start leading-tight">
        <span className="text-primary inline-flex items-start text-[30px] font-black tracking-tight sm:text-[34px]">
          BestWork
          <span aria-label="Registered" className="mt-[0.3em] text-[18px] leading-none font-black sm:text-[20px]">
            <sup>®</sup>
          </span>
        </span>
      </span>
    </Link>
  );
}

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const { mode, toggleMode } = useThemeContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [count, setCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Sepet sayacı
  useEffect(() => {
    const refresh = () => setCount(cartCount());
    refresh();
    window.addEventListener("cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Scroll'da cam efektini koyulaştır
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openLogin = () => window.dispatchEvent(new CustomEvent("open-login"));
  const openCart = () => window.dispatchEvent(new CustomEvent("open-cart"));

  const submitSearch = () => {
    const q = searchQ.trim();
    setSearchOpen(false);
    setSearchQ("");
    router.push(`/shop${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const iconBtn =
    "relative inline-flex size-9 md:size-10 cursor-pointer items-center justify-center rounded-full text-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary";

  const linkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <header
        aria-label="Ana menü"
        className={cn(
          "bg-background/75 fixed inset-x-0 top-0 z-[1100] backdrop-blur-xl transition-all duration-300",
          scrolled
            ? "border-border/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]"
            : "border-transparent"
        )}
      >
        <nav className="mx-auto flex h-[95px] w-full items-center justify-between gap-2 px-4 md:gap-4 lg:w-[75%] lg:px-2.5">
          <Logo />

          {/* Masaüstü linkler */}
          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((l) => {
              const active = linkActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative px-3 py-2 text-[15px] font-semibold tracking-tight transition-colors duration-200",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {l.label}
                  <span
                    aria-hidden
                    className={cn(
                      "bg-primary absolute inset-x-3 -bottom-0.5 h-[2.5px] rounded-full transition-all duration-300",
                      active ? "opacity-100" : "opacity-0"
                    )}
                  />
                </Link>
              );
            })}
          </div>

          <div className="flex-1 lg:hidden" />

          {/* Aksiyonlar */}
          <div className="flex items-center gap-0.5 md:gap-1">
            <button aria-label="Ara" className={iconBtn} onClick={() => setSearchOpen(true)}>
              <Search className="size-5" />
            </button>

            <button
              aria-label="Gece/gündüz modu"
              className={cn(iconBtn, mode === "dark" && "text-[#FFB300] hover:text-[#FFB300]")}
              onClick={toggleMode}
            >
              {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>

            <button aria-label={`Sepet (${count} ürün)`} className={iconBtn} onClick={openCart}>
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <Badge className="bg-primary absolute -top-0.5 -right-0.5 h-[17px] min-w-[17px] justify-center rounded-full px-1 text-[10px] font-bold text-white">
                  {Math.min(count, 99)}
                </Badge>
              )}
            </button>

            {/* Oturum — masaüstü */}
            <div className="ml-1 hidden items-center gap-1 lg:flex">
              {loading ? (
                <div className="bg-secondary/70 h-9 w-[88px] animate-pulse rounded-full" />
              ) : user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-foreground hover:bg-accent rounded-full px-3.5 py-2 text-[15px] font-medium tracking-tight transition-colors whitespace-nowrap"
                  >
                    {user.name.toLocaleUpperCase("tr-TR")}
                  </Link>
                  <button aria-label="Çıkış yap" className={iconBtn} onClick={logout}>
                    <LogOut className="size-5" />
                  </button>
                </>
              ) : (
                <Button onClick={openLogin} className="ml-1 px-6 font-extrabold text-white">                  Oturum Aç
                </Button>
              )}
            </div>

            {/* Mobil hamburger */}
            <button
              aria-label="Menüyü aç"
              className={cn(iconBtn, "lg:hidden")}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-6" />
            </button>
          </div>
        </nav>
      </header>

      {/* Arama popup — ortada, blur arka plan */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md rounded-sm p-3">
          <div className="relative">
            <Search className="text-primary absolute top-1/2 left-4 size-5 -translate-y-1/2" />
            <Input
              autoFocus
              placeholder="Ürün ara..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
              className="border-primary/60 pl-11 pr-4 text-base"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobil çekmece — sağdan, tam cam efektli */}
      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 z-[1200] transition-opacity duration-300",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div
          className="bg-black/55 absolute inset-0 backdrop-blur-[4px]"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
          className={cn(
            "bg-background absolute inset-y-0 right-0 flex w-[min(84%,320px)] flex-col rounded-l-sm border-l p-5 shadow-2xl transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between">
            <Logo />
            <button
              aria-label="Menüyü kapat"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-10 cursor-pointer items-center justify-center rounded-full transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-3 flex flex-col gap-0.5">
            {navLinks.map((l) => {
              const active = linkActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between rounded-sm px-4 py-3 text-[15px] font-semibold transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {l.label}
                  {active && <span className="bg-white size-1.5 rounded-full" />}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-1 pb-2">
            {loading ? (
              <div className="bg-secondary/70 h-11 animate-pulse rounded-full" />
            ) : user ? (
              <>
                <Button asChild className="w-full font-medium" onClick={() => setMobileOpen(false)}>
                  <Link href="/dashboard">{user.name.toLocaleUpperCase("tr-TR")}</Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="size-5" />
                  Çıkış Yap
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  setMobileOpen(false);
                  openLogin();
                }}
              >
                Oturum Aç
              </Button>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
