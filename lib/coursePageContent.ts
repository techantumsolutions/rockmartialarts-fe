/**
 * Shared CMS / public course detail page_content shape.
 * Stored on MongoDB courses.page_content (schemaless Dict) — keep additive & backward compatible.
 */

export type CourseLayoutVariant = "standard" | "goal_based" | "heritage"

export type CourseSectionKey =
  | "hero"
  | "info_bar"
  | "about"
  | "cta"
  | "course_info_sections"
  | "course_content"
  | "benefits"
  | "learning"
  | "learn_cards"
  | "who_can_join"
  | "training_programs"
  | "why_rmaa"
  | "lineage"
  | "philosophy"
  | "qualities"
  | "sport_spotlight"
  | "style_cards"
  | "gallery"
  | "instructors"
  | "testimonials"
  | "attachments"
  | "final_cta"

export type SectionHeading = { sub?: string; title?: string }

export type HeroFeatureIcon = {
  label: string
  icon?: string
  image?: string
}

export type HeroCta = {
  label?: string
  link?: string
  /** primary | secondary | outline */
  variant?: "primary" | "secondary" | "outline"
}

export type LearnCard = {
  title: string
  subtitle?: string
  description?: string
  image?: string
  icon?: string
  bullet_points?: string[]
}

export type WhoCanJoinContent = {
  title?: string
  items?: string[]
  note?: string
}

export type TrainingProgramCard = {
  title: string
  subtitle?: string
  description?: string
  image?: string
  icon?: string
  bullet_points?: string[]
  schedule_label?: string
  duration_label?: string
  /** regular | professional | goal */
  kind?: string
}

export type WhyRmaaContent = {
  title?: string
  body?: string
  items?: string[]
  icon?: string
}

export type LineageContent = {
  title?: string
  body?: string
  image?: string
  founder_name?: string
  founder_title?: string
}

export type PhilosophyPillar = {
  title: string
  description?: string
  icon?: string
}

export type QualityItem = {
  title: string
  description?: string
  icon?: string
  /** Optional photo — larger warrior tiles on the public course page */
  image?: string
}

export type SportSpotlightContent = {
  title?: string
  body?: string
  image?: string
}

export type StyleCard = {
  title: string
  image?: string
  description?: string
}

export type FinalCtaContent = {
  headline?: string
  tagline?: string
  background_image?: string
  primary_cta_text?: string
  primary_cta_link?: string
  show_add_to_cart?: boolean
  show_view_all?: boolean
}

export type CourseInfoSection = {
  title?: string
  content?: string
  bullet_points?: string[]
  image?: string
  layout?: "image_left" | "image_right"
}

export interface PageContent {
  layout_variant?: CourseLayoutVariant
  /**
   * Controls which sections are visible on the public course detail page.
   * Default: any key not explicitly false is treated as enabled.
   */
  section_visibility?: Partial<Record<CourseSectionKey, boolean>>
  hero_section?: {
    title?: string
    subtitle?: string
    description?: string
    hero_image?: string
    cta_text?: string
    cta_link?: string
    feature_icons?: HeroFeatureIcon[]
    secondary_ctas?: HeroCta[]
  }
  course_info?: {
    location?: string
    duration?: string
    price?: string
    training_time?: string
  }
  course_info_sections?: CourseInfoSection[]
  about_section?: {
    title?: string
    aboutTitle?: string
    description?: string
    aboutDescription?: string
    secondary_description?: string
    image1?: string
    image2?: string
    content_blocks?: unknown[]
  }
  benefits?: { title: string; description: string; icon?: string }[]
  learning_section?: {
    title?: string
    description?: string
    video_url?: string
    thumbnail?: string
  }
  learn_cards?: LearnCard[]
  who_can_join?: WhoCanJoinContent
  training_programs?: TrainingProgramCard[]
  why_rmaa?: WhyRmaaContent
  lineage?: LineageContent
  philosophy_pillars?: PhilosophyPillar[]
  qualities?: QualityItem[]
  sport_spotlight?: SportSpotlightContent
  style_cards?: StyleCard[]
  gallery_images?: string[]
  instructors?: {
    name: string
    designation: string
    bio?: string
    photo?: string
  }[]
  testimonials?: {
    name: string
    designation: string
    text: string
    photo?: string
  }[]
  pdf_attachments?: { title: string; file_url: string }[]
  section_headings?: Partial<{
    benefits: SectionHeading
    learning: SectionHeading
    learn_cards: SectionHeading
    who_can_join: SectionHeading
    training_programs: SectionHeading
    why_rmaa: SectionHeading
    gallery: SectionHeading
    instructors: SectionHeading
    testimonials: SectionHeading
    attachments: SectionHeading
    course_content: SectionHeading
    lineage: SectionHeading
    philosophy: SectionHeading
    qualities: SectionHeading
    sport_spotlight: SectionHeading
    style_cards: SectionHeading
  }>
  cta_section?: { headline?: string }
  final_cta?: FinalCtaContent
}

