import { getBackendApiUrl } from "@/lib/config"

/**
 * Best-effort cleanup after Razorpay fail/dismiss for student self-checkout.
 * Only removes unpaid pending enrollments owned by the student (server-enforced).
 */
export async function cancelPendingStudentCheckout(
  enrollmentId: string | undefined | null,
  token: string | undefined | null
): Promise<void> {
  const id = typeof enrollmentId === "string" ? enrollmentId.trim() : ""
  const auth = typeof token === "string" ? token.trim() : ""
  if (!id || !auth) return
  try {
    await fetch(getBackendApiUrl("payments/cancel-pending-checkout"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enrollment_id: id }),
      cache: "no-store",
    })
  } catch {
    // Ignore network errors — next prepare already clears stale pending rows.
  }
}
