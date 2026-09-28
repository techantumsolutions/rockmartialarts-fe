/**
 * Course promotional video upload limits (client-side).
 * Configure via NEXT_PUBLIC_COURSE_PROMO_VIDEO_MAX_MB (default 50).
 */

export function getCoursePromoVideoMaxMb(): number {
  const mb = Number(process.env.NEXT_PUBLIC_COURSE_PROMO_VIDEO_MAX_MB || 50)
  return Number.isFinite(mb) && mb > 0 ? mb : 50
}

export function getCoursePromoVideoMaxBytes(): number {
  return getCoursePromoVideoMaxMb() * 1024 * 1024
}

export function isCoursePromoMp4(file: File): boolean {
  const name = (file.name || "").toLowerCase()
  const type = (file.type || "").toLowerCase()
  return name.endsWith(".mp4") || type === "video/mp4"
}
