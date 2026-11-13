"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  LogOut,
  PlusCircle,
  ClipboardList,
  User,
  ExternalLink,
  Shield,
  Loader2,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenManager, type UserData } from "@/lib/tokenManager"

export default function TrainingDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!TokenManager.isAuthenticated()) {
        router.replace("/training-login")
        return
      }
      const currentUser = TokenManager.getUser()
      setUser(currentUser)
      setLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.replace("/training-login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-[#FFB70F]" />
          <span className="text-sm font-medium">Loading Training Portal...</span>
        </div>
      </div>
    )
  }

  const navLinks = [
    {
      href: "/training-dashboard",
      label: "My Requests",
      icon: ClipboardList,
      active: pathname === "/training-dashboard",
    },
    {
      href: "/training-dashboard/new-request",
      label: "New Request",
      icon: PlusCircle,
      active: pathname === "/training-dashboard/new-request",
    },
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/training-dashboard" className="flex items-center gap-3">
              <Image
                src="/images/logo.png"
                alt="Rock Martial Arts"
                width={110}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
              <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FFB70F]/15 text-[#B87D00] border border-[#FFB70F]/30">
                Training Portal
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      item.active
                        ? "bg-[#FFB70F] text-black font-semibold shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-foreground">
                {user?.full_name || user?.email || "Student"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {user?.email || user?.phone || "Training Client"}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs h-8 px-2.5 border-border hover:bg-muted text-muted-foreground hover:text-red-600 gap-1.5"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${
                    item.active
                      ? "bg-[#FFB70F] text-black font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <div className="pt-2 border-t border-border mt-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Visit Rock Martial Arts Website</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Rock Martial Arts. All rights reserved.</span>
          <Link
            href="/"
            className="hover:text-foreground transition-colors inline-flex items-center gap-1 text-[11px]"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Rock Martial Arts Official Portal</span>
          </Link>
        </div>
      </footer>
    </div>
  )
}

