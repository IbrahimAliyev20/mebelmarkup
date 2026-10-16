import type { Metadata } from "next";
import { Josefin_Sans } from "next/font/google";
import "@/app/globals.css";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { routing } from "@/i18n/routing";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";

// saytın yeganə şrifti — variable (100–700) + italic; latin-ext Azərbaycan hərfləri (ə, ş, ğ, ı) üçündür
const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Forma — Mebel studiyası",
  description: "Əl işi, sakit xətlər və illərlə qalan material. Bakıda mebel studiyası — Forma.",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const {locale} = await params;
  const messages = (await getMessages()) as Record<string, string>;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return (
    <html lang={locale}>
      <body className={`${josefin.variable} antialiased`}>
        <QueryProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster position="top-center" richColors />
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
