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
  link_camp: string
  link_training: string
  link_schedule: string
  link_register: string
  mobile_register_label: string
}

export type ResidentialCampHero = {
  hero_image?: string | null
  eyebrow: string
  h1_line1: string
  h1_line2: string
  h2: string
  paragraph: string
  cta_primary_label: string
  cta_whatsapp_label: string
  whatsapp_url: string
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
  camp: {
    kicker: string
    h2: string
    lead: string
    cards: CampIconCard[]
  }
  training: {
    kicker: string
    h2: string
    cards: CampTrainingCard[]
  }
  schedule: {
    kicker: string
    h2: string
    timeline: CampTimelineItem[]
    price: ResidentialCampPrice
  }
  rules: {
    kicker: string
    h2: string
    rules: string[]
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
    link_camp: "Camp",
    link_training: "Training",
    link_schedule: "Schedule",
    link_register: "Register",
    mobile_register_label: "Register",
  },
  hero: {
    hero_image: "",
    eyebrow: "5-Day Residential Training",
    h1_line1: "Shaolin",
    h1_line2: "Kungfu",
    h2: "Residential Camp",
    paragraph:
      "Train. Discipline. Transform. Step away from your daily routine and immerse yourself in intensive Shaolin Kungfu training designed to build strength, confidence, focus and a warrior mindset.",
    cta_primary_label: "Register Now →",
    cta_whatsapp_label: "WhatsApp Us",
    whatsapp_url: "https://wa.me/918179941226",
  },
  facts: [
    { label: "Dates", value: "22–26 Sep 2026" },
    { label: "Location", value: "Hyderabad" },
    { label: "Age Group", value: "6–15 Years" },
    { label: "Camp Fee", value: "₹15,000/-" },
  ],
  camp: {
    kicker: "More than training",
    h2: "Experience the Shaolin lifestyle",
    lead: "The Shaolin Kungfu Residential Camp at Rock Martial Arts Academy is an immersive experience of training, discipline, teamwork, self-control and personal transformation.",
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
    h2: "Build skills that stay with you",
    cards: [
      {
        title: "Foundation",
        bullets: ["Basic Shaolin stances", "Punches and strikes", "Kicks and blocks", "Footwork and movement"],
      },
      {
        title: "Traditional Training",
        bullets: [
          "Traditional forms (Taolu)",
          "Advanced forms for eligible students",
          "Balance and coordination",
          "Shaolin conditioning",
        ],
      },
      {
        title: "Personal Development",
        bullets: ["Strength & flexibility", "Self-defense awareness", "Teamwork & leadership", "Focus & confidence"],
      },
    ],
  },
  schedule: {
    kicker: "Daily routine",
    h2: "Train with purpose",
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
  rules: {
    kicker: "Camp discipline",
    h2: "Discipline is part of the training",
    rules: [
      "Respect coaches and fellow participants.",
      "Follow the daily schedule and instructions.",
      "Maintain cleanliness and personal responsibility.",
      "Attend assigned training sessions.",
      "Follow all safety and residential guidelines.",
      "No unauthorized gadgets during designated periods.",
    ],
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
  const merged = mergeDeep(DEFAULT_RESIDENTIAL_CAMP, raw)
  return { ...merged, facts: syncedCampFacts(merged) }
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
