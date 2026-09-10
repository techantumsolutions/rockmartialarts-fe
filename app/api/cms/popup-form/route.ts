import { NextRequest, NextResponse } from "next/server"
import { getBackendProxyBaseUrl } from "@/lib/serverBackendUrl"
import { readPopupFormSettings, writePopupFormSettings } from "@/lib/popupFormStore"
import { normalizePopupFormForCms } from "@/lib/popupForm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const popup_form = await readPopupFormSettings()
    return NextResponse.json(
      { popup_form },
      { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } }
    )
  } catch (error) {
    console.error("[popup-form] GET failed:", error)
    return NextResponse.json({ popup_form: normalizePopupFormForCms(null) })
  }
}

async function isAdminToken(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return false
  try {
    const base = getBackendProxyBaseUrl()
    const res = await fetch(`${base.replace(/\/$/, "")}/api/cms`, {
      method: "GET",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}

export async function PUT(request: NextRequest) {
  if (!(await isAdminToken(request))) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const raw = body?.popup_form ?? body
    const popup_form = await writePopupFormSettings(raw)
    return NextResponse.json({ popup_form })
  } catch (error) {
    console.error("[popup-form] PUT failed:", error)
    return NextResponse.json({ error: "Failed to save popup form settings" }, { status: 500 })
  }
}