export const LAYOUT_VARIANT_OPTIONS: {
  value: CourseLayoutVariant
  label: string
  hint: string
}[] = [
  {
    value: "standard",
    label: "Standard Training",
    hint: "Badminton, Boxing, Silambam, Kuchipudi, Kickboxing, Taekwondo, Western Dance",
  },
  {
    value: "goal_based",
    label: "Goal-Based Programs",
    hint: "Yoga, Gym — multi goal program cards",
  },
  {
    value: "heritage",
    label: "Editorial / Heritage",
    hint: "Shaolin — lineage, philosophy, qualities",
  },
]

export function isSectionEnabled(
  visibility: PageContent["section_visibility"] | undefined,
  key: CourseSectionKey
): boolean {
  return visibility?.[key] !== false
}

/** Sections that appear on the public course page for each layout variant. */
export const COURSE_SECTIONS_BY_LAYOUT: Record<
  CourseLayoutVariant,
  { key: CourseSectionKey; label: string }[]
> = {
  standard: [
    { key: "hero", label: "Hero Section" },
    { key: "info_bar", label: "Info Bar (location / duration / price / timings)" },
    { key: "about", label: "About Course" },
    { key: "learn_cards", label: "What You'll Learn Cards" },
    { key: "who_can_join", label: "Who Can Join" },
    { key: "course_info_sections", label: "Course Info Blocks" },
    { key: "course_content", label: "Syllabus / Equipment" },
    { key: "benefits", label: "Benefits" },
    { key: "why_rmaa", label: "Why Learn at RMAA" },
    { key: "learning", label: "Learning Video" },
    { key: "gallery", label: "Gallery" },
    { key: "instructors", label: "Instructors" },
    { key: "testimonials", label: "Testimonials" },
    { key: "attachments", label: "Downloads / PDFs" },
    { key: "final_cta", label: "Final Journey CTA" },
  ],
  goal_based: [
    { key: "hero", label: "Hero Section" },
    { key: "info_bar", label: "Info Bar (location / duration / price / timings)" },
    { key: "about", label: "About Course" },
    { key: "learn_cards", label: "What You'll Get Cards" },
    { key: "who_can_join", label: "Who Can Join" },
    { key: "training_programs", label: "Training Programs" },
    { key: "benefits", label: "Benefits" },
    { key: "learning", label: "Learning Video" },
    { key: "gallery", label: "Gallery" },
    { key: "instructors", label: "Instructors" },
    { key: "testimonials", label: "Testimonials" },
    { key: "final_cta", label: "Final Journey CTA" },
  ],
  heritage: [
    { key: "hero", label: "Hero Section" },
    { key: "info_bar", label: "Info Bar (location / duration / price / timings)" },
    { key: "about", label: "About Course" },
    { key: "lineage", label: "Lineage" },
    { key: "philosophy", label: "Philosophy Pillars" },
    { key: "qualities", label: "Warrior Qualities" },
    { key: "learn_cards", label: "What You'll Learn Cards" },
    { key: "who_can_join", label: "Who Can Join" },
    { key: "gallery", label: "Gallery" },
    { key: "instructors", label: "Instructors" },
    { key: "testimonials", label: "Testimonials" },
    { key: "final_cta", label: "Final Journey CTA" },
  ],
}
