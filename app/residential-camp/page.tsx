import type { Metadata } from "next"
import { ResidentialCampInteractive } from "@/components/website/ResidentialCampInteractive"
import {
  DEFAULT_RESIDENTIAL_CAMP,
  mergeResidentialCamp,
  type ResidentialCampContent,
} from "@/lib/residentialCamp"
import "./residential-camp.css"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function fetchCampJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function getResidentialCampContent(): Promise<ResidentialCampContent> {
  const backendUrl = (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://127.0.0.1:8003"
  ).replace(/\/$/, "")

  // Prefer the live backend so CMS nav logo / content edits show immediately.
  // (NEXT_PUBLIC_SITE_URL often points at production and would serve stale CMS.)
  const candidates = [`${backendUrl}/api/cms/public/residential-camp`]

  if (process.env.VERCEL_URL) {
    candidates.push(`https://${process.env.VERCEL_URL.replace(/\/$/, "")}/api/backend/cms/public/residential-camp`)
  }

  const siteOrigin = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")
  if (siteOrigin && process.env.NODE_ENV === "production") {
    candidates.push(`${siteOrigin}/api/backend/cms/public/residential-camp`)
  }

  for (const url of candidates) {
    const json = await fetchCampJson(url)
    if (json) return mergeResidentialCamp(json)
  }

  return DEFAULT_RESIDENTIAL_CAMP
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getResidentialCampContent()
  return {
    title: content.meta_title,
    description: content.meta_description,
  }
}

export default async function ResidentialCampPage() {
  const content = await getResidentialCampContent()
  return <ResidentialCampInteractive content={content} />
}
