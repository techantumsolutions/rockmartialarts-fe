import { NextResponse } from "next/server"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug
  if (!slug) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 })
  }

  try {
    const base = getBackendProxyBaseUrl().replace(/\/$/, "")
    const response = await fetch(
      `${base}/api/branches/public/by-slug/${encodeURIComponent(slug)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    )
    const text = await response.text()
    let body: unknown = {}
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      body = { error: text || "Failed to fetch branch" }
    }
    return NextResponse.json(body, { status: response.status })
  } catch (error) {
    console.error("[branch-by-slug] error:", error)
    return NextResponse.json({ error: "Failed to fetch branch" }, { status: 500 })
  }
}
