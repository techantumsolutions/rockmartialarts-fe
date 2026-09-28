import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"

export type CampaignPopup = {
  id: string
  event_title: string
  description?: string
  image_url?: string
  start_date: string
  end_date: string
  location?: string
  cta_label?: string
  cta_url?: string
  delay_minutes: number
  priority: number
  enabled: boolean
  created_at?: string
  updated_at?: string
}

export type CampaignPopupInput = {
  event_title: string
  description?: string
  image_url?: string
  start_date: string
  end_date: string
  location?: string
  cta_label?: string
  cta_url?: string
  delay_minutes: number
  priority: number
  enabled: boolean
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join(", ")
    }
    return data?.message || `Request failed (${res.status})`
  } catch {
    return `Request failed (${res.status})`
  }
}

export async function listCampaignPopups(): Promise<CampaignPopup[]> {
  const res = await fetch(getBackendApiUrl("campaign-popups"), {
    headers: authHeaders(),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await parseError(res))
  const data = await res.json()
  return Array.isArray(data.popups) ? data.popups : []
}

export async function createCampaignPopup(body: CampaignPopupInput): Promise<CampaignPopup> {
  const res = await fetch(getBackendApiUrl("campaign-popups"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return await res.json()
}

export async function updateCampaignPopup(
  id: string,
  body: Partial<CampaignPopupInput>
): Promise<CampaignPopup> {
  const res = await fetch(getBackendApiUrl(`campaign-popups/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return await res.json()
}

export async function setCampaignPopupEnabled(id: string, enabled: boolean): Promise<CampaignPopup> {
  const res = await fetch(getBackendApiUrl(`campaign-popups/${id}/enabled`), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return await res.json()
}

export async function deleteCampaignPopup(id: string): Promise<void> {
  const res = await fetch(getBackendApiUrl(`campaign-popups/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
}

/** Public: best enabled in-window campaign (no auth). */
export async function fetchActiveCampaignPopup(): Promise<CampaignPopup | null> {
  const res = await fetch(getBackendApiUrl("campaign-popups/public/active"), {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.popup ?? null
}
