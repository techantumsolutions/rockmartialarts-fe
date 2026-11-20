import { NextRequest, NextResponse } from "next/server"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"

export async function GET(
  request: NextRequest,
  { params }: { params: { branchId: string } }
) {
  const BACKEND_URL = getBackendProxyBaseUrl().replace(/\/$/, "")
  const { branchId } = params
  if (!branchId) {
    return NextResponse.json({ error: "branchId required" }, { status: 400 })
  }
  try {
    const limit = request.nextUrl.searchParams.get("limit") || "4"
    const response = await fetch(
      `${BACKEND_URL}/api/cms/public/branch-testimonials/${encodeURIComponent(branchId)}?limit=${encodeURIComponent(limit)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in academy testimonials API:", error)
    return NextResponse.json(
      { error: "Internal server error", message: "Failed to retrieve testimonials" },
      { status: 500 }
    )
  }
}
