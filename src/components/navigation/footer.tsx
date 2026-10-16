import Link from "next/link"
import { Instagram, Linkedin, Twitter } from "lucide-react"
import Container from "../shared/container"

export function Footer() {
  return (
    <footer className="bg-[#FAFDFF] border-t border-[#ECEEF6]">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-14 pb-10">
          <div className="md:col-span-1">
            <Link href="/" className="text-2xl font-bold text-blue-600 mb-4 block">
              Karyera.az
            </Link>
            <p className="text-muted-foreground mb-4">Bizi izləyin</p>
            <div className="flex space-x-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="hidden md:block"></div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Keçidlər</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Vakansiyalar
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Şirkətlər
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Kateqoriyalar
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Cv-lar
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Haqqımızda
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <div className="space-y-3 text-muted-foreground">
              <p>Broadway Ave 79, New York, USA</p>
              <p>
                <Link href="mailto:info@designsystem.com" className="hover:text-foreground transition-colors">
                  info@designsystem.com
                </Link>
              </p>
              <p>
                <Link href="tel:+12345678" className="hover:text-foreground transition-colors">
                  +1 234 56 789
                </Link>
              </p>
              <p>
                <Link href="tel:+19876543" className="hover:text-foreground transition-colors">
                  +1 987 65 432
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 py-4 text-center">
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border border-muted-foreground text-xs flex items-center justify-center">
              ©
            </span>
            Copyright | All Rights Reserved
          </p>
        </div>
      </Container>
    </footer>
  )
}
