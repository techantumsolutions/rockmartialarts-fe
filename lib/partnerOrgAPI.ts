import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export type PartnerOrg = {
  id: string
  name: string
  slug: string
  email: string
  phone: string
  address: string
  payment_method?: string
  payment_status?: string
  status?: string
  is_active?: boolean
  login_path?: string | null
  invite_email_sent?: boolean | null
  invite_email_sent_at?: string | null
  created_at?: string
  activated_at?: string | null
  valid_from?: string | null
  valid_until?: string | null
  effective_status?: "active" | "expired" | "deactivated" | string
  feature_permissions?: Record<string, boolean>
}

export type PartnerOrgCreateBody = {
  name: string
  email: string
  phone: string
  address: string
  payment_method: "online" | "offline"
}

function authHeaders(json = false): HeadersInit {
  const token = TokenManager.getToken()
  const h: Record<string, string> = { "Cache-Control": "no-cache" }
  if (token) h.Authorization = `Bearer ${token}`
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join("; ")
    }
    return data?.message || res.statusText || "Request failed"
  } catch {
    return res.statusText || "Request failed"
  }
}

class PartnerOrgAPI {
  async list(params?: { skip?: number; limit?: number; include_inactive?: boolean }) {
    const qs = new URLSearchParams()
    if (params?.skip != null) qs.set("skip", String(params.skip))
    if (params?.limit != null) qs.set("limit", String(params.limit))
    if (params?.include_inactive != null) qs.set("include_inactive", String(params.include_inactive))
    const res = await fetch(
      `${getBackendApiUrl("partner-organizations")}?${qs.toString()}`,
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ partners: PartnerOrg[]; total: number }>
  }

