/**
 * Public lead capture (POST /api/leads via same-origin backend proxy).
 * Failures are logged; callers can still continue the registration flow.
 */
export async function submitLead(payload: {
  name: string
  email: string
  phone: string
  course?: string
  source?: string
  source_type?: string
  source_ref_id?: string
  source_ref_type?: string
  branch_id?: string
  branch_name?: string
}): Promise<boolean> {
  try {
    const source = payload.source?.trim() || undefined
    const res = await fetch("/api/backend/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        course: (payload.course ?? "").trim(),
        source,
        source_type: payload.source_type?.trim() || source,
        source_ref_id: payload.source_ref_id?.trim() || undefined,
        source_ref_type: payload.source_ref_type?.trim() || undefined,
        branch_id: payload.branch_id?.trim() || undefined,
        branch_name: payload.branch_name?.trim() || undefined,
      }),
      cache: "no-store",
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      console.error("[submitLead] API error", res.status, text)
      return false
    }
    return true
  } catch (e) {
    console.error("[submitLead] Network error", e)
    return false
  }
}
