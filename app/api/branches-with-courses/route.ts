import { NextRequest, NextResponse } from "next/server"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"

export const dynamic = "force-dynamic"

/**
 * Proxies GET /api/branches-with-courses to the backend (authenticated).
 * Replaces the previous mock implementation so data matches the database.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authorization header missing or invalid" }, { status: 401 })
  }

  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  const search = request.nextUrl.search
  const url = `${base}/api/branches-with-courses${search}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    const text = await res.text()
    const contentType = res.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      let data: unknown = text
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          console.error("[academies-with-courses] Invalid JSON from", url)
          return NextResponse.json({ error: "Invalid response from server" }, { status: 502 })
        }
      }
      return NextResponse.json(data, { status: res.status })
    }

    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": contentType || "text/plain" },
    })
  } catch (e) {
    console.error("[academies-with-courses] Proxy error:", url, e)
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to reach academies service" },
      { status: 502 }
    )
  }
}
