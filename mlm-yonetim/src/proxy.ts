import { NextResponse, type NextRequest } from "next/server";

// Kök adresi (basePath'siz) panelin girişine yönlendirir.
// Geliştirmede /uploads görsellerini canlıya proxy'ler (basePath rewrites'ta öneklenir).
export function proxy(request: NextRequest) {
  const url = new URL(request.url);

  if (url.pathname === "/") {
    return NextResponse.redirect(new URL("/bestmanager/", request.url));
  }

  if (process.env.NODE_ENV === "development" && url.pathname.startsWith("/uploads/")) {
    return NextResponse.rewrite(`https://mahmutgazihanarslan.com.tr${url.pathname}${url.search}`);
  }

  return NextResponse.next();
}
