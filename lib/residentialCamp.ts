export type CampLabelValue = {
  label: string
  value: string
}

export type CampIconCard = {
  icon: string
  icon_image?: string | null
  title: string
  text: string
  /** When false, card is hidden on the public page. Omitted/true = shown. */
  enabled?: boolean
}

export type CampTrainingCard = {
  title: string
  description?: string
  image?: string | null
  bullets: string[]
  /** When false, card is hidden on the public page. Omitted/true = shown. */
  enabled?: boolean
}

export type CampTimelineItem = {
  time_label: string
  title: string
  text: string
}

export type ResidentialCampNav = {
  logo?: string | null
  brand_prefix: string
  brand_accent: string
  link_home?: string
  link_camp: string
  link_training: string
  link_schedule: string
  /** Levels / training-for-every-level banner. */
  link_levels?: string
  /** Journey CTA banner above footer. */
  link_journey?: string
  /** @deprecated Camp discipline section removed; kept for older CMS saves. */
  link_rules?: string
  link_register: string
  mobile_register_label: string
}

export type ResidentialCampHero = {
  hero_image?: string | null
  /** @deprecated Prefer eyebrow_part1/2/3; kept for backward-compatible saves. */
  eyebrow: string
  /** Top banner words, shown as PART1 • PART2 • PART3 */
  eyebrow_part1?: string
  eyebrow_part2?: string
  eyebrow_part3?: string
  h1_line1: string
  h1_line2: string
  h2: string
  paragraph: string
  cta_primary_label: string
  cta_whatsapp_label: string
  whatsapp_url: string
  /** @deprecated Right-side hero lines removed; kept for older CMS saves. */
  side_lines?: string[]
  /** When false, JOIN NOW is hidden. Omitted/true = shown. */
  cta_primary_enabled?: boolean
  /** When false, BOOK A TRIAL CLASS is hidden. Omitted/true = shown. */
  cta_secondary_enabled?: boolean
  /** Bottom-left calligraphy (e.g. Chinese characters). */
  calligraphy_text?: string
  /** Quote line under calligraphy. */
  quote_text?: string
  /** Quote attribution (e.g. Deva). */
  quote_author?: string
}

export type CampLevelCard = {
  title: string
  description: string
  color: string
  enabled?: boolean
}

export type CampLevelPanel = {
  title: string
  description: string
  bullets: string[]
  cta_label: string
  cta_href: string
  /** When false, CTA button is hidden. Omitted/true = shown. */
  cta_enabled?: boolean
  /** When true, CTA opens the registration modal instead of navigating. */
  cta_opens_register?: boolean
  enabled?: boolean
}

export type CampMasterProfile = {
  title: string
  name: string
  designation: string
  description: string
  quote: string
  image?: string | null
  /** When false, column is hidden. Omitted/true = shown. */
  enabled?: boolean
}

export type ResidentialCampPrice = {
  label: string
  amount: string
  includes_text: string
  pay_now_title: string
  pay_now_subtitle: string
  refund_label: string
  refund_text: string
  cta_label: string
}

export type CampFeatureBarItem = {
  label: string
  icon_image?: string | null
  /** Built-in icon when no upload: fitness | discipline | confidence | training | lifestyle */
  icon_key?: string
  enabled?: boolean
}

