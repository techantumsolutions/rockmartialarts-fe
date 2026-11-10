import { NextRequest, NextResponse } from "next/server"
import { proxyJsonToBackend } from "@/lib/proxyToBackend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return proxyJsonToBackend(request, "superadmin/login")
}

export async function GET() {
  return NextResponse.json(
    {
      message: "SuperAdmin login is proxied to the backend",
      endpoint: "/api/superadmin/login",
      method: "POST",
      preferred_client_path: "/api/backend/superadmin/login",
    },
    { status: 200 }
  )
}