  async createOffline(body: PartnerOrgCreateBody) {
    const res = await fetch(getBackendApiUrl("partner-organizations/create-offline"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async createOnlineOrder(body: PartnerOrgCreateBody) {
    const res = await fetch(getBackendApiUrl("partner-organizations/create-online-order"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      partner: PartnerOrg
      order: { id: string; amount: number; currency: string }
      key: string
      message?: string
    }>
  }

  async verifyOnlinePayment(body: {
    partner_org_id: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) {
    const res = await fetch(getBackendApiUrl("partner-organizations/verify-online-payment"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message?: string
      invite_email_sent?: boolean
      partner?: PartnerOrg
    }>
  }

  async resendInvite(partnerOrgId: string) {
    const res = await fetch(
      getBackendApiUrl(`partner-organizations/${encodeURIComponent(partnerOrgId)}/resend-invite`),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({}),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message?: string
      invite_email_sent?: boolean
      partner?: PartnerOrg
    }>
  }

  async updateValidity(
    partnerOrgId: string,
    body: { valid_from?: string | null; valid_until?: string | null }
  ) {
    const res = await fetch(
      getBackendApiUrl(`partner-organizations/${encodeURIComponent(partnerOrgId)}/validity`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message?: string; partner?: PartnerOrg }>
  }

  async getFeaturePermissions(partnerOrgId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `partner-organizations/${encodeURIComponent(partnerOrgId)}/feature-permissions`
      ),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      partner_org_id: string
      feature_permissions: Record<string, boolean>
      partner?: PartnerOrg
    }>
  }

  async patchFeaturePermissions(
    partnerOrgId: string,
    feature_permissions: Record<string, boolean>
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `partner-organizations/${encodeURIComponent(partnerOrgId)}/feature-permissions`
      ),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ feature_permissions }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message?: string
      feature_permissions: Record<string, boolean>
      partner?: PartnerOrg
    }>
  }

  async getMyFeaturePermissions() {
    const res = await fetch(getBackendApiUrl("partner-organizations/me/feature-permissions"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      partner_org_id: string
      feature_permissions: Record<string, boolean>
    }>
  }

  async setActive(partnerOrgId: string, is_active: boolean) {
    const res = await fetch(
      getBackendApiUrl(`partner-organizations/${encodeURIComponent(partnerOrgId)}/status`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ is_active }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async publicBySlug(slug: string) {
    const res = await fetch(
      getBackendApiUrl(`partner-organizations/public/${encodeURIComponent(slug)}`),
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ name: string; slug: string; is_active?: boolean; status?: string }>
  }

  async login(slug: string, email: string, password: string) {
    const res = await fetch(
      getBackendApiUrl(`partner-organizations/public/${encodeURIComponent(slug)}/login`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async setPassword(token: string, new_password: string) {
    const res = await fetch(getBackendApiUrl("partner-organizations/public/set-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async getMyBranding() {
    const res = await fetch(getBackendApiUrl("partner-organizations/me/branding"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<PartnerOrgBranding>
  }

  async upsertMyBranding(body: PartnerOrgBrandingUpsert) {
    const res = await fetch(getBackendApiUrl("partner-organizations/me/branding"), {
      method: "PUT",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message?: string; branding: PartnerOrgBranding }>
  }

  async publicDirectory(params?: { q?: string; skip?: number; limit?: number }) {
    const qs = new URLSearchParams()
    if (params?.q) qs.set("q", params.q)
    if (params?.skip != null) qs.set("skip", String(params.skip))
    if (params?.limit != null) qs.set("limit", String(params.limit))
    const q = qs.toString()
    const res = await fetch(
      `${getBackendApiUrl("partner-organizations/public/directory")}${q ? `?${q}` : ""}`,
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      partners: PartnerOrgDirectoryItem[]
      total: number
      skip: number
      limit: number
    }>
  }

  async publicLanding(slug: string) {
    const res = await fetch(
      getBackendApiUrl(
        `partner-organizations/public/${encodeURIComponent(slug)}/landing`
      ),
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<PartnerOrgLanding>
  }

  async submitLandingLead(
    slug: string,
    body: {
      name: string
      phone: string
      email?: string
      message?: string
      interest?: string
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `partner-organizations/public/${encodeURIComponent(slug)}/leads`
      ),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }
}

export type PartnerOrgSiteBranch = {
  id: string
  name?: string
  code?: string
  slug?: string
  email?: string
  phone?: string
  address?: Record<string, string | undefined>
  branch?: Record<string, unknown>
  courses?: Array<Record<string, unknown> & { id: string }>
  operational_details?: Record<string, unknown>
  assignments?: Record<string, unknown>
}

export type PartnerOrgSiteAchievement = {
  id?: string
  source?: string
  student_name?: string
  student_photo?: string | null
  achievement_title?: string
  description?: string | null
  image?: string | null
  branch_id?: string
  is_featured?: boolean
}

export type PartnerOrgBranding = {
  id?: string | null
  partner_org_id: string
  has_branding?: boolean
  media?: {
    logo_url?: string | null
    logo_alt?: string | null
    cover_banner_url?: string | null
    cover_banner_alt?: string | null
  }
  content?: {
    short_description?: string | null
    about_content?: string | null
    vision?: string | null
    mission?: string | null
    our_story?: string | null
    why_choose_us?: string | null
    why_choose_us_points?: string[]
    tagline?: string | null
  }
  facilities?: {
    facilities?: string[]
    parking_info?: string | null
    location_highlights?: string[]
    map_embed_url?: string | null
  }
  social_links?: Record<string, string | null | undefined>
  contact_page?: {
    headline?: string | null
    intro?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    map_embed_url?: string | null
  }
  footer?: {
    logo_url?: string | null
    logo_alt?: string | null
    description?: string | null
  }
  org_snapshot?: {
    id?: string
    name?: string
    slug?: string
    email?: string
    phone?: string
    address?: string
  }
  branches?: PartnerOrgSiteBranch[]
  achievements?: PartnerOrgSiteAchievement[]
  branch_count?: number
  achievement_count?: number
}

export type PartnerOrgBrandingUpsert = {
  media?: PartnerOrgBranding["media"]
  content?: PartnerOrgBranding["content"]
  facilities?: PartnerOrgBranding["facilities"]
  social_links?: PartnerOrgBranding["social_links"]
  contact_page?: PartnerOrgBranding["contact_page"]
  footer?: PartnerOrgBranding["footer"]
}

export type PartnerOrgDirectoryItem = {
  partner_org_id: string
  name?: string
  slug?: string
  address?: string
  email?: string
  phone?: string
  logo_url?: string | null
  cover_banner_url?: string | null
  short_description?: string | null
  tagline?: string | null
  landing_path?: string | null
}

export type PartnerOrgLanding = {
  partner_org_id: string
  slug?: string
  has_branding?: boolean
  hero?: {
    name?: string
    tagline?: string | null
    logo_url?: string | null
    cover_banner_url?: string | null
  }
  about?: {
    short_description?: string | null
    about_content?: string | null
    our_story?: string | null
    vision?: string | null
    mission?: string | null
    why_choose_us?: string | null
    why_choose_us_points?: string[]
  }
  contact?: {
    phone?: string | null
    email?: string | null
    address?: string | null
  }
  contact_page?: {
    headline?: string | null
    intro?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    map_embed_url?: string | null
  }
  footer?: {
    logo_url?: string | null
    logo_alt?: string | null
    description?: string | null
  }
  facilities?: {
    facilities?: string[]
    parking_info?: string | null
    location_highlights?: string[]
    map_embed_url?: string | null
  }
  social_links?: Record<string, string | null | undefined>
  login_path?: string | null
  branches?: PartnerOrgSiteBranch[]
  achievements?: PartnerOrgSiteAchievement[]
  branch_count?: number
  achievement_count?: number
}

export const partnerOrgAPI = new PartnerOrgAPI()

function normKey(v: unknown): string {
  return String(v || "")
    .trim()
    .toLowerCase()
}

/** Match a branch on a public landing by slug, id, or code. */
export function findPartnerLandingBranch(
  landing: PartnerOrgLanding | null | undefined,
  branchKey: string
): PartnerOrgSiteBranch | null {
  if (!landing?.branches?.length) return null
  const key = normKey(branchKey)
  return (
    landing.branches.find(
      (b) =>
        normKey(b.slug) === key ||
        normKey(b.id) === key ||
        normKey(b.code) === key ||
        normKey(b.name) === key
    ) || null
  )
}

/** Match a course on a branch by slug, id, or code. */
export function findPartnerBranchCourse(
  branch: PartnerOrgSiteBranch | null | undefined,
  courseKey: string
): (Record<string, unknown> & { id: string }) | null {
  const courses = branch?.courses || []
  if (!courses.length) return null
  const key = normKey(courseKey)
  return (
    courses.find(
      (c) =>
        normKey(c.slug) === key ||
        normKey(c.id) === key ||
        normKey((c as { code?: string }).code) === key ||
        normKey((c as { title?: string }).title) === key ||
        normKey((c as { name?: string }).name) === key
    ) || null
  )
}
