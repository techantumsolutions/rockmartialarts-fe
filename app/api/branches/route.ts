import { NextRequest } from "next/server"
import { proxyJsonToBackend } from "@/lib/proxyToBackend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return proxyJsonToBackend(request, "branches")
}

export async function POST(request: NextRequest) {
  return proxyJsonToBackend(request, "branches")
}