export type ResidentialCampContent = {
  id?: string
  event_id?: string
  event_name?: string
  start_date?: string
  end_date?: string
  min_age?: string
  max_age?: string
  camp_fee?: string
  event_location?: string
  meta_title: string
  meta_description: string
  topbar_text: string
  nav: ResidentialCampNav
  hero: ResidentialCampHero
  facts: CampLabelValue[]
  /** Icon + label strip directly under the hero banner. */
  feature_bar?: CampFeatureBarItem[]
  camp: {
    kicker: string
    h2: string
    lead: string
    paragraph_1?: string
    paragraph_2?: string
    cta_label?: string
    cta_href?: string
    cta_enabled?: boolean
    about_image?: string
    cards: CampIconCard[]
  }
  training: {
    kicker: string
    h2: string
    enabled?: boolean
    cards: CampTrainingCard[]
  }
  schedule: {
    kicker: string
    h2: string
    masters?: CampMasterProfile[]
    timeline: CampTimelineItem[]
    price: ResidentialCampPrice
  }
  rules?: {
    kicker: string
    h2: string
    rules: string[]
  }
  levels?: {
    enabled?: boolean
    background_image?: string
    h2: string
    cards: CampLevelCard[]
    panels: CampLevelPanel[]
  }
  /** Full-bleed CTA banner above the footer (no FAQ). */
  journey_cta?: {
    enabled?: boolean
    background_image?: string
    title_line1: string
    title_line2: string
    description: string
    cta_primary_label: string
    cta_primary_enabled?: boolean
    cta_primary_opens_register?: boolean
    cta_primary_href?: string
    cta_secondary_label: string
    cta_secondary_enabled?: boolean
    cta_secondary_href?: string
  }
  register: {
    kicker: string
    h2: string
    paragraph: string
    call_label: string
    phone: string
    whatsapp_register_label: string
    whatsapp_url: string
  }
  footer: {
    academy_name: string
    tagline: string
    camp_line: string
    logo?: string | null
    /** Short description next to logo (max 60 chars). Falls back to tagline. */
    description?: string
    social_instagram_url?: string
    social_instagram_icon?: string | null
    social_youtube_url?: string
    social_youtube_icon?: string | null
    social_facebook_url?: string
    social_facebook_icon?: string | null
    cta_label?: string
    cta_href?: string
    cta_enabled?: boolean
    cta_opens_register?: boolean
  }
}

