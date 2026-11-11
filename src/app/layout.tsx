import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./providers";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Gestao de Clinicas Medicas`,
  description: "Plataforma de gestao para clinicas medicas"
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" style={{ "--font-montserrat": "Arial" } as React.CSSProperties}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
