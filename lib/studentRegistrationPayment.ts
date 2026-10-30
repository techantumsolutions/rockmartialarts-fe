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
      const bid = b.batch_id || b.batchId || b.id || b._id || `batch-${index + 1}`
      const bname = b.batch_name || b.batchName || b.name || b.title || `Batch ${index + 1}`
      return {
        id: String(bid),
        batch_id: String(bid),
        batch_name: String(bname),
        start_time: b.start_time || b.startTime || "",
        end_time: b.end_time || b.endTime || "",
        days: Array.isArray(b.days) ? b.days : [],
        coach_id: b.coach_id || b.coachId || "",
      }
    })
  } catch (err) {
    console.error("Failed to fetch branch course batches:", err)
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

