import type { Metadata } from "next";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Impact Analyzer",
  description: "PR degisikliklerini analiz et, AI ile test senaryolari olustur",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text-primary)",
        }}
      >
        <SessionProvider>{children}</SessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
