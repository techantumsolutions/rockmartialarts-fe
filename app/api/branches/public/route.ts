import { NextRequest, NextResponse } from "next/server"
import { getWebsiteBackendBaseUrl } from "@/lib/serverBackendUrl"

/**
 * Public endpoint – returns all active branches (no auth required).
 * Tries backend /api/branches/public/all first, then /api/branches as fallback.
 */
export async function GET(_request: NextRequest) {
  const base = getWebsiteBackendBaseUrl()

  try {
    // Try public endpoint first
    let res = await fetch(`${base}/api/branches/public/all`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    // Fallback to regular branches endpoint
    if (!res.ok) {
      res = await fetch(`${base}/api/branches`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
    }

    if (!res.ok) {
      return NextResponse.json({ branches: [] }, { status: 200 })
    }

    const data = await res.json()
    const branches = data.branches ?? data ?? []

    return NextResponse.json({
      branches: Array.isArray(branches) ? branches : [],
    })
  } catch (err) {
    console.error("[academies/public] fetch failed:", err)
    return NextResponse.json({ branches: [] }, { status: 200 })
  }
}
