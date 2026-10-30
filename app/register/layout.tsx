import type { ReactNode } from "react"

/**
 * Offset content below FixedTopNav (fixed header ~72–88px + safe area).
 * Prevents titles and forms from overlapping "Register now" / nav actions.
 */
export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <div className="pt-[4.75rem] sm:pt-20 lg:pt-[4.5rem]">{children}</div>
}