export const DEFAULT_RESIDENTIAL_CAMP: ResidentialCampContent = {
  event_id: "",
  event_name: "Dussehra Special – Shaolin Kungfu Residential Camp",
  start_date: "",
  end_date: "",
  min_age: "",
  max_age: "",
  camp_fee: "",
  event_location: "",
  meta_title: "Shaolin Kungfu Residential Camp | Rock Martial Arts Academy",
  meta_description:
    "Shaolin Kungfu Residential Camp by Rock Martial Arts Academy. 22–26 September 2026, Hyderabad. Age 6–15. Camp fee ₹15,000.",
  topbar_text: "LIMITED SEATS • 22–26 SEPTEMBER 2026 • HYDERABAD",
  nav: {
    logo: "",
    brand_prefix: "ROCK",
    brand_accent: "MARTIAL ARTS ACADEMY",
    link_home: "Home",
    link_camp: "About",
    link_training: "Training",
    link_schedule: "Masters",
    link_levels: "Levels",
    link_journey: "Journey",
    link_register: "Register Now",
    mobile_register_label: "Register Now",
  },
  hero: {
    hero_image: "",
    eyebrow: "TRADITIONAL • AUTHENTIC • TRANSFORMATIVE",
    eyebrow_part1: "TRADITIONAL",
    eyebrow_part2: "AUTHENTIC",
    eyebrow_part3: "TRANSFORMATIVE",
    h1_line1: "Shaolin",
    h1_line2: "Kung Fu",
    h2: "Train your body. Train your mind. Build your warrior spirit.",
    paragraph:
      "Authentic Shaolin Kung Fu training in Hyderabad at Rock Martial Arts Academy.",
    cta_primary_label: "Join Now",
    cta_whatsapp_label: "Book a Trial Class",
    whatsapp_url: "https://wa.me/918179941226",
    cta_primary_enabled: true,
    cta_secondary_enabled: true,
    calligraphy_text: "少林功夫",
    quote_text: "Not a fighter, a warrior.",
    quote_author: "Deva",
  },
  facts: [
    { label: "Dates", value: "22–26 Sep 2026" },
    { label: "Location", value: "Hyderabad" },
    { label: "Age Group", value: "6–15 Years" },
    { label: "Camp Fee", value: "₹15,000/-" },
  ],
  feature_bar: [
    {
      label: "Physical Fitness",
      icon_key: "fitness",
      icon_image: "/campaign/f1.png",
      enabled: true,
    },
    {
      label: "Mental Discipline",
      icon_key: "discipline",
      icon_image: "/campaign/f2.png",
      enabled: true,
    },
    {
      label: "Self Confidence",
      icon_key: "confidence",
      icon_image: "/campaign/f3.png",
      enabled: true,
    },
    {
      label: "Traditional Training",
      icon_key: "training",
      icon_image: "/campaign/f4.png",
      enabled: true,
    },
    {
      label: "Better Lifestyle",
      icon_key: "lifestyle",
      icon_image: "/campaign/f5.png",
      enabled: true,
    },
  ],
  camp: {
    kicker: "ABOUT",
    h2: "SHAOLIN KUNG FU",
    lead: "The Shaolin Kungfu Residential Camp at Rock Martial Arts Academy is an immersive experience of training, discipline, teamwork, self-control and personal transformation.",
    paragraph_1:
      "Shaolin Kung Fu is a traditional Chinese martial art that combines physical training, martial techniques, flexibility, discipline and mental focus. It is more than fighting – it is a way of life.",
    paragraph_2:
      "At Rock Martial Arts Academy, we offer structured and authentic Shaolin Kung Fu training for children, teenagers and adults, helping them develop strength, character and a positive mindset.",
    cta_label: "LEARN MORE",
    cta_href: "#training",
    cta_enabled: true,
    about_image: "/campaign/aboutsection.png",
    cards: [
      {
        icon: "🥋",
        title: "Shaolin Kungfu",
        text: "Stances, punches, kicks, blocks, footwork, traditional forms and conditioning.",
      },
      {
        icon: "⚔️",
        title: "Martial Arts",
        text: "Combat drills, partner work, pad training, self-defense, reaction, speed and agility.",
      },
      {
        icon: "🧘",
        title: "Mind & Discipline",
        text: "Focus, self-control, meditation, teamwork and a stronger warrior mindset.",
      },
    ],
  },
  training: {
    kicker: "What you will learn",
    h2: "OUR TRAINING PROGRAM",
    enabled: true,
    cards: [
      {
        title: "SHAOLIN FORMS",
        description: "Traditional hand forms, stances and techniques.",
        image: "/campaign/t1.png",
        bullets: [],
        enabled: true,
      },
      {
        title: "WEAPONS TRAINING",
        description: "Learn traditional Shaolin weapons like staff, spear, etc.",
        image: "/campaign/t2.png",
        bullets: [],
        enabled: true,
      },
      {
        title: "FLEXIBILITY & MOBILITY",
        description: "Improve flexibility, balance and body control.",
        image: "/campaign/t3.png",
        bullets: [],
        enabled: true,
      },
      {
        title: "STRENGTH & CONDITIONING",
        description: "Build functional strength, stamina and endurance.",
        image: "/campaign/t4.png",
        bullets: [],
        enabled: true,
      },
      {
        title: "COMBAT TRAINING",
        description: "Practical application through drills and partner training.",
        image: "/campaign/t5.png",
        bullets: [],
        enabled: true,
      },
      {
        title: "DISCIPLINE & MINDSET",
        description: "Develop patience, focus and a warrior mindset.",
        image: "/campaign/t6.png",
        bullets: [],
        enabled: true,
      },
    ],
  },
  schedule: {
    kicker: "Daily routine",
    h2: "Train with purpose",
    masters: [
      {
        title: "OUR SHAOLIN LINEAGE",
        name: "MASTER DEVARAJU",
        designation: "Founder & Master Coach",
        description:
          "Deva is a dedicated Shaolin Kung Fu practitioner and coach, known for his discipline, strength and traditional training approach. He focuses on building strong fundamentals, mental toughness and authentic Shaolin values in every student.",
        quote: "NOT A FIGHTER, A WARRIOR.",
        image: "/campaign/master1.png",
        enabled: true,
      },
      {
        title: "MEET YOUR MASTER",
        name: "MASTER JANARDHAN",
        designation: "16th Generation Shaolin Disciple | Founder - Rock Martial Arts Academy",
        description:
          "Master Janardhan is a 16th Generation Shaolin Disciple and the Founder of Rock Martial Arts Academy. With years of dedicated training and teaching experience, he specialises in traditional Shaolin Kung Fu, discipline-based coaching and holistic martial arts development for students of all ages.",
        quote: "NOT A FIGHTER, A WARRIOR.",
        image: "/campaign/master2.png",
        enabled: true,
      },
    ],
    timeline: [
      {
        time_label: "Morning Session",
        title: "Physical conditioning & Shaolin practice",
        text: "Warm-up, mobility, conditioning and technical training.",
      },
      {
        time_label: "Day Session",
        title: "Skills, forms & guided activities",
        text: "Traditional forms, partner drills, teamwork and learning activities.",
      },
      {
        time_label: "Evening Session",
        title: "Martial arts practice & recovery",
        text: "Technique refinement, controlled drills, stretching and recovery.",
      },
      {
        time_label: "Note",
        title: "Final camp timetable",
        text: "The exact daily timetable will be shared with registered participants before camp.",
      },
    ],
    price: {
      label: "FULL CAMP FEE",
      amount: "₹15,000",
      includes_text: "Includes residential stay, food & training.",
      pay_now_title: "Pay ₹7,500 now",
      pay_now_subtitle: "Balance ₹7,500 payable after reaching the camp location.",
      refund_label: "Refund policy:",
      refund_text: "Registration/payment is non-refundable once confirmed.",
      cta_label: "Secure Your Seat",
    },
  },
  levels: {
    enabled: true,
    background_image: "/campaign/levelbg.png",
    h2: "TRAINING FOR EVERY LEVEL",
    cards: [
      {
        title: "BEGINNER",
        description: "Learn the fundamentals. No experience needed.",
        color: "#8f9a3a",
        enabled: true,
      },
      {
        title: "INTERMEDIATE",
        description: "Develop your techniques and skills.",
        color: "#1f4d36",
        enabled: true,
      },
      {
        title: "ADVANCED",
        description: "For dedicated students seeking deeper training.",
        color: "#b85a28",
        enabled: true,
      },
      {
        title: "PROFESSIONAL PLAYER TRAINING",
        description: "Intensive training for demonstrations, tournaments and advanced development.",
        color: "#8b1a1a",
        enabled: true,
      },
    ],
    panels: [
      {
        title: "SHAOLIN FOR CHILDREN",
        description:
          "Help your child grow with discipline, confidence and focus through Shaolin Kung Fu training.",
        bullets: ["Fitness & flexibility", "Discipline & respect", "Confidence & self-control"],
        cta_label: "ENROLL YOUR CHILD",
        cta_href: "#register",
        cta_enabled: true,
        cta_opens_register: true,
        enabled: true,
      },
      {
        title: "RESIDENTIAL CAMPS",
        description: "Experience intensive Shaolin Kung Fu training in our special residential camps.",
        bullets: [
          "Intensive training",
          "Weapons practice",
          "Discipline and routine",
          "Group activities & more",
        ],
        cta_label: "VIEW UPCOMING CAMPS",
        cta_href: "#camp",
        cta_enabled: true,
        cta_opens_register: false,
        enabled: true,
      },
    ],
  },
  journey_cta: {
    enabled: true,
    background_image: "/campaign/ctabg.png",
    title_line1: "START YOUR",
    title_line2: "SHAOLIN JOURNEY TODAY",
    description: "A STRONGER BODY. A CALMER MIND. A BRIGHTER FUTURE.",
    cta_primary_label: "REGISTER NOW",
    cta_primary_enabled: true,
    cta_primary_opens_register: true,
    cta_primary_href: "#register",
    cta_secondary_label: "BOOK A TRIAL CLASS",
    cta_secondary_enabled: true,
    cta_secondary_href: "https://wa.me/918179941226",
  },
  register: {
    kicker: "Ready to begin?",
    h2: "Build the warrior within.",
    paragraph:
      "Limited seats available. Book your place for the Shaolin Kungfu Residential Camp with Rock Martial Arts Academy.",
    call_label: "Call 8179941226",
    phone: "8179941226",
    whatsapp_register_label: "Register on WhatsApp",
    whatsapp_url: "https://wa.me/918179941226",
  },
  footer: {
    academy_name: "ROCK MARTIAL ARTS ACADEMY",
    tagline: "Become the Strongest Version of Yourself",
    camp_line: "Shaolin Kungfu Residential Camp • Hyderabad • 22–26 September 2026",
    logo: "",
    description: "Become the Strongest Version of Yourself",
    social_instagram_url: "",
    social_instagram_icon: "",
    social_youtube_url: "",
    social_youtube_icon: "",
    social_facebook_url: "",
    social_facebook_icon: "",
    cta_label: "ENQUIRE NOW",
    cta_href: "#register",
    cta_enabled: true,
    cta_opens_register: true,
  },
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function mergeDeep<T>(base: T, patch: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(patch) ? patch : base) as T
  }
  if (!isPlainObject(base)) {
    if (patch === undefined || patch === null || patch === "") return base
    return patch as T
  }
  const source = isPlainObject(patch) ? patch : {}
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const key of Object.keys(base as Record<string, unknown>)) {
    out[key] = mergeDeep((base as Record<string, unknown>)[key], source[key])
  }
  for (const key of Object.keys(source)) {
    if (!(key in out)) out[key] = source[key]
  }
  return out as T
}

