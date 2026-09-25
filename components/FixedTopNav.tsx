"use client"

import { useCMS } from "@/contexts/CMSContext"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogIn } from "lucide-react"
import { BranchesNavDropdown } from "@/components/BranchesNavDropdown"
import { CoursesNavDropdown } from "@/components/CoursesNavDropdown"
import { TrainingNavDropdown } from "@/components/TrainingNavDropdown"
import { EventsNavDropdown } from "@/components/EventsNavDropdown"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

const linkClass =
  "text-sm font-medium uppercase tracking-wide text-white hover:text-[#FFB70F] transition-colors"
const mobileLinkClass =
  "block text-lg font-medium uppercase tracking-wide text-white hover:text-[#FFB70F]"

const ctaOutlineClass =
  "inline-flex items-center justify-center rounded-[10px] border border-white bg-transparent px-5 py-3.5 text-base font-medium text-white transition-colors hover:bg-white hover:text-black"
const ctaSecondaryClass =
  "inline-flex items-center justify-center rounded-[10px] border border-white/40 bg-white/10 px-5 py-3.5 text-base font-medium text-white transition-colors hover:bg-white/20"
const ctaLoginClass =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#FFB70F] px-5 py-3.5 text-base font-medium text-white transition-colors hover:bg-[#F73322] hover:text-black"

export function FixedTopNav() {
  const { cms } = useCMS()
  const navbarLogo = resolvePublicAssetUrl(cms?.branding?.navbar_logo) || "/logo.png"
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="flex-shrink-0">
          <img
            src={navbarLogo}
            alt="Rock Martial Arts Academy"
            className="h-12 w-auto max-h-14 max-w-[140px] object-contain sm:h-14 sm:max-h-16 sm:max-w-[160px]"
          />
        </Link>

        <ul className="hidden items-center gap-4 xl:gap-5 lg:flex flex-wrap justify-end">
          <li>
            <CoursesNavDropdown />
          </li>
          <li>
            <TrainingNavDropdown />
          </li>
          <li>
            <Link href="/store" className={linkClass}>
              Store
            </Link>
          </li>
          <li>
            <EventsNavDropdown />
          </li>
          <li>
            <BranchesNavDropdown />
          </li>
          <li>
            <Link href="/contact" className={linkClass}>
              Contact
            </Link>
          </li>
          <li>
            <Link href="/book-demo" className={ctaOutlineClass}>
              Book a Demo
            </Link>
          </li>
          <li>
            <Link href="/request-callback" className={ctaSecondaryClass}>
              Request Callback
            </Link>
          </li>
          <li>
            <Link href="/login" className={ctaLoginClass}>
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
          <SheetContent
            side="right"
            className="w-[300px] sm:w-[340px] border-[#766E6E] bg-[#171A26] px-6 py-6 overflow-y-auto"
          >
            <ul className="mt-4 flex flex-col gap-5">
              <li>
                <CoursesNavDropdown variant="mobile" onNavigate={closeMobile} />
              </li>
              <li>
                <TrainingNavDropdown variant="mobile" onNavigate={closeMobile} />
              </li>
              <li>
                <Link href="/store" onClick={closeMobile} className={mobileLinkClass}>
                  Store
                </Link>
              </li>
              <li>
                <EventsNavDropdown variant="mobile" onNavigate={closeMobile} />
              </li>
              <li>
                <BranchesNavDropdown variant="mobile" onNavigate={closeMobile} />
              </li>
              <li>
                <Link href="/contact" onClick={closeMobile} className={mobileLinkClass}>
                  Contact
                </Link>
              </li>
              <li className="pt-2 border-t border-white/10 space-y-3">
                <Link
                  href="/book-demo"
                  onClick={closeMobile}
                  className={`${ctaOutlineClass} w-full`}
                >
                  Book a Demo
                </Link>
                <Link
                  href="/request-callback"
                  onClick={closeMobile}
                  className={`${ctaSecondaryClass} w-full`}
                >
                  Request Callback
                </Link>
                <Link href="/login" onClick={closeMobile} className={`${ctaLoginClass} w-full`}>
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
