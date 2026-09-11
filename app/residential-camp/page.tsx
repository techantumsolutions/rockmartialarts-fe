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

async function getResidentialCampContent(): Promise<ResidentialCampContent> {
  try {
    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

    if (siteOrigin) {
      const res = await fetch(`${siteOrigin.replace(/\/$/, "")}/api/backend/cms/public/residential-camp`, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) return mergeResidentialCamp(await res.json())
    }

    const backendUrl =
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://127.0.0.1:8003"
    const res = await fetch(`${backendUrl.replace(/\/$/, "")}/api/cms/public/residential-camp`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) return DEFAULT_RESIDENTIAL_CAMP
    return mergeResidentialCamp(await res.json())
  } catch {
    return DEFAULT_RESIDENTIAL_CAMP
  }
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