export function mergeResidentialCamp(raw: unknown): ResidentialCampContent {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_RESIDENTIAL_CAMP }
  }
  const merged = mergeDeep(DEFAULT_RESIDENTIAL_CAMP, raw)
  const featureBarSource =
    merged.feature_bar && merged.feature_bar.length > 0
      ? merged.feature_bar
      : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []
  const defaultFeatureByLabel = new Map(
    (DEFAULT_RESIDENTIAL_CAMP.feature_bar || [])
      .filter((c) => (c.icon_image || "").trim())
      .map((c) => [(c.label || "").trim().toLowerCase(), (c.icon_image || "").trim()] as const)
  )
  const feature_bar = featureBarSource.map((item) => {
    if ((item.icon_image || "").trim()) return item
    const labelKey = (item.label || "").trim().toLowerCase()
    const fromDefault = labelKey ? defaultFeatureByLabel.get(labelKey) : ""
    if (fromDefault) return { ...item, icon_image: fromDefault }
    return item
  })
  const linkCamp = (merged.nav?.link_camp || "").trim()
  const nav = {
    ...merged.nav,
    link_camp: !linkCamp || /^camp$/i.test(linkCamp) ? "About" : linkCamp,
  }
  const defaultTrainingByTitle = new Map(
    DEFAULT_RESIDENTIAL_CAMP.training.cards
      .filter((c) => (c.image || "").trim())
      .map((c) => [(c.title || "").trim().toLowerCase(), (c.image || "").trim()] as const)
  )
  const trainingCards = (merged.training?.cards || []).map((card) => {
    if ((card.image || "").trim()) return card
    const titleKey = (card.title || "").trim().toLowerCase()
    const fromDefault = titleKey ? defaultTrainingByTitle.get(titleKey) : ""
    if (fromDefault) return { ...card, image: fromDefault }
    return card
  })
  return {
    ...merged,
    facts: syncedCampFacts(merged),
    feature_bar,
    nav,
    training: { ...merged.training, cards: trainingCards },
  }
}

