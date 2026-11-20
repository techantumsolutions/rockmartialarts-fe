/**
 * Field-level CMS content resolution.
 * Priority: published CMS → existing default → neutral section fallback.
 * Never invents identities, addresses, fees, or testimonials.
 */

export function resolveCmsText(
  cmsValue?: string | null,
  existingDefault?: string | null,
  sectionFallback?: string
): string {
  const cms = String(cmsValue ?? "").trim()
  if (cms) return cms
  const def = String(existingDefault ?? "").trim()
  if (def) return def
  return String(sectionFallback ?? "").trim()
}

export const PUBLIC_SECTION_FALLBACKS = {
  heroTitle: "Train with Confidence at Rock Martial Arts Academy",
  heroDescription:
    "Explore structured martial arts, fitness, and dance programs designed to support learning, discipline, and personal growth.",
  aboutHeading: "About Rock Martial Arts Academy",
  aboutDescription:
    "Discover our approach to martial arts training, fitness, discipline, and personal development.",
  founderEyebrow: "About Our Founder",
  founderTitle: "The Vision Behind Rock Martial Arts Academy",
  founderMissing:
    "Learn about the vision and philosophy behind Rock Martial Arts Academy. Founder details will appear here when published in CMS.",
  membersEyebrow: "Our Members",
  membersTitle: "Our Expert Masters",
  membersEmpty: "Meet the people who support learning and development at our academy.",
  testimonialsHeading: "Student Experiences",
  testimonialsEmpty: "Student experiences and feedback will be available here.",
  branchesHeading: "Explore Our Academies",
  branchesEmpty: "Find information about available Rock Martial Arts Academy training locations.",
  contactMissing: "Contact information will be available soon.",
  galleryHeading: "Training Moments",
  galleryEmpty: "Explore moments from our training activities and academy community.",
} as const

/** Verified org founder labels already used in course lineage defaults — not fabricated. */
export const VERIFIED_ORG_FOUNDER = {
  name: "Master B. Devaraj",
  title: "Founder — Rock Martial Arts Academy",
} as const

/**
 * Neutral placeholder cards when an academy has no assigned coaches.
 * Clearly non-identity placeholders — never copy org homepage coaches.
 */
export const BRANCH_MEMBER_PLACEHOLDERS = [
  {
    name: "Instructor Profile",
    role: "Coach",
    img: "/assets/img/glry_img3.jpg",
    about: "Coach details for this academy will appear here when published.",
    rating: null as number | null,
  },
  {
    name: "Instructor Profile",
    role: "Senior Coach",
    img: "/assets/img/glry_img5.jpg",
    about: "Profiles are shown only for instructors assigned to this location.",
    rating: null as number | null,
  },
  {
    name: "Instructor Profile",
    role: "Assistant Coach",
    img: "/assets/img/glry_img7.jpg",
    about: "Check back soon for academy-specific instructor information.",
    rating: null as number | null,
  },
] as const
