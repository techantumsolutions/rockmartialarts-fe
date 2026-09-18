import { getBackendApiUrl } from "./config"

export type CoachRegisterOption = { id?: string; value?: string; label?: string; name?: string }

export type CoachRegistrationPayload = {
  first_name: string
  last_name: string
  gender: string
  date_of_birth: string
  email: string
  country_code?: string
  phone: string
  password: string
  address: string
  area?: string
  city: string
  state: string
  zip_code?: string
  country?: string
  professional_experience: string
  education_qualification?: string
  designation?: string
  specializations: string[]
  certifications?: string[]
  service_location_ids: string[]
  profile_image_url?: string | null
  about_short?: string | null
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

class CoachRegistrationAPI {
  async options() {
    const res = await fetch(getBackendApiUrl("coaches/register/options"), {
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      branches: { id: string; name: string }[]
      specializations: CoachRegisterOption[]
      experience_ranges: CoachRegisterOption[]
      genders: CoachRegisterOption[]
      designations: CoachRegisterOption[]
      countries: CoachRegisterOption[]
    }>
  }

  async uploadPhoto(file: File) {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(getBackendApiUrl("coaches/register/photo"), {
      method: "POST",
      body: formData,
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ file_url: string; message?: string }>
  }

  async register(payload: CoachRegistrationPayload) {
    const res = await fetch(getBackendApiUrl("coaches/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      coach_id: string
      approval_status: string
      coach: Record<string, unknown>
    }>
  }
}

export const coachRegistrationAPI = new CoachRegistrationAPI()

export function optionLabel(o: CoachRegisterOption) {
  return o.label || o.name || o.value || o.id || ""
}

export function optionValue(o: CoachRegisterOption) {
  return o.value || o.id || o.label || o.name || ""
}
