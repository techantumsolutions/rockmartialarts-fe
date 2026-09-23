"use client"

import { useCMS } from "@/contexts/CMSContext"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogIn } from "lucide-react"
import { BranchesNavDropdown } from "@/components/BranchesNavDropdown"
import { CoursesNavDropdown } from "@/components/CoursesNavDropdown"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

const navLinks = [
  { label: "Store", href: "/store" },
  { label: "Book a Demo", href: "/book-demo" },
  { label: "Request Callback", href: "/request-callback" },
  { label: "Online Learning", href: "/online-learning" },
  { label: "Events", href: "/events" },
  { label: "My Event Registrations", href: "/events/my-registrations" },
  { label: "Become a Coach", href: "/coach-register" },
  { label: "Home Training", href: "/home-training" },
  { label: "School Training", href: "/school-training" },
  { label: "College Training", href: "/college-training" },
  { label: "Corporate Training", href: "/corporate-training" },
  { label: "Residential Training", href: "/residential-training" },
  { label: "Residential Camp", href: "/residential-camp" },
]

export function FixedTopNav() {
  const { cms } = useCMS()
  const navbarLogo = resolvePublicAssetUrl(cms?.branding?.navbar_logo) || "/logo.png"

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <img
            src={navbarLogo}
            alt="Rock Martial Arts Academy"
            className="h-12 w-auto max-h-14 max-w-[140px] object-contain sm:h-14 sm:max-h-16 sm:max-w-[160px]"
          />
        </Link>

        <ul className="hidden items-center gap-6 lg:flex">
          <li>
            <CoursesNavDropdown />
          </li>
          {navLinks.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm font-medium uppercase tracking-wide text-white hover:text-[#FFB70F]"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <BranchesNavDropdown />
          </li>
          <li>
            <Link
              href="/contact"
              className="text-sm font-medium uppercase tracking-wide text-white hover:text-[#FFB70F]"
            >
              Contact
            </Link>
          </li>
          <li>
            <Link
              href="/register"
              className="inline-block rounded-[10px] bg-white px-5 py-3.5 text-base font-medium text-black transition-colors hover:bg-[#F73322] hover:text-white"
            >
              Register now
            </Link>
          </li>
          <li>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#FFB70F] px-5 py-3.5 text-base font-medium text-white transition-colors hover:bg-[#F73322] hover:text-black"
            >
              <LogIn className="h-5 w-5" />
              Login
            </Link>
          </li>
        </ul>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10 hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] border-[#766E6E] bg-[#171A26] px-6 py-6">
            <ul className="mt-4 flex flex-col gap-6">
              <li>
                <CoursesNavDropdown variant="mobile" onNavigate={() => setMobileOpen(false)} />
              </li>
              {navLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-lg font-medium uppercase tracking-wide text-white hover:text-[#FFB70F]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <BranchesNavDropdown variant="mobile" onNavigate={() => setMobileOpen(false)} />
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-lg font-medium uppercase tracking-wide text-white hover:text-[#FFB70F]"
                  onClick={() => setMobileOpen(false)}
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="block w-full rounded-[10px] bg-white px-5 py-3.5 text-base font-medium text-black text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Register now
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#FFB70F] px-5 py-3.5 text-base font-medium text-white mt-1"
                  onClick={() => setMobileOpen(false)}
                >
                  <LogIn className="h-5 w-5" />
                  Login
                </Link>
              </li>
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
