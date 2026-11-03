/**
 * TEMP preview data for public /partner-orgs pages only.
 * Remove when real partner orgs are ready to show again.
 */
import type {
  PartnerOrgDirectoryItem,
  PartnerOrgLanding,
} from "@/lib/partnerOrgAPI"

const courseKarate = {
  id: "dummy-course-karate",
  title: "Kids Karate Foundations",
  name: "Kids Karate Foundations",
  code: "KK-01",
  slug: "kids-karate-foundations",
  description:
    "Age-appropriate karate for children focusing on discipline, coordination, and confidence. Classes include basics, forms, and light sparring under coach supervision.",
  difficulty_level: "Beginner",
  media_resources: {
    course_image_url: "/assets/img/courses/choose_img1.png",
  },
  pricing: {
    monthly_fee: 2500,
    currency: "INR",
    display_label: "₹2,500 / month",
  },
  available_durations: [
    { id: "d1", code: "1M", name: "1 Month", duration_months: 1 },
    { id: "d3", code: "3M", name: "3 Months", duration_months: 3 },
    { id: "d6", code: "6M", name: "6 Months", duration_months: 6 },
  ],
}

const courseTaekwondo = {
  id: "dummy-course-tkd",
  title: "Taekwondo Sparring",
  name: "Taekwondo Sparring",
  code: "TKD-02",
  slug: "taekwondo-sparring",
  description:
    "Dynamic kicking drills, pad work, and controlled sparring for teens and adults. Ideal for fitness and competitive pathway students.",
  difficulty_level: "Intermediate",
  media_resources: {
    course_image_url: "/assets/img/courses/takewondo_trainer.png",
  },
  pricing: {
    monthly_fee: 3200,
    currency: "INR",
    display_label: "₹3,200 / month",
  },
  available_durations: [
    { id: "d1", code: "1M", name: "1 Month", duration_months: 1 },
    { id: "d3", code: "3M", name: "3 Months", duration_months: 3 },
  ],
}

const courseSelfDefense = {
  id: "dummy-course-sd",
  title: "Women's Self Defense",
  name: "Women's Self Defense",
  code: "WSD-01",
  slug: "womens-self-defense",
  description:
    "Practical self-defense techniques, awareness drills, and confidence building in a supportive environment. Open to all fitness levels.",
  difficulty_level: "All levels",
  media_resources: {
    course_image_url: "/assets/img/courses/tr_yourself.png",
  },
  pricing: {
    monthly_fee: 2000,
    currency: "INR",
    display_label: "₹2,000 / month",
  },
  available_durations: [
    { id: "d1", code: "1M", name: "1 Month", duration_months: 1 },
    { id: "d3", code: "3M", name: "3 Months", duration_months: 3 },
  ],
}

const courseKungFu = {
  id: "dummy-course-kf",
  title: "Kung Fu Forms",
  name: "Kung Fu Forms",
  code: "KF-01",
  slug: "kung-fu-forms",
  description:
    "Traditional forms, stance work, and conditioning with an emphasis on focus and flow. Suitable for teens and adults.",
  difficulty_level: "Beginner",
  media_resources: {
    course_image_url: "/assets/img/courses/kung-fu-trainer.png",
  },
  pricing: {
    monthly_fee: 2800,
    currency: "INR",
    display_label: "₹2,800 / month",
  },
  available_durations: [
    { id: "d1", code: "1M", name: "1 Month", duration_months: 1 },
    { id: "d6", code: "6M", name: "6 Months", duration_months: 6 },
  ],
}

export const DUMMY_PARTNER_DIRECTORY: PartnerOrgDirectoryItem[] = [
  {
    partner_org_id: "dummy-org-phoenix",
    name: "Phoenix Martial Arts",
    slug: "phoenix-martial-arts",
    address: "12 Ring Road, Indiranagar, Bengaluru",
    email: "hello@phoenix-ma.example",
    phone: "+91 98765 43210",
    logo_url: "/assets/img/logo.png",
    cover_banner_url: "/assets/img/banner.jpg",
    short_description:
      "Family-friendly dojo network with kids and adult programs across Bengaluru.",
    tagline: "Rise stronger. Train together.",
    landing_path: "/partner-orgs/phoenix-martial-arts",
  },
  {
    partner_org_id: "dummy-org-iron-tiger",
    name: "Iron Tiger Academy",
    slug: "iron-tiger-academy",
    address: "88 MG Road, Pune",
    email: "contact@irontiger.example",
    phone: "+91 91234 56789",
    logo_url: "/assets/img/footer_logo.png",
    cover_banner_url: "/assets/img/class_bg.jpg",
    short_description:
      "Performance-focused academy for taekwondo, kung fu, and self-defense.",
    tagline: "Precision. Power. Pride.",
    landing_path: "/partner-orgs/iron-tiger-academy",
  },
]

