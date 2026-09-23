import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export const WEEKDAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const

export type WeeklySlot = {
  id?: string
  weekday: string
  start_time: string
  end_time: string
  service_location_id?: string | null
  service_location_name?: string | null
  notes?: string | null
}

export type CoachAvailability = {
  id?: string
  coach_id: string
  timezone?: string
  service_location_ids?: string[]
  service_location_names?: string[]
  weekly_slots?: WeeklySlot[]
  notes?: string | null
  updated_at?: string | null
}

export type AvailabilityOptions = {
  coach_id: string
  locations: { id: string; name: string }[]
  weekdays: { value: string; label: string }[]
  coach_service_location_ids?: string[]
  timezone_default?: string
}

function authHeaders(json = false): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  const h: Record<string, string> = { "Cache-Control": "no-cache" }
  if (token) h.Authorization = `Bearer ${token}`
  else h.Authorization = "Bearer "
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
        .join("; ")
    }
    return data?.message || res.statusText || "Request failed"
  } catch {
    return res.statusText || "Request failed"
  }
}

class CoachAvailabilityAPI {
  async getMine() {
    const res = await fetch(getBackendApiUrl("coaches/me/availability"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<CoachAvailability>
  }

  async optionsMine() {
    const res = await fetch(getBackendApiUrl("coaches/me/availability/options"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<AvailabilityOptions>
  }

  async updateMine(body: {
    timezone?: string
    service_location_ids: string[]
    weekly_slots: WeeklySlot[]
    notes?: string | null
  }) {
    const res = await fetch(getBackendApiUrl("coaches/me/availability"), {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; availability: CoachAvailability }>
  }

  async getForCoach(coachId: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/availability`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<CoachAvailability>
  }

  async optionsForCoach(coachId: string) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/availability/options`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<AvailabilityOptions>
  }

  async updateForCoach(
    coachId: string,
    body: {
      timezone?: string
      service_location_ids: string[]
      weekly_slots: WeeklySlot[]
      notes?: string | null
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/availability`),
      {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; availability: CoachAvailability }>
  }
}

export const coachAvailabilityAPI = new CoachAvailabilityAPI()
