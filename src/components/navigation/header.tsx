"use client";

import { User } from "lucide-react";
import Link from "next/link";
import LanguageSelector from "../shared/language-selector";
import { navigationItems } from "@/utils/static";
import Container from "../shared/container";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function Header() {
  const t = useTranslations("navigation");
  const pathname = usePathname();

  return (
    <header className="border-b border-[#F1F2F6] bg-white">
      <Container>
        <div className="flex py-[26px] items-center justify-between">
          <div className="flex items-center gap-[90px]">
            <Link href="/" className="text-[28px] font-semibold text-[#14171A]">
              Layihə
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-medium text-text-primary hover:text-[#14171A] transition-colors ${
                    pathname === item.href ? "text-[#14171A]" : ""
                  }`}
                >
                  {t(item.label)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <LanguageSelector />
            <Link href="/login">
              <User className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
