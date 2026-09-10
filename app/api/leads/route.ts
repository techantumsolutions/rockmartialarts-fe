import { NextRequest, NextResponse } from "next/server"
import { getWebsiteBackendBaseUrl } from "@/lib/serverBackendUrl"

export const runtime = "nodejs"

/** Valid email for older APIs that still require `email` (e.g. EmailStr) on POST /api/leads */
const DEFAULT_PLACEHOLDER_EMAIL =
  process.env.LEAD_CAPTURE_PLACEHOLDER_EMAIL?.trim() || "website-popup@example.com"

/**
 * Proxies public lead capture to FastAPI POST /api/leads.
 * Forwards optional name/phone/branch and `verification_token` from lead OTP
 * (POST /api/leads/verify-otp). Backend must persist homepage.popup_form and
 * expire OTPs using LEAD_OTP_EXPIRY_SECONDS.
 */
function normalizeLeadPayload(raw: unknown): Record<string, string | undefined> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid JSON body")
  }
  const b = raw as Record<string, unknown>
  const str = (v: unknown) => (v == null ? "" : String(v)).trim()
  const opt = (v: unknown) => {
    const s = str(v)
    return s === "" ? undefined : s
  }
  let email = opt(b.email)
  // Deployed backends without optional email reject the body with "Field required"
  if (!email) {
    email = DEFAULT_PLACEHOLDER_EMAIL
  }
  return {
    name: opt(b.name),
    phone: opt(b.phone),
    email,
    course: opt(b.course) ?? "",
    source: opt(b.source) ?? "website_popup",
    branch_id: opt(b.branch_id),
    branch_name: opt(b.branch_name),
    verification_token: opt(b.verification_token),
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json()
    const body = normalizeLeadPayload(rawBody)

    const base = getWebsiteBackendBaseUrl()
    const res = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: unknown = text
    if (res.headers.get("content-type")?.includes("application/json") && text) {
      try {
        data = JSON.parse(text)
      } catch {
        // keep as text
      }
    }

    if (!res.ok) {
      if (process.env.NODE_ENV === "development" && res.status === 422) {
        console.warn("[leads] backend 422 — forwarding detail. Backend URL:", base, data)
      }
      return NextResponse.json(
        typeof data === "object" && data !== null ? data : { error: "Failed to create lead" },
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("[leads] error creating lead:", error)
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    )
  }
}
