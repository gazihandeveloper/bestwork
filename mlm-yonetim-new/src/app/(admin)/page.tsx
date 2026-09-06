import type { Metadata } from "next";
import GenelBakis from "@/components/ecommerce/GenelBakis";

export const metadata: Metadata = {
  title: "BestWork Yönetim Paneli",
  description: "BestWork MLM yönetim paneli — Genel Bakış",
};

export default function HomePage() {
  return <GenelBakis />;
}
