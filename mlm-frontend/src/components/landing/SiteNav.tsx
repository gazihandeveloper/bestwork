"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Moon, Sun, ShoppingCart, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useThemeContext } from "@/contexts/ThemeContext";
import { cartCount } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet";
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
      className="inline-flex items-center leading-none no-underline text-inherit ml-2"
    >
      <span className="flex flex-col items-start leading-tight mt-0.5">
        <span className="inline-flex items-start font-black text-primary text-4xl">
          BestWork
          <span aria-label="Registered" className="text-[22px] leading-none mt-[0.3em] font-black text-primary">
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [count, setCount] = useState(0);

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

  const openLogin = () => window.dispatchEvent(new CustomEvent("open-login"));
  const openCart = () => window.dispatchEvent(new CustomEvent("open-cart"));

  const submitSearch = () => {
    const q = searchQ.trim();
    setSearchOpen(false);
    setSearchQ("");
    router.push(`/shop${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  };

  const iconBtn =
    "inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-primary transition-colors hover:bg-accent";

  return (
    <>
      <nav
        aria-label="Ana menü"
        className="bg-background fixed top-0 right-0 left-0 z-[1100] mx-auto flex h-[95px] w-[75%] items-center px-2.5"
      >
        <Logo />

        {/* Menü linkleri */}
        <div className="ml-8 hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = l.href === pathname;
            return (
              <Button
                key={l.href}
                asChild
                variant="ghost"
                className={cn(
                  "text-[17px] whitespace-nowrap",
                  active ? "bg-secondary/60 font-bold text-primary" : "font-medium"
                )}
              >
                <Link href={l.href}>{l.label}</Link>
              </Button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          {/* Arama ikonu → ortada blur popup */}
          <button aria-label="Ara" className={iconBtn} onClick={() => setSearchOpen(true)}>
            <Search className="size-5" />
          </button>

          {/* Gece/gündüz */}
          <button
            aria-label="Gece/gündüz modu"
            className={iconBtn}
            onClick={toggleMode}
            style={{ color: mode === "dark" ? "#FFB300" : undefined }}
          >
            {mode === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>

          {/* Sepet */}
          <button
            aria-label={`Sepet (${count} ürün)`}
            className={cn(iconBtn, "relative")}
            onClick={openCart}
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <Badge className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] justify-center rounded-full px-1 text-[11px] font-bold">
                {Math.min(count, 99)}
              </Badge>
            )}
          </button>

          {/* Oturum */}
          <div className="hidden items-center gap-1 md:flex">
            {loading ? (
              <div className="bg-secondary/60 h-9 w-[90px] rounded-full opacity-50" />
            ) : user ? (
              <>
                <Button asChild variant="ghost" className="text-primary text-[17px] font-extrabold whitespace-nowrap">
                  <Link href="/dashboard">{user.name.toLocaleUpperCase("tr-TR")}</Link>
                </Button>
                <button aria-label="Çıkış yap" className={iconBtn} onClick={logout}>
                  <LogOut className="size-[30px]" />
                </button>
              </>
            ) : (
              <Button onClick={openLogin} className="font-extrabold text-white">
                Oturum Aç
              </Button>
            )}
          </div>

          {/* Mobil menü */}
          <button
            aria-label="Menü"
            className={cn(iconBtn, "md:hidden")}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-6" />
          </button>
        </div>
      </nav>

      {/* Arama popup — ortada, blur arka plan */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md rounded-3xl p-3">
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

      {/* Mobil çekmece */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="rounded-l-[28px] p-5">
          <div className="flex items-center justify-between">
            <Logo />
            <SheetCloseButton />
          </div>

          <nav className="mt-1 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Button
                key={l.href}
                asChild
                variant="ghost"
                className="justify-start rounded-2xl px-4 py-3 text-base"
                onClick={() => setDrawerOpen(false)}
              >
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1 pb-2">
            {loading ? (
              <div className="bg-secondary/60 h-11 rounded-full opacity-50" />
            ) : user ? (
              <>
                <Button asChild className="w-full" onClick={() => setDrawerOpen(false)}>
                  <Link href="/dashboard">{user.name.toLocaleUpperCase("tr-TR")}</Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={logout}>
                  <LogOut className="size-4" />
                  Çıkış Yap
                </Button>
              </>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  setDrawerOpen(false);
                  openLogin();
                }}
              >
                Oturum Aç
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