/** Banner eyebrow as PART1 • PART2 • PART3 (falls back to legacy eyebrow). */
export function formatHeroEyebrow(hero: ResidentialCampHero): string {
  const parts = [hero.eyebrow_part1, hero.eyebrow_part2, hero.eyebrow_part3]
    .map((p) => (p || "").trim())
    .filter(Boolean)
  if (parts.length) return parts.join(" • ")
  return (hero.eyebrow || "").trim()
}

/** Keep legacy `eyebrow` in sync when the three parts change. */
export function withSyncedHeroEyebrow(
  hero: ResidentialCampHero,
  patch: Partial<ResidentialCampHero> = {}
): ResidentialCampHero {
  const next = { ...hero, ...patch }
  next.eyebrow = formatHeroEyebrow(next)
  return next
}

function formatIsoDate(iso: string): string {
  const value = (iso || "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return ""
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function formatCampDateRange(start?: string, end?: string): string {
  const from = formatIsoDate(start || "")
  const to = formatIsoDate(end || "")
  if (from && to) return `${from} – ${to}`
  return from || to
}

const MONTH_INDEX: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
}

export function parseFactDateRange(value: string): { start: string; end: string } {
  const m = (value || "").match(/(\d{1,2})\s*[–-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) return { start: "", end: "" }
  const month = MONTH_INDEX[m[3].slice(0, 3).toLowerCase()]
  if (!month) return { start: "", end: "" }
  const pad = (n: string) => n.padStart(2, "0")
  return { start: `${m[4]}-${month}-${pad(m[1])}`, end: `${m[4]}-${month}-${pad(m[2])}` }
}

export function formatCampAgeGroup(minAge?: string, maxAge?: string): string {
  const min = (minAge || "").trim()
  const max = (maxAge || "").trim()
  if (min && max) return `${min}–${max} Years`
  if (min) return `${min}+ Years`
  if (max) return `Up to ${max} Years`
  return ""
}

const CAMP_FACT_SLOTS: { key: "dates" | "location" | "age_group" | "camp_fee"; label: string }[] = [
  { key: "dates", label: "Dates" },
  { key: "location", label: "Location" },
  { key: "age_group", label: "Age Group" },
  { key: "camp_fee", label: "Camp Fee" },
]

function campEventSlotValue(
  content: Pick<ResidentialCampContent, "start_date" | "end_date" | "min_age" | "max_age" | "camp_fee" | "event_location">,
  key: (typeof CAMP_FACT_SLOTS)[number]["key"],
): string {
  if (key === "dates") return formatCampDateRange(content.start_date, content.end_date)
  if (key === "location") return (content.event_location || "").trim()
  if (key === "age_group") return formatCampAgeGroup(content.min_age, content.max_age)
  let fee = (content.camp_fee || "").trim()
  if (fee && !/^₹/.test(fee) && /^\d/.test(fee)) fee = `₹${fee}`
  return fee
}

export function syncedCampFacts(content: ResidentialCampContent): CampLabelValue[] {
  const unused = [...(content.facts || [])]
  return CAMP_FACT_SLOTS.map((slot) => {
    const want = slot.label.toLowerCase()
    let idx = unused.findIndex((f) => (f.label || "").trim().toLowerCase() === want)
    if (idx < 0) idx = unused.length ? 0 : -1
    const src = idx >= 0 ? unused.splice(idx, 1)[0] : { label: slot.label, value: "" }
    return {
      label: slot.label,
      value: campEventSlotValue(content, slot.key) || (src.value || "").trim(),
    }
  })
}

export function applyCampEventDetails(
  content: ResidentialCampContent,
  patch: Partial<Pick<ResidentialCampContent, "event_name" | "start_date" | "end_date" | "min_age" | "max_age" | "camp_fee" | "event_location">>,
): ResidentialCampContent {
  const next: ResidentialCampContent = { ...content, ...patch }
  let fee = (next.camp_fee || "").trim()
  if (fee && !/^₹/.test(fee) && /^\d/.test(fee)) fee = `₹${fee}`
  next.camp_fee = fee
  next.facts = syncedCampFacts(next)
  if (fee) {
    next.schedule = {
      ...next.schedule,
      price: { ...next.schedule.price, amount: fee },
    }
  }
  return next
}

export function campEventPayload(content: ResidentialCampContent) {
  return {
    event_name: content.event_name || "",
    start_date: content.start_date || "",
    end_date: content.end_date || "",
    min_age: content.min_age || "",
    max_age: content.max_age || "",
    camp_fee: content.camp_fee || "",
    event_location: content.event_location || "",
  }
}

export function telHref(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "")
  return digits ? `tel:${digits}` : "tel:8179941226"
}

export function campFactValue(content: ResidentialCampContent, label: string): string {
  const want = label.trim().toLowerCase()
  if (want === "dates") {
    const range = formatCampDateRange(content.start_date, content.end_date)
    if (range) return range
  }
  if (want === "location" && (content.event_location || "").trim()) {
    return (content.event_location || "").trim()
  }
  if (want === "age group") {
    const age = formatCampAgeGroup(content.min_age, content.max_age)
    if (age) return age
  }
  if (want === "camp fee" && (content.camp_fee || "").trim()) {
    return (content.camp_fee || "").trim()
  }
  const hit = (content.facts || []).find((f) => (f.label || "").trim().toLowerCase() === want)
  return (hit?.value || "").trim()
}

export function campFeeDisplay(content: ResidentialCampContent) {
  const price = content.schedule?.price
  const totalText = (content.camp_fee || price?.amount || campFactValue(content, "Camp Fee") || "₹15,000").trim()
  const total = inrAmount(totalText) ?? 15000
  const payNow = Math.round(total / 2)
  const balance = Math.max(0, total - payNow)
  return {
    total: formatInr(total),
    payNow: formatInr(payNow),
    balance: formatInr(balance),
    refundLabel: (price?.refund_label || "Refund policy:").trim(),
    refundText: (price?.refund_text || "Registration/payment is non-refundable once confirmed.").trim(),
  }
}

function inrAmount(text: string): number | null {
  const matches = (text || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/g)
  if (!matches?.length) return null
  const amount = Math.max(...matches.map((n) => Number(n)))
  return Number.isFinite(amount) ? amount : null
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`
}

/**
 * In-page nav + footer links for all public sections except the feature bar.
 * Order: Home → About → Training → Masters → Levels → Journey
 */
export function buildCampNavLinks(nav: ResidentialCampNav): { href: string; label: string }[] {
  const aboutLabel = (() => {
    const raw = (nav.link_camp || "").trim()
    if (!raw || /^camp$/i.test(raw)) return "About"
    return raw
  })()
  const links = [
    { href: "#top", label: (nav.link_home || "Home").trim() },
    { href: "#camp", label: aboutLabel },
    { href: "#training", label: (nav.link_training || "").trim() },
    { href: "#masters", label: (nav.link_schedule || "").trim() },
    { href: "#levels", label: (nav.link_levels || "Levels").trim() },
    { href: "#journey", label: (nav.link_journey || "Journey").trim() },
  ]
  return links.filter((l) => l.label)
}

export function campCardIconImage(card: CampIconCard): string {
  const candidates = [card.icon_image, card.icon]
  for (const raw of candidates) {
    const v = (raw || "").trim()
    if (!v) continue
    if (
      v.startsWith("http://") ||
      v.startsWith("https://") ||
      v.startsWith("/") ||
      v.includes("/uploads/") ||
      /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(v)
    ) {
      return v
    }
  }
  return ""
}

export function featureBarIconImage(item: CampFeatureBarItem, _index?: number): string {
  // Only use an explicit image — never auto-assign campaign fallbacks for new/empty items.
  return (item.icon_image || "").trim()
}

export function trainingCardImage(card: CampTrainingCard, _index?: number): string {
  // Only use an explicit image — never auto-assign campaign fallbacks for new/empty cards.
  return (card.image || "").trim()
}

export function trainingCardDescription(card: CampTrainingCard): string {
  const desc = (card.description || "").trim()
  if (desc) return desc.slice(0, 100)
  const fromBullets = (card.bullets || []).map((b) => b.trim()).filter(Boolean)
  if (fromBullets.length) return fromBullets[0].slice(0, 100)
  return ""
}

const MASTER_FALLBACK_IMAGES = ["/campaign/master1.png", "/campaign/master2.png"] as const

export function masterProfileImage(profile: CampMasterProfile, index: number): string {
  const uploaded = (profile.image || "").trim()
  if (uploaded) return uploaded
  return MASTER_FALLBACK_IMAGES[index % MASTER_FALLBACK_IMAGES.length]
}
