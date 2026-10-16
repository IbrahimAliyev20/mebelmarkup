import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // kadr paketləri və şəkillər dəyişəndə adları dəyişmir, amma nadir dəyişir:
  // brauzer bir gün yoxlamadan cache-dən götürür, sonra fonda yeniləyir
  async headers() {
    return [
      {
        source: "/forma/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
