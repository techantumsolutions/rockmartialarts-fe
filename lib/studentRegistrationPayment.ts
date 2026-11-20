import { getBackendApiUrl } from "@/lib/config"
import { openRazorpayCheckout, RazorpayPaymentResponse } from "@/lib/razorpay"

export interface RegistrationBatch {
  id: string
  batch_id: string
  batch_name: string
  start_time: string
  end_time: string
  days: string[]
  coach_id?: string
  max_students?: number | null
  enrolled_students?: number | null
  is_full?: boolean
  fee_per_duration?: Record<string, number | string>
  enabled_per_duration?: Record<string, boolean>
  pricing_type_per_duration?: Record<string, string>
}

export interface RegistrationDurationOption {
  id: string
  name: string
  code?: string
  duration_months?: number
  calculated_price?: number | null
  is_enabled?: boolean
}

export interface RegistrationPricing {
  course_fee: number
  admission_fee: number
  total_amount: number
  currency: string
}

export interface CreatorAuditInfo {
  user_id: string
  name: string
  role: string
  email?: string
}

/**
 * Fetch scheduled batches for a specific course at a given branch.
 */
export async function fetchBranchCourseBatches(
  branchId: string,
  courseId: string
): Promise<RegistrationBatch[]> {
  if (!branchId || !courseId) return []
  try {
    const res = await fetch(getBackendApiUrl(`branches/public/${encodeURIComponent(branchId)}`))
    let rawBatches: any[] = []

    if (res.ok) {
      const data = await res.json()
      // Extract schedules from all possible locations
      const schedules: any[] =
        data?.assignments?.course_schedule ||
        data?.branch?.assignments?.course_schedule ||
        data?.course_schedule ||
        []

      const match = schedules.find(
        (s: any) =>
          s?.course_id === courseId ||
          s?.courseId === courseId ||
          s?.id === courseId ||
          s?._id === courseId
      )

      if (match && Array.isArray(match.batches) && match.batches.length > 0) {
        rawBatches = match.batches
      } else if (Array.isArray(data?.courses)) {
        // Fallback to data.courses matching courseId
        const courseMatch = data.courses.find(
          (c: any) =>
            c?.id === courseId ||
            c?.course_id === courseId ||
            c?._id === courseId
        )
        if (courseMatch) {
          if (Array.isArray(courseMatch.branch_batches) && courseMatch.branch_batches.length > 0) {
            rawBatches = courseMatch.branch_batches
          } else if (Array.isArray(courseMatch.batches) && courseMatch.batches.length > 0) {
            rawBatches = courseMatch.batches
          }
        }
      }
    }

    // Fallback: If still no batches found, try courses/public/by-branch endpoint
    if (rawBatches.length === 0) {
      try {
        const cRes = await fetch(getBackendApiUrl(`courses/public/by-branch/${encodeURIComponent(branchId)}`))
        if (cRes.ok) {
          const cData = await cRes.json()
          const coursesList: any[] = Array.isArray(cData.courses) ? cData.courses : []
          const cMatch = coursesList.find(
            (c: any) =>
              c?.id === courseId ||
              c?.course_id === courseId ||
              c?._id === courseId
          )
          if (cMatch) {
            if (Array.isArray(cMatch.branch_batches) && cMatch.branch_batches.length > 0) {
              rawBatches = cMatch.branch_batches
            } else if (Array.isArray(cMatch.batches) && cMatch.batches.length > 0) {
              rawBatches = cMatch.batches
            }
          }
        }
      } catch (fallbackErr) {
        // Ignore fallback error
      }
    }

    if (!Array.isArray(rawBatches) || rawBatches.length === 0) {
      return []
    }

    return rawBatches.map((b: any, index: number) => {
      const bid =
        b.batch_ref ||
        b.batchRef ||
        b.batch_id ||
        b.batchId ||
        b.id ||
        b._id ||
        `batch-${index + 1}`
      const bname = b.batch_name || b.batchName || b.name || b.title || b.label || `Batch ${index + 1}`
      const rawMax = b.max_students ?? b.maxStudents
      const rawEnrolled = b.enrolled_students ?? b.enrolledStudents
      const maxStudents = rawMax != null && String(rawMax).trim() !== "" ? parseInt(String(rawMax), 10) : null
      const enrolledStudents = rawEnrolled != null && String(rawEnrolled).trim() !== "" ? parseInt(String(rawEnrolled), 10) : 0
      const isFull = b.is_full ?? (maxStudents != null && maxStudents > 0 && enrolledStudents >= maxStudents)
      return {
        id: String(bid),
        batch_id: String(bid),
        batch_name: String(bname),
        start_time: b.start_time || b.startTime || "",
        end_time: b.end_time || b.endTime || "",
        days: Array.isArray(b.days) ? b.days : [],
        coach_id: b.coach_id || b.coachId || "",
        max_students: maxStudents,
        enrolled_students: enrolledStudents,
        is_full: !!isFull,
        fee_per_duration:
          b.fee_per_duration && typeof b.fee_per_duration === "object" ? b.fee_per_duration : undefined,
        enabled_per_duration:
          b.enabled_per_duration && typeof b.enabled_per_duration === "object"
            ? b.enabled_per_duration
            : undefined,
        pricing_type_per_duration:
          b.pricing_type_per_duration && typeof b.pricing_type_per_duration === "object"
            ? b.pricing_type_per_duration
            : undefined,
      }
    })
  } catch (err) {
    console.error("Failed to fetch academy course batches:", err)
    return []
  }
}