export const DUMMY_PARTNER_LANDINGS: Record<string, PartnerOrgLanding> = {
  "phoenix-martial-arts": {
    partner_org_id: "dummy-org-phoenix",
    slug: "phoenix-martial-arts",
    has_branding: true,
    login_path: null,
    hero: {
      name: "Phoenix Martial Arts",
      tagline: "Rise stronger. Train together.",
      logo_url: "/assets/img/logo.png",
      cover_banner_url: "/assets/img/banner.jpg",
    },
    about: {
      short_description:
        "Family-friendly dojo network with kids and adult programs across Bengaluru.",
      about_content:
        "Phoenix Martial Arts is a white-label partner academy offering structured karate and self-defense programs for all ages. Our coaches focus on character, fitness, and safe progressive training.",
      our_story:
        "Founded as a community dojo, Phoenix grew into a multi-branch academy while keeping small class sizes and personal coaching.",
      vision: "A confident generation shaped by martial arts values.",
      mission: "Accessible, high-quality training for every neighborhood we serve.",
      why_choose_us:
        "Certified coaches, clear belt pathways, and a welcoming environment for families.",
      why_choose_us_points: [
        "Kids & adult batches",
        "Flexible monthly plans",
        "Trial class available",
      ],
    },
    contact: {
      phone: "+91 98765 43210",
      email: "hello@phoenix-ma.example",
      address: "12 Ring Road, Indiranagar, Bengaluru",
    },
    contact_page: {
      headline: "Contact Phoenix Martial Arts",
      intro: "Send an enquiry — it goes only to this partner organization.",
      phone: "+91 98765 43210",
      email: "hello@phoenix-ma.example",
      address: "12 Ring Road, Indiranagar, Bengaluru",
    },
    footer: {
      logo_url: "/assets/img/logo.png",
      logo_alt: "Phoenix Martial Arts",
      description:
        "Family-friendly dojo network with kids and adult programs across Bengaluru.",
    },
    facilities: {
      facilities: [
        "Air-conditioned mats",
        "Changing rooms",
        "Parent viewing area",
        "Protective gear available",
      ],
      parking_info: "Street parking and nearby mall basement available.",
      location_highlights: ["Near metro", "Safe evening access"],
    },
    social_links: {
      instagram: "https://instagram.com",
      facebook: "https://facebook.com",
    },
    branches: [
      {
        id: "dummy-branch-phoenix-indiranagar",
        name: "Indiranagar Branch",
        code: "PHX-IND",
        slug: "indiranagar",
        email: "indiranagar@phoenix-ma.example",
        phone: "+91 98765 43211",
        address: {
          line1: "12 Ring Road",
          area: "Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
        },
        courses: [courseKarate, courseSelfDefense],
        operational_details: {
          timings: [
            { day: "Mon–Fri", open: "06:00", close: "21:00" },
            { day: "Sat", open: "07:00", close: "18:00" },
          ],
        },
      },
      {
        id: "dummy-branch-phoenix-koramangala",
        name: "Koramangala Branch",
        code: "PHX-KOR",
        slug: "koramangala",
        email: "koramangala@phoenix-ma.example",
        phone: "+91 98765 43212",
        address: {
          line1: "45 5th Block",
          area: "Koramangala",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560095",
        },
        courses: [courseKarate, courseTaekwondo],
      },
    ],
    achievements: [
      {
        id: "dummy-ach-1",
        student_name: "Aarav S.",
        achievement_title: "State Gold — Kata",
        description: "Won gold in under-12 kata at the state championships.",
        image: "/assets/img/glry_img1.jpg",
        is_featured: true,
      },
      {
        id: "dummy-ach-2",
        student_name: "Meera K.",
        achievement_title: "Black Belt Promotion",
        description: "Successfully graded to 1st Dan under Phoenix coaches.",
        image: "/assets/img/glry_img2.jpg",
      },
    ],
    branch_count: 2,
    achievement_count: 2,
  },
  "iron-tiger-academy": {
    partner_org_id: "dummy-org-iron-tiger",
    slug: "iron-tiger-academy",
    has_branding: true,
    login_path: null,
    hero: {
      name: "Iron Tiger Academy",
      tagline: "Precision. Power. Pride.",
      logo_url: "/assets/img/footer_logo.png",
      cover_banner_url: "/assets/img/class_bg.jpg",
    },
    about: {
      short_description:
        "Performance-focused academy for taekwondo, kung fu, and self-defense.",
      about_content:
        "Iron Tiger Academy trains athletes and hobbyists with a competitive edge — technical kicking, forms, and practical self-defense.",
      our_story:
        "Started by national-level coaches in Pune, Iron Tiger expanded to two training hubs with shared curriculum and events.",
      vision: "Build champions on and off the mat.",
      mission: "Elite coaching standards with community accessibility.",
      why_choose_us: "Competition pathways, open mats, and structured strength work.",
      why_choose_us_points: [
        "Competition coaching",
        "Adult evening batches",
        "Women’s self-defense weekends",
      ],
    },
    contact: {
      phone: "+91 91234 56789",
      email: "contact@irontiger.example",
      address: "88 MG Road, Pune",
    },
    contact_page: {
      headline: "Contact Iron Tiger Academy",
      intro: "Ask about batches, trials, or competition pathways.",
      phone: "+91 91234 56789",
      email: "contact@irontiger.example",
      address: "88 MG Road, Pune",
    },
    footer: {
      logo_url: "/assets/img/footer_logo.png",
      logo_alt: "Iron Tiger Academy",
      description:
        "Performance-focused academy for taekwondo, kung fu, and self-defense.",
    },
    facilities: {
      facilities: [
        "Olympic-style mats",
        "Strength corner",
        "Spectator seating",
        "Locker rooms",
      ],
      parking_info: "Dedicated two-wheeler parking; four-wheeler nearby.",
      location_highlights: ["Central MG Road", "Bus stop outside"],
    },
    social_links: {
      youtube: "https://youtube.com",
      instagram: "https://instagram.com",
    },
    branches: [
      {
        id: "dummy-branch-iron-mg",
        name: "MG Road Hub",
        code: "ITA-MG",
        slug: "mg-road",
        email: "mgroad@irontiger.example",
        phone: "+91 91234 56780",
        address: {
          line1: "88 MG Road",
          area: "Camp",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
        },
        courses: [courseTaekwondo, courseKungFu, courseSelfDefense],
      },
      {
        id: "dummy-branch-iron-baner",
        name: "Baner Hub",
        code: "ITA-BAN",
        slug: "baner",
        email: "baner@irontiger.example",
        phone: "+91 91234 56781",
        address: {
          line1: "21 Baner Road",
          area: "Baner",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411045",
        },
        courses: [courseKungFu, courseTaekwondo],
      },
    ],
    achievements: [
      {
        id: "dummy-ach-3",
        student_name: "Rohan P.",
        achievement_title: "National Bronze — Sparring",
        description: "Bronze medal at the junior nationals sparring event.",
        image: "/assets/img/glry_img3.jpg",
        is_featured: true,
      },
    ],
    branch_count: 2,
    achievement_count: 1,
  },
}

