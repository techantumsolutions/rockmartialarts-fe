import { NextRequest, NextResponse } from "next/server"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"

/** Forward a Next.js route request to FastAPI `/api/{backendPath}` with headers and body intact. */
export async function proxyJsonToBackend(
  request: NextRequest,
  backendPath: string,
  options?: { method?: string }
): Promise<NextResponse> {
  const method = options?.method ?? request.method
  const base = getBackendProxyBaseUrl().replace(/\/$/, "")
  const { searchParams } = new URL(request.url)
  const qs = searchParams.toString()
  const path = backendPath.replace(/^\//, "")
  const url = `${base}/api/${path}${qs ? `?${qs}` : ""}`

  const proxyHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower !== "host" && lower !== "connection" && lower !== "content-length") {
      proxyHeaders[key] = value
    }
  })

  let body: string | undefined
  if (method !== "GET" && method !== "HEAD") {
    body = await request.text()
    if (!proxyHeaders["Content-Type"] && !proxyHeaders["content-type"]) {
      proxyHeaders["Content-Type"] = "application/json"
    }
  }

  try {
    const res = await fetch(url, { method, headers: proxyHeaders, body, cache: "no-store" })
    const contentType = res.headers.get("content-type") || ""
    const text = await res.text()
    if (contentType.includes("application/json")) {
      let data: unknown = text
      if (text) {
        try {
          data = JSON.parse(text)
        } catch {
          /* keep as text */
        }
      }
      return NextResponse.json(data, { status: res.status })
    }
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": contentType || "text/plain" },
    })
  } catch (err) {
    console.error("[proxyToBackend] fetch failed:", path, err)
    return NextResponse.json(
      { detail: "Cannot reach the backend. Check NEXT_SERVER_BACKEND_URL." },
      { status: 502 }
    )
  }
}
