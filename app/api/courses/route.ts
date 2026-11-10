import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import { proxyJsonToBackend } from "@/lib/proxyToBackend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return proxyJsonToBackend(request, "courses")
}

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    const base = getBackendProxyBaseUrl().replace(/\/$/, "")
    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const url = `${base}/api/courses${qs ? `?${qs}` : ""}`

    const proxyHeaders: Record<string, string> = { "Content-Type": "application/json" }
    if (authorization) {
      proxyHeaders["Authorization"] = authorization
    }

    const res = await fetch(url, {
      method: "GET",
      headers: proxyHeaders,
      cache: "no-store",
    })

    const text = await res.text()
    let data: unknown = text
    if (res.headers.get("content-type")?.includes("application/json") && text) {
      try {
        data = JSON.parse(text)
      } catch {
        console.error("[api/courses GET] Backend returned invalid JSON from", url)
        return NextResponse.json(
          { message: "Invalid response from course service", courses: [], total: 0 },
          { status: 502 }
        )
      }
    }

    if (!res.ok) {
      console.error("[api/courses GET] Backend error", res.status, url)
      return NextResponse.json(
        typeof data === "object" && data !== null ? data : { error: "Failed to fetch courses" },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error retrieving courses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
