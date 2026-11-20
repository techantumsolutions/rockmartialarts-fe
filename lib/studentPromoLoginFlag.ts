/** Session flag: show student promotion popup only after a successful login. */

export const STUDENT_PROMO_AFTER_LOGIN_KEY = "rma_promo_show_after_login"
export const STUDENT_PROMO_LOGIN_QUERY = "login_promo"

export function markStudentPromoPendingAfterLogin() {
  try {
    if (typeof window === "undefined") return
    sessionStorage.setItem(STUDENT_PROMO_AFTER_LOGIN_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function peekStudentPromoPendingAfterLogin(): boolean {
  try {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem(STUDENT_PROMO_AFTER_LOGIN_KEY) === "1"
  } catch {
    return false
  }
}

/** Clears the flag. Call only after we commit to fetching/showing. */
export function clearStudentPromoPendingAfterLogin() {
  try {
    if (typeof window === "undefined") return
    sessionStorage.removeItem(STUDENT_PROMO_AFTER_LOGIN_KEY)
  } catch {
    /* ignore */
  }
}

/** Append ?login_promo=1 (or &…) so the popup host can detect post-login even if storage is flaky. */
export function withStudentPromoLoginQuery(path: string): string {
  const raw = (path || "/student-dashboard").trim() || "/student-dashboard"
  if (raw.includes(`${STUDENT_PROMO_LOGIN_QUERY}=`)) return raw
  const hashIdx = raw.indexOf("#")
  const beforeHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : ""
  const sep = beforeHash.includes("?") ? "&" : "?"
  return `${beforeHash}${sep}${STUDENT_PROMO_LOGIN_QUERY}=1${hash}`
}