function positiveFee(value: unknown): boolean {
  if (value == null || value === "") return false
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) && n > 0
}

function batchHasFeeDetails(batch: any): boolean {
  if (!batch || typeof batch !== "object") return false
  const fpd = batch.fee_per_duration
  const enabled = batch.enabled_per_duration
  if (fpd && typeof fpd === "object") {
    for (const [key, raw] of Object.entries(fpd)) {
      if (!positiveFee(raw)) continue
      if (enabled && typeof enabled === "object" && key in enabled && !Boolean((enabled as any)[key])) {
        continue
      }
      return true
    }
  }
  return positiveFee(batch.batch_fee)
}

/**
 * Keep courses that have at least one batch with fee details and at least one tenure option.
 * Used by registration and create/add-student course dropdowns.
 */
export function filterEnrollableCourses<T extends Record<string, any>>(courses: T[]): T[] {
  if (!Array.isArray(courses)) return []
  return courses.filter((course) => {
    const batches = Array.isArray(course.branch_batches)
      ? course.branch_batches
      : Array.isArray(course.batches)
        ? course.batches
        : []
    const enrollableBatches = batches.filter(batchHasFeeDetails)
    if (enrollableBatches.length === 0) return false
    const durations = Array.isArray(course.available_durations) ? course.available_durations : null
    // If durations are present on the payload, require at least one; otherwise allow and let tenure APIs resolve.
    if (durations && durations.length === 0) return false
    return true
  })
}

/**
 * Durations offered for a course at an academy (optionally for a specific batch).
 * Uses Academy → Course Assignments tenure setup when branch/batch are provided.
 */
export async function fetchRegistrationDurations(
  courseId: string,
  branchId?: string,
  batchRef?: string
): Promise<RegistrationDurationOption[]> {
  if (!courseId) return []
  try {
    const params = new URLSearchParams()
    params.set("active_only", "true")
    params.set("include_pricing", "true")
    if (branchId) params.set("branch_id", branchId)
    if (batchRef) params.set("batch_ref", batchRef)
    const res = await fetch(
      getBackendApiUrl(
        `durations/public/by-course/${encodeURIComponent(courseId)}?${params.toString()}`
      ),
      { cache: "no-store" }
    )
    if (!res.ok) return []
    const data = await res.json()
    const list = (data.durations || []) as RegistrationDurationOption[]
    return list.filter((d) => d?.id && d.is_enabled !== false)
  } catch (err) {
    console.error("Failed to fetch course durations:", err)
    return []
  }
}

/**
 * Fetch live pricing details (course fee, admission fee, total amount)
 */
