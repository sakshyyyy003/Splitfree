import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app/providers";

export const metadata: Metadata = {
  title: "Splitfree",
  description: "Shared expense tracking for trips, homes, couples, and teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