export type DummyCourseCard = {
  id: string
  title?: string
  name?: string
  code?: string
  slug?: string
  description?: string
  difficulty_level?: string
  media_resources?: { course_image_url?: string }
  pricing?: Record<string, unknown>
  available_durations?: Array<{
    id?: string
    code?: string
    name?: string
    duration_months?: number
  }>
}

export type DummyBranch = NonNullable<PartnerOrgLanding["branches"]>[number]

export type DummyCourseDetail = DummyCourseCard & {
  long_description?: string
  who_is_it_for?: string
  what_you_learn?: string[]
  schedule_note?: string
  benefits?: string[]
  gallery?: string[]
}

/** Extra detail content keyed by course slug (TEMP). */
const DUMMY_COURSE_DETAILS: Record<string, Omit<DummyCourseDetail, keyof DummyCourseCard> & Partial<DummyCourseCard>> = {
  "kids-karate-foundations": {
    long_description:
      "A structured beginner karate pathway designed for children. Sessions blend warm-ups, fundamental strikes and blocks, basic kata, and games that reinforce focus and respect. Parents can watch from the viewing area.",
    who_is_it_for: "Kids aged 5–12, beginners welcome. No prior martial arts experience required.",
    what_you_learn: [
      "Basic stances, punches, and blocks",
      "Introductory kata patterns",
      "Listening skills and dojo etiquette",
      "Light partner drills with safety gear",
    ],
    schedule_note: "Weekday evenings and Saturday mornings — exact slots confirmed at the branch.",
    benefits: [
      "Builds confidence and discipline",
      "Improves coordination and fitness",
      "Safe, coach-supervised classes",
    ],
    gallery: [
      "/assets/img/glry_img1.jpg",
      "/assets/img/glry_img2.jpg",
      "/assets/img/courses/choose_img1.png",
    ],
  },
  "taekwondo-sparring": {
    long_description:
      "Intermediate taekwondo focused on kicking mechanics, pad combinations, and controlled sparring. Ideal for students aiming for fitness or competition pathways.",
    who_is_it_for: "Teens and adults with basic kicking experience, or motivated beginners ready for a challenge.",
    what_you_learn: [
      "Dynamic kicking combinations",
      "Pad work and conditioning",
      "Controlled Olympic-style sparring",
      "Competition etiquette basics",
    ],
    schedule_note: "Evening batches Mon/Wed/Fri; open mat Saturdays.",
    benefits: [
      "Explosive fitness",
      "Technical kicking progress",
      "Pathway to local competitions",
    ],
    gallery: [
      "/assets/img/courses/takewondo_trainer.png",
      "/assets/img/glry_img3.jpg",
      "/assets/img/class_img.png",
    ],
  },
  "womens-self-defense": {
    long_description:
      "Practical self-defense for everyday scenarios — awareness, verbal boundaries, escapes, and simple striking. Supportive coaching with no pressure to spar hard.",
    who_is_it_for: "Women and girls 14+, all fitness levels. Beginners encouraged.",
    what_you_learn: [
      "Situational awareness",
      "Escape from common grabs",
      "Palm strikes and knee defenses",
      "Group safety drills",
    ],
    schedule_note: "Weekend intensives and weekday evening options.",
    benefits: [
      "Real-world skills",
      "Confidence under pressure",
      "Inclusive training space",
    ],
    gallery: [
      "/assets/img/courses/tr_yourself.png",
      "/assets/img/glry_img4.jpg",
      "/assets/img/about-img.png",
    ],
  },
  "kung-fu-forms": {
    long_description:
      "Traditional kung fu forms with stance work, flow drills, and light conditioning. Emphasis on posture, breath, and clean technique.",
    who_is_it_for: "Teens and adults seeking traditional training and mindful movement.",
    what_you_learn: [
      "Foundational stances",
      "Core forms sequences",
      "Breath and timing",
      "Partner flow drills",
    ],
    schedule_note: "Tue/Thu evenings; optional Sunday form clinic.",
    benefits: [
      "Balance and flexibility",
      "Mental focus",
      "Traditional curriculum",
    ],
    gallery: [
      "/assets/img/courses/kung-fu-trainer.png",
      "/assets/img/glry_img5.jpg",
      "/assets/img/glry_img6.jpg",
    ],
  },
}

