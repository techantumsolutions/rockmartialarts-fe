"use client"

/**
 * Previously intercepted every button click, showed a full-screen martial-arts
 * loader, and locked the UI — which froze live admin navigation.
 * Kept as a no-op passthrough so existing imports keep working.
 */
export function ActionOverlayProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