export async function fetchRegistrationPricing(
  courseId: string,
  branchId: string,
  duration: string = "1-month",
  batchRef?: string
): Promise<RegistrationPricing | null> {
  if (!courseId || !branchId) return null
  try {
    const params = new URLSearchParams()
    params.append("branch_id", branchId)
    if (duration) params.append("duration", duration)
    if (batchRef && batchRef.trim()) params.append("batch_ref", batchRef.trim())

    const url = getBackendApiUrl(`courses/${encodeURIComponent(courseId)}/payment-info?${params.toString()}`)
    let res = await fetch(url)
    if (!res.ok) {
      // Fallback endpoint
      const fallbackUrl = getBackendApiUrl(`payments/course-payment-info?course_id=${encodeURIComponent(courseId)}&${params.toString()}`)
      res = await fetch(fallbackUrl)
    }

    if (!res.ok) {
      console.warn("fetchRegistrationPricing: could not fetch pricing for course", courseId, "branch", branchId, "status", res.status)
      return null
    }

    const data = await res.json()
    const pricing = data.pricing || {}
    const courseFee = typeof pricing.course_fee === "number" ? pricing.course_fee : 0
    const admissionFee = typeof pricing.admission_fee === "number" ? pricing.admission_fee : 0
    const totalAmount = typeof pricing.total_amount === "number" ? pricing.total_amount : (courseFee + admissionFee)

    return {
      course_fee: courseFee,
      admission_fee: admissionFee,
      total_amount: totalAmount,
      currency: pricing.currency || "INR",
    }
  } catch (err) {
    console.error("Failed to load course pricing:", err)
    return null
  }
}

/**
 * Verify whether student email or phone is already registered in the database.
 * Call this BEFORE triggering payment gateway or submitting.
 */
export async function checkStudentAvailability(
  email?: string,
  phone?: string
): Promise<{
  available: boolean
  email_exists: boolean
  phone_exists: boolean
  message?: string
}> {
  const cleanEmail = (email || "").trim()
  const cleanPhone = (phone || "").trim()

  if (!cleanEmail && !cleanPhone) {
    return { available: true, email_exists: false, phone_exists: false }
  }

  try {
    const res = await fetch(getBackendApiUrl("auth/check-student-availability"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail || undefined, phone: cleanPhone || undefined }),
    })

    if (res.ok) {
      return await res.json()
    }
  } catch (e) {
    console.warn("Primary check-student-availability endpoint failed, falling back to legacy checks", e)
  }

  // Fallback to separate checks if check-student-availability is unavailable
  let emailExists = false
  let phoneExists = false

  try {
    if (cleanEmail) {
      const emailRes = await fetch(getBackendApiUrl("auth/check-user"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      })
      if (emailRes.ok) {
        const data = await emailRes.json()
        if (data?.exists) emailExists = true
      }
    }
  } catch (e) {
    console.warn("Fallback email check error:", e)
  }

  try {
    if (cleanPhone) {
      const phoneRes = await fetch(getBackendApiUrl("auth/check-phone"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      })
      if (phoneRes.ok) {
        const data = await phoneRes.json()
        if (data?.exists) phoneExists = true
      }
    }
  } catch (e) {
    console.warn("Fallback phone check error:", e)
  }

  const available = !emailExists && !phoneExists
  let message: string | undefined = undefined
  if (emailExists && phoneExists) {
    message = "Both this email address and mobile number are already registered."
  } else if (emailExists) {
    message = "This email address is already registered."
  } else if (phoneExists) {
    message = "This mobile number is already registered."
  }

  return {
    available,
    email_exists: emailExists,
    phone_exists: phoneExists,
    message,
  }
}

/**
 * Create a Razorpay registration order on the backend
 */
export async function createRegistrationOrder(payload: {
  course_id: string
  branch_id: string
  duration: string
  batch_ref?: string
  student_name: string
  student_email: string
  student_phone: string
}): Promise<{
  order_id: string
  amount_paise: number
  amount_inr: number
  key_id: string
  currency: string
}> {
  const res = await fetch(getBackendApiUrl("payments/create-registration-order"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Failed to initialize online payment order")
  }
  return await res.json()
}

/**
 * Submit the completed registration to the backend
 */
export async function submitRegistrationPayment(
  payload: any,
  token?: string | null
): Promise<any> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(getBackendApiUrl("payments/process-registration"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Student registration failed. Please try again.")
  }
  return await res.json()
}