function norm(v: string): string {
  return decodeURIComponent(v || "").trim().toLowerCase()
}

export function getDummyPartnerLanding(slug: string): PartnerOrgLanding | null {
  return DUMMY_PARTNER_LANDINGS[norm(slug)] || null
}

export function getDummyBranch(
  orgSlug: string,
  branchKey: string
): { org: PartnerOrgLanding; branch: DummyBranch } | null {
  const org = getDummyPartnerLanding(orgSlug)
  if (!org?.branches?.length) return null
  const key = norm(branchKey)
  const branch = org.branches.find(
    (b) =>
      norm(String(b.slug || "")) === key ||
      norm(String(b.id || "")) === key ||
      norm(String(b.code || "")) === key
  )
  if (!branch) return null
  return { org, branch }
}

export function getDummyCourseDetail(
  orgSlug: string,
  branchKey: string,
  courseKey: string
): {
  org: PartnerOrgLanding
  branch: DummyBranch
  course: DummyCourseDetail
} | null {
  const found = getDummyBranch(orgSlug, branchKey)
  if (!found) return null
  const { org, branch } = found
  const key = norm(courseKey)
  const courses = (branch.courses || []) as DummyCourseCard[]
  const base = courses.find(
    (c) =>
      norm(String(c.slug || "")) === key ||
      norm(String(c.id || "")) === key ||
      norm(String(c.code || "")) === key
  )
  if (!base) return null
  const extra = DUMMY_COURSE_DETAILS[norm(String(base.slug || ""))] || {}
  return {
    org,
    branch,
    course: { ...base, ...extra },
  }
}

export function filterDummyPartnerDirectory(q?: string): PartnerOrgDirectoryItem[] {
  const needle = (q || "").trim().toLowerCase()
  if (!needle) return DUMMY_PARTNER_DIRECTORY
  return DUMMY_PARTNER_DIRECTORY.filter((p) => {
    const hay = [p.name, p.address, p.tagline, p.short_description, p.slug]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return hay.includes(needle)
  })
}
