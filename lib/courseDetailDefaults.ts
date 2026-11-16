/**
 * Fallback marketing content for course detail pages when CMS fields are empty.
 * Does not invent purchasable prices — training cards are marketing-only.
 */

import type {
  FinalCtaContent,
  HeroFeatureIcon,
  LearnCard,
  PageContent,
  SportSpotlightContent,
  TrainingProgramCard,
  WhoCanJoinContent,
  WhyRmaaContent,
} from "@/lib/coursePageContent"

/** Curated Unsplash images (stable CDN) used only when course media is missing */
const IMG = {
  heroCombat:
    "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1600&q=80",
  heroDance:
    "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?auto=format&fit=crop&w=1600&q=80",
  heroGym:
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=80",
  punch:
    "https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&w=800&q=80",
  kick:
    "https://images.unsplash.com/photo-1599058945522-28d584b6f14f?auto=format&fit=crop&w=800&q=80",
  spar:
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
  fitness:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
  defense:
    "https://images.unsplash.com/photo-1599058946400-7066f0e04f05?auto=format&fit=crop&w=800&q=80",
  elbow:
    "https://images.unsplash.com/photo-1616279967983-ec413476e824?auto=format&fit=crop&w=800&q=80",
  bag:
    "https://images.unsplash.com/photo-1517438476312-10d79c077509?auto=format&fit=crop&w=1600&q=80",
  dancer:
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
  mudra:
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
  gymnast:
    "https://images.unsplash.com/photo-1623874514711-0f321325f318?auto=format&fit=crop&w=800&q=80",
}

function normalizeKey(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const DEFAULT_WHO: WhoCanJoinContent = {
  title: "Who Can Join?",
  items: [
    "Kids (6+ Years)",
    "Teenagers",
    "Adults",
    "Women",
    "Working Professionals",
    "Seniors",
  ],
  note: "No previous experience required.",
}

const DEFAULT_PROGRAMS: TrainingProgramCard[] = [
  {
    title: "Regular Training",
    kind: "regular",
    bullet_points: [
      "Learn fundamental techniques",
      "Build fitness & coordination",
      "Safe, structured class format",
      "Ideal for beginners & fitness goals",
    ],
    schedule_label: "Mon - Sat",
    duration_label: "1 Hour / Class",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "Professional Training",
    kind: "professional",
    bullet_points: [
      "Advanced technique development",
      "Conditioning & performance focus",
      "Competition / stage preparation",
      "For serious learners & athletes",
    ],
    schedule_label: "Mon - Sat",
    duration_label: "Up to 5 Hours / Day",
    image:
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=400&q=80",
  },
]

const DEFAULT_WHY: WhyRmaaContent = {
  title: "Why Learn at RMAA?",
  body: "Certified coaches, progressive curriculum, and a safe, motivating environment designed for every age and skill level.",
  icon: "★",
}

type CoursePack = {
  subtitle?: string
  feature_icons?: HeroFeatureIcon[]
  learn_cards?: LearnCard[]
  sport?: SportSpotlightContent
  equipment?: string[]
  syllabus?: string[]
  benefits?: { title: string; description?: string }[]
  final_tagline?: string
  hero_fallback?: string
  learn_variant?: "image" | "icon"
  layout_variant?: "standard" | "goal_based" | "heritage"
  /** When true, enable sport_spotlight section */
  show_sport?: boolean
  style_cards?: { title: string; description?: string; image?: string }[]
  training_programs?: TrainingProgramCard[]
}

const PACKS: Record<string, CoursePack> = {
  kickboxing: {
    subtitle: "A modern combat sport for fitness, self-defense & competition",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    feature_icons: [
      { label: "Striking Skills", icon: "🥊" },
      { label: "Full-Body Fitness", icon: "💪" },
      { label: "Self-Defense", icon: "🛡️" },
      { label: "Competition Training", icon: "🏆" },
      { label: "Discipline & Focus", icon: "🎯" },
    ],
    learn_cards: [
      { title: "Punches", description: "Jab, Cross, Hook, Uppercut", image: IMG.punch },
      { title: "Kicks", description: "Front, Roundhouse, Side, Axe", image: IMG.kick },
      { title: "Knees & Elbows", description: "Close-range striking", image: IMG.elbow },
      { title: "Defense", description: "Blocks, slips, footwork", image: IMG.defense },
      { title: "Sparring", description: "Controlled partner drills", image: IMG.spar },
      { title: "Fitness & Conditioning", description: "Strength, stamina, agility", image: IMG.fitness },
    ],
    sport: {
      title: "Kickboxing Sport",
      body: "Kickboxing is practiced worldwide as both a competitive sport and a powerful fitness discipline. At RMAA, training builds striking skill, cardio, and confidence in a structured, coach-led environment.",
      image: IMG.kick,
    },
    syllabus: [
      "Stances & Guard",
      "Punches & Combinations",
      "Kicks & Footwork",
      "Defense & Counters",
      "Pad Work",
      "Sparring Basics",
      "Conditioning",
    ],
    equipment: [
      "Boxing Gloves",
      "Hand Wraps",
      "Mouth Guard",
      "Shin Guards",
      "Sports Wear",
      "Training Shoes",
    ],
    benefits: [
      { title: "Strength & Endurance" },
      { title: "Self-Defense Skills" },
      { title: "Agility & Coordination" },
      { title: "Confidence & Focus" },
      { title: "Stress Relief" },
      { title: "Weight Management" },
    ],
    final_tagline: "GET FIT | LEARN SELF-DEFENSE | BUILD CONFIDENCE | COMPETE & GROW",
    show_sport: true,
  },
  mma: {
    subtitle: "A complete combat system for real-world skills, fitness & competition",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    show_sport: true,
    feature_icons: [
      { label: "Striking", icon: "🥊" },
      { label: "Grappling", icon: "🤼" },
      { label: "Submissions", icon: "🔗" },
      { label: "Fitness & Conditioning", icon: "💪" },
      { label: "Competition Training", icon: "🏆" },
    ],
    learn_cards: [
      { title: "Striking", description: "Punches, kicks, elbows", image: IMG.punch },
      { title: "Takedowns & Wrestling", description: "Clinch and takedowns", image: IMG.spar },
      { title: "Ground Control", description: "Positioning & pressure", image: IMG.defense },
      { title: "Submissions", description: "Locks and finishes", image: IMG.elbow },
      { title: "Defense", description: "Sprawl, guard, escapes", image: IMG.kick },
      { title: "Sparring & Conditioning", description: "Live drills & fitness", image: IMG.fitness },
    ],
    sport: {
      title: "MMA Sport",
      body: "MMA is one of the fastest-growing combat sports worldwide. At RMAA, training blends striking, grappling, and conditioning in a structured, coach-led environment.",
      image: IMG.spar,
    },
    syllabus: [
      "Punches & Kicks",
      "Wrestling Basics",
      "Ground Control",
      "Submissions",
      "Defense",
      "Sparring",
      "Conditioning",
    ],
    equipment: [
      "MMA Gloves",
      "Mouth Guard",
      "Shin Guards",
      "Hand Wraps",
      "Sports Wear",
      "Training Shoes",
    ],
    benefits: [
      { title: "Full-Body Fitness" },
      { title: "Self-Defense Skills" },
      { title: "Strength & Endurance" },
      { title: "Confidence & Focus" },
      { title: "Discipline" },
    ],
    final_tagline: "GET FIT | LEARN REAL SKILLS | BUILD CONFIDENCE | COMPETE & GROW",
  },
  boxing: {
    subtitle: "Power, precision, and ring craft for fitness & self-defense",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    feature_icons: [
      { label: "Punch Technique", icon: "🥊" },
      { label: "Footwork", icon: "👟" },
      { label: "Defense", icon: "🛡️" },
      { label: "Conditioning", icon: "💪" },
      { label: "Ring IQ", icon: "🧠" },
    ],
    learn_cards: [
      { title: "Jab & Cross", description: "Core boxing punches", image: IMG.punch },
      { title: "Hooks & Uppercuts", description: "Power combinations", image: IMG.elbow },
      { title: "Footwork", description: "Angles and movement", image: IMG.fitness },
      { title: "Defense", description: "Blocks, slips, rolls", image: IMG.defense },
      { title: "Pad Work", description: "Coach-led drills", image: IMG.bag },
      { title: "Sparring Basics", description: "Controlled practice", image: IMG.spar },
    ],
    sport: {
      title: "Boxing Sport",
      body: "Boxing develops speed, power, and mental toughness. RMAA classes focus on fundamentals first, then progress to pads, bags, and safe sparring.",
      image: IMG.punch,
    },
    syllabus: ["Stance & Guard", "Punches", "Combinations", "Defense", "Bag Work", "Conditioning"],
    equipment: ["Boxing Gloves", "Hand Wraps", "Mouth Guard", "Sports Wear"],
    benefits: [
      { title: "Strength" },
      { title: "Cardio Fitness" },
      { title: "Coordination" },
      { title: "Confidence" },
    ],
    final_tagline: "TRAIN HARD | STAY FOCUSED | BUILD POWER | GROW CONFIDENT",
  },
  kuchipudi: {
    subtitle: "A classical dance form of India",
    hero_fallback: IMG.heroDance,
    learn_variant: "icon",
    feature_icons: [
      { label: "Tradition", icon: "🪔" },
      { label: "Grace", icon: "✨" },
      { label: "Expression", icon: "🎭" },
      { label: "Discipline", icon: "🎯" },
      { label: "Cultural Heritage", icon: "🏛️" },
    ],
    learn_cards: [
      { title: "Basic Steps (Adavus)", icon: "👣", description: "Foundational footwork" },
      { title: "Hand Gestures (Mudras)", icon: "🖐️", description: "Expressive hand language" },
      { title: "Expressions (Abhinaya)", icon: "😊", description: "Facial storytelling" },
      { title: "Dance Compositions (Nritya)", icon: "💃", description: "Choreographed pieces" },
      { title: "Rhythm & Music (Laya & Tala)", icon: "🥁", description: "Timing and musicality" },
      { title: "Stories & Mythology (Natya)", icon: "📖", description: "Narrative dance" },
    ],
    syllabus: ["Adavus", "Mudras", "Abhinaya", "Nritya", "Tala", "Stage Etiquette"],
    equipment: ["Practice Costume", "Anklets (Ghungroos)", "Hair Accessories", "Make-up Kit"],
    benefits: [
      { title: "Posture & Grace" },
      { title: "Confidence" },
      { title: "Memory & Focus" },
      { title: "Cultural Connection" },
    ],
    final_tagline: "LEARN | EXPRESS | PERFORM | PRESERVE OUR CULTURE",
  },
  gymnastics: {
    subtitle: "Strength, flexibility, balance, and body control",
    hero_fallback: IMG.heroGym,
    learn_variant: "image",
    feature_icons: [
      { label: "Strength", icon: "💪" },
      { label: "Flexibility", icon: "🧘" },
      { label: "Balance", icon: "⚖️" },
      { label: "Coordination", icon: "🎯" },
      { label: "Confidence", icon: "⭐" },
    ],
    learn_cards: [
      { title: "Floor Basics", description: "Rolls, cartwheels, handstands", image: IMG.gymnast },
      { title: "Flexibility", description: "Mobility & stretching", image: IMG.fitness },
      { title: "Strength Drills", description: "Core and bodyweight control", image: IMG.spar },
      { title: "Balance Skills", description: "Stability and posture", image: IMG.defense },
      { title: "Tumbling Intro", description: "Safe progression skills", image: IMG.kick },
      { title: "Conditioning", description: "Endurance for performance", image: IMG.bag },
    ],
    sport: {
      title: "Types of Gymnastics",
      body: "Training covers artistic foundations, tumbling progressions, flexibility, and strength in a supervised academy environment suitable for kids and beginners.",
      image: IMG.gymnast,
    },
    syllabus: ["Warm-up", "Flexibility", "Floor Skills", "Strength", "Balance", "Cool-down"],
    equipment: ["Leotard / Sports Wear", "Grip Aids", "Water Bottle", "Yoga Mat"],
    benefits: [
      { title: "Strength & Muscle Tone" },
      { title: "Mobility & Flexibility" },
      { title: "Balance & Coordination" },
      { title: "Discipline & Confidence" },
    ],
    final_tagline: "MOVE BETTER | GET STRONGER | BUILD CONFIDENCE | HAVE FUN",
  },
  shaolin: {
    subtitle: "More than martial arts. A way of life.",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    layout_variant: "heritage",
    feature_icons: [
      { label: "Forms", icon: "🥋" },
      { label: "Discipline", icon: "🎯" },
      { label: "Strength", icon: "💪" },
      { label: "Focus", icon: "🧠" },
      { label: "Heritage", icon: "🏯" },
    ],
    learn_cards: [
      { title: "Taolu", description: "Traditional Forms", image: IMG.defense },
      { title: "Sanda", description: "Chinese Kickboxing", image: IMG.punch },
      { title: "Weapons Training", description: "Traditional weapons", image: IMG.kick },
      { title: "Meditation", description: "Chan / Zen", image: IMG.bag },
      { title: "Self-Defense", description: "Real-world skills", image: IMG.spar },
      { title: "Conditioning", description: "Strength & flexibility", image: IMG.fitness },
    ],
    syllabus: ["Stances", "Forms", "Kicks", "Applications", "Conditioning", "Etiquette"],
    equipment: ["Training Uniform", "Sash", "Soft Shoes", "Water Bottle"],
    benefits: [
      { title: "Discipline" },
      { title: "Strength" },
      { title: "Focus" },
      { title: "Flexibility" },
    ],
    final_tagline: "BUILD STRENGTH | MASTER YOUR MIND | LIVE THE SHAOLIN WAY",
  },
  silambam: {
    subtitle: "Traditional weapon mastery and martial heritage",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    feature_icons: [
      { label: "Weapon Skill", icon: "🪵" },
      { label: "Footwork", icon: "👟" },
      { label: "Coordination", icon: "🎯" },
      { label: "Heritage", icon: "🏛️" },
      { label: "Fitness", icon: "💪" },
    ],
    learn_cards: [
      { title: "Staff Basics", description: "Grip and swings", image: IMG.defense },
      { title: "Footwork", description: "Angles and timing", image: IMG.fitness },
      { title: "Forms", description: "Traditional patterns", image: IMG.spar },
      { title: "Partner Drills", description: "Safe practice", image: IMG.kick },
      { title: "Conditioning", description: "Strength & stamina", image: IMG.punch },
      { title: "Performance", description: "Precision & flow", image: IMG.bag },
    ],
    syllabus: ["Grip", "Footwork", "Basic Strikes", "Forms", "Partner Work", "Conditioning"],
    equipment: ["Practice Staff", "Sports Wear", "Grip Gloves", "Water Bottle"],
    benefits: [
      { title: "Coordination" },
      { title: "Focus" },
      { title: "Strength" },
      { title: "Cultural Pride" },
    ],
    final_tagline: "LEARN | MASTER | PERFORM | PRESERVE TRADITION",
  },
  taekwondo: {
    subtitle: "Olympic sport of kicks, forms, and discipline",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    feature_icons: [
      { label: "Kicks", icon: "🦵" },
      { label: "Poomsae", icon: "🥋" },
      { label: "Sparring", icon: "🏆" },
      { label: "Fitness", icon: "💪" },
      { label: "Discipline", icon: "🎯" },
    ],
    learn_cards: [
      { title: "Basic Kicks", description: "Front, roundhouse, side", image: IMG.kick },
      { title: "Poomsae", description: "Forms and patterns", image: IMG.defense },
      { title: "Sparring Basics", description: "Controlled contact", image: IMG.spar },
      { title: "Breaking Intro", description: "Focus and power", image: IMG.punch },
      { title: "Footwork", description: "Speed and distance", image: IMG.fitness },
      { title: "Conditioning", description: "Flexibility & stamina", image: IMG.bag },
    ],
    sport: {
      title: "Taekwondo Sport",
      body: "Taekwondo develops dynamic kicking skill, poomsae precision, and sportsmanship. RMAA training supports fitness, belts progression, and competition readiness.",
      image: IMG.kick,
    },
    syllabus: ["Stances", "Kicks", "Poomsae", "Sparring", "Flexibility", "Etiquette"],
    equipment: ["Dobok", "Belt", "Shin Guards", "Mouth Guard", "Sports Shoes"],
    benefits: [
      { title: "Flexibility" },
      { title: "Confidence" },
      { title: "Fitness" },
      { title: "Self-Defense" },
    ],
    final_tagline: "KICK HIGHER | STAY FOCUSED | BUILD DISCIPLINE | COMPETE READY",
  },
  "western dance": {
    subtitle: "Express • Move • Be Fit • Be Confident",
    hero_fallback: IMG.heroDance,
    learn_variant: "icon",
    feature_icons: [
      { label: "Fitness", icon: "💪" },
      { label: "Energy", icon: "⚡" },
      { label: "Confidence", icon: "🤝" },
      { label: "Expression", icon: "✨" },
      { label: "Creativity", icon: "🎨" },
    ],
    learn_cards: [
      { title: "Dance Basics", icon: "💃", description: "Foundations" },
      { title: "Choreography", icon: "🎬", description: "Routine building" },
      { title: "Rhythm & Musicality", icon: "🎵", description: "Timing & flow" },
      { title: "Body Coordination", icon: "🤸", description: "Control & balance" },
      { title: "Stage Performance", icon: "🎤", description: "Presence" },
      { title: "Confidence & Expression", icon: "🌟", description: "Own the stage" },
    ],
    style_cards: [
      { title: "Hip-Hop", image: IMG.dancer },
      { title: "Urban", image: IMG.heroDance },
      { title: "Jazz", image: IMG.dancer },
      { title: "Contemporary", image: IMG.heroDance },
      { title: "Freestyle", image: IMG.dancer },
    ],
    syllabus: ["Warm-up", "Foundations", "Choreography", "Multiple Styles", "Performance Training", "Fitness"],
    equipment: ["RMAA T-shirt", "Track / Dance Pants", "Non-marking Sports Shoes", "Water Bottle", "Sweat Towel"],
    benefits: [
      { title: "Fitness & Stamina" },
      { title: "Confidence" },
      { title: "Coordination" },
      { title: "Self-expression" },
      { title: "Stress Reduction" },
      { title: "Stage Preparation" },
    ],
    final_tagline: "GET FIT | LEARN NEW STYLES | BUILD CONFIDENCE | PERFORM ON STAGE",
  },
  badminton: {
    subtitle: "Play | Train | Improve | Compete",
    hero_fallback: IMG.heroGym,
    learn_variant: "image",
    feature_icons: [
      { label: "Technique Training", icon: "🏸" },
      { label: "Speed & Agility", icon: "⚡" },
      { label: "Stamina & Endurance", icon: "❤️" },
      { label: "Focus & Reaction", icon: "🎯" },
      { label: "Game Strategy", icon: "🧠" },
      { label: "Tournament Prep", icon: "🏆" },
    ],
    learn_cards: [
      { title: "Racket Skills & Grip", description: "Foundational control", image: IMG.fitness },
      { title: "Stroke Techniques", description: "Clear, smash, drop", image: IMG.punch },
      { title: "Footwork & Court Movement", description: "Speed and angles", image: IMG.kick },
      { title: "Singles Strategy", description: "Court craft", image: IMG.defense },
      { title: "Doubles Play", description: "Partnership & rotation", image: IMG.spar },
      { title: "Match Fitness", description: "Endurance drills", image: IMG.bag },
    ],
    syllabus: ["Fundamentals", "Grip & Stance", "Strokes", "Footwork", "Tactics", "Match Play"],
    equipment: ["Racket", "Shuttlecocks", "Non-marking Shoes", "Sports Wear", "Grip Tape", "Water Bottle"],
    benefits: [
      { title: "Improves Fitness" },
      { title: "Builds Speed" },
      { title: "Sharpens Reflexes" },
      { title: "Team Play Skills" },
      { title: "Confidence" },
    ],
    final_tagline: "LEARN | IMPROVE | COMPETE | STAY FIT",
  },
  yoga: {
    subtitle: "Breath, balance, and wellness for every body",
    hero_fallback: IMG.mudra,
    learn_variant: "icon",
    feature_icons: [
      { label: "Flexibility", icon: "🧘" },
      { label: "Breathwork", icon: "🌬️" },
      { label: "Strength", icon: "💪" },
      { label: "Calm", icon: "🕊️" },
      { label: "Focus", icon: "🎯" },
    ],
    learn_cards: [
      { title: "Asanas", icon: "🧘", description: "Foundational postures" },
      { title: "Pranayama", icon: "🌬️", description: "Breath techniques" },
      { title: "Alignment", icon: "📐", description: "Safe form cues" },
      { title: "Mobility", icon: "🔄", description: "Joint health" },
      { title: "Relaxation", icon: "😌", description: "Recovery practices" },
      { title: "Mindfulness", icon: "🧠", description: "Present-moment focus" },
    ],
    syllabus: ["Breath", "Warm-up", "Asanas", "Flow", "Relaxation", "Meditation"],
    equipment: ["Yoga Mat", "Comfortable Wear", "Water Bottle", "Optional Blocks"],
    benefits: [
      { title: "Flexibility" },
      { title: "Stress Relief" },
      { title: "Strength" },
      { title: "Better Sleep" },
    ],
    final_tagline: "BREATHE | STRETCH | STRENGTHEN | FIND BALANCE",
  },
  gym: {
    subtitle: "Strength • Fitness • Transform",
    hero_fallback: IMG.fitness,
    learn_variant: "image",
    layout_variant: "goal_based",
    feature_icons: [
      { label: "Build Strength", icon: "🏋️" },
      { label: "Improve Fitness", icon: "❤️" },
      { label: "Reduce Body Fat", icon: "🔥" },
      { label: "Build Muscle", icon: "💪" },
      { label: "Boost Performance", icon: "⚡" },
    ],
    learn_cards: [
      { title: "Strength Training", description: "Progressive overload", image: IMG.fitness },
      { title: "Functional Training", description: "Real-world movement", image: IMG.spar },
      { title: "Cardio & Endurance", description: "Heart health", image: IMG.kick },
      { title: "Core & Mobility", description: "Stability & range", image: IMG.defense },
      { title: "Weight Management", description: "Fat-loss support", image: IMG.bag },
      { title: "Personalized Plan", description: "Coach-guided goals", image: IMG.punch },
    ],
    training_programs: [
      {
        title: "General Fitness",
        kind: "goal",
        bullet_points: ["Full-body conditioning", "Strength + cardio mix", "Sustainable habits"],
        image: IMG.fitness,
      },
      {
        title: "Fat Loss & Toning",
        kind: "goal",
        bullet_points: ["Metabolic training", "Lean muscle focus", "Nutrition guidance cues"],
        image: IMG.spar,
      },
      {
        title: "Muscle Gain",
        kind: "goal",
        bullet_points: ["Progressive overload", "Hypertrophy blocks", "Recovery coaching"],
        image: IMG.punch,
      },
      {
        title: "Athletic Performance",
        kind: "goal",
        bullet_points: ["Power & speed", "Sport-specific prep", "Injury prevention"],
        image: IMG.kick,
      },
    ],
    syllabus: ["Warm-up", "Strength", "Cardio", "Core", "Mobility", "Recovery"],
    equipment: ["Sports Wear", "Training Shoes", "Water Bottle", "Towel"],
    benefits: [
      { title: "Builds Strength" },
      { title: "Improves Fitness" },
      { title: "Supports Fat Loss" },
      { title: "Boosts Energy" },
      { title: "Better Confidence" },
      { title: "Coach Guidance" },
    ],
    final_tagline: "BUILD STRENGTH | BURN FAT | GAIN MUSCLE | IMPROVE PERFORMANCE",
  },
}

function resolvePack(courseName: string): CoursePack {
  const key = normalizeKey(courseName)
  if (key.includes("kick")) return PACKS.kickboxing
  if (key.includes("mma")) return PACKS.mma
  if (key.includes("box")) return PACKS.boxing
  if (key.includes("badminton")) return PACKS.badminton
  if (key.includes("kuchi") || key.includes("kuchipudi")) return PACKS.kuchipudi
  if (key.includes("gymnast")) return PACKS.gymnastics
  if (key.includes("shaolin") || key.includes("kung")) return PACKS.shaolin
  if (key.includes("silamb")) return PACKS.silambam
  if (key.includes("taek") || key.includes("teak")) return PACKS.taekwondo
  if (key.includes("western") || key.includes("dance")) return PACKS["western dance"]
  if (key.includes("yoga")) return PACKS.yoga
  if (key.includes("gym") && !key.includes("gymnast")) return PACKS.gym
  if (key.includes("self")) return PACKS.mma
  return {
    subtitle: "Train with Rock Martial Arts Academy",
    hero_fallback: IMG.heroCombat,
    learn_variant: "image",
    feature_icons: [
      { label: "Skill", icon: "⭐" },
      { label: "Fitness", icon: "💪" },
      { label: "Discipline", icon: "🎯" },
      { label: "Confidence", icon: "🛡️" },
      { label: "Community", icon: "🤝" },
    ],
    learn_cards: [
      { title: "Fundamentals", description: "Core techniques", image: IMG.defense },
      { title: "Drills", description: "Practice progressions", image: IMG.punch },
      { title: "Conditioning", description: "Strength & stamina", image: IMG.fitness },
      { title: "Coordination", description: "Balance and timing", image: IMG.kick },
      { title: "Applications", description: "Practical skills", image: IMG.spar },
      { title: "Mindset", description: "Focus and discipline", image: IMG.bag },
    ],
    sport: {
      title: `${courseName || "Course"} Sport`,
      body: `${courseName || "This course"} at RMAA blends technique, fitness, and confidence-building under certified coaching.`,
      image: IMG.spar,
    },
    syllabus: ["Warm-up", "Technique", "Drills", "Conditioning", "Cool-down"],
    equipment: ["Sports Wear", "Water Bottle", "Training Shoes"],
    benefits: [
      { title: "Fitness" },
      { title: "Skill Development" },
      { title: "Confidence" },
      { title: "Discipline" },
    ],
    final_tagline: "START TODAY | TRAIN WITH PURPOSE | GROW EVERY SESSION",
  }
}

function mergeList<T>(existing: T[] | undefined, fallback: T[] | undefined): T[] {
  if (existing && existing.length > 0) return existing
  return fallback || []
}

/**
 * Fill empty page_content sections with course-aware defaults for public rendering.
 * Existing CMS values always win.
 */
export function applyCourseDetailDefaults(
  courseName: string,
  pageContent: PageContent | undefined,
  opts?: {
    existingSyllabus?: string[]
    existingEquipment?: string[]
    existingHeroImage?: string
  }
): {
  page_content: PageContent
  syllabusLines: string[]
  equipment: string[]
  heroImageFallback?: string
  learnVariant: "image" | "icon"
} {
  const pack = resolvePack(courseName)
  const pc: PageContent = { ...(pageContent || {}) }
  const hero = { ...(pc.hero_section || {}) }
  if (!hero.subtitle?.trim() && pack.subtitle) hero.subtitle = pack.subtitle
  if (!hero.cta_text?.trim()) hero.cta_text = "Join Now"
  if (!(hero.feature_icons || []).length && pack.feature_icons) {
    hero.feature_icons = pack.feature_icons
  }
  pc.hero_section = hero

  const about = { ...(pc.about_section || {}) }
  if (!about.title && !about.aboutTitle) {
    about.title = `About ${courseName}`
  }
  if (!about.description && !about.aboutDescription) {
    about.description = `${courseName} at Rock Martial Arts Academy builds skill, fitness, and confidence through structured coaching suitable for beginners and progressing students.`
  }
  pc.about_section = about

  if (!pc.layout_variant && pack.layout_variant) {
    pc.layout_variant = pack.layout_variant
  }
  const layout = pc.layout_variant || pack.layout_variant || "standard"
  const isHeritage = layout === "heritage"

  // Heritage (Shaolin) always uses pack learn cards so CMS leftovers don't dilute the mock
  pc.learn_cards =
    isHeritage && pack.learn_cards?.length
      ? pack.learn_cards
      : mergeList(pc.learn_cards, pack.learn_cards)
  if (!isHeritage && !(pc.who_can_join?.items || []).length) {
    pc.who_can_join = { ...DEFAULT_WHO, ...(pc.who_can_join || {}) }
  }
  const programFallback =
    pack.training_programs && pack.training_programs.length > 0
      ? pack.training_programs
      : DEFAULT_PROGRAMS
  pc.training_programs = mergeList(pc.training_programs, programFallback).map(
    (prog, i) => {
      const fallback = programFallback[i] || programFallback[0] || DEFAULT_PROGRAMS[0]
      return {
        ...fallback,
        ...prog,
        image: prog.image?.trim() || fallback?.image,
        schedule_label: prog.schedule_label?.trim() || fallback?.schedule_label,
        duration_label: prog.duration_label?.trim() || fallback?.duration_label,
        bullet_points:
          (prog.bullet_points || []).filter(Boolean).length > 0
            ? prog.bullet_points
            : fallback?.bullet_points,
      }
    }
  )
  if (
    pack.show_sport &&
    !pc.sport_spotlight?.title &&
    !pc.sport_spotlight?.body &&
    pack.sport
  ) {
    pc.sport_spotlight = pack.sport
  }
  if (pack.style_cards?.length && !(pc.style_cards || []).length) {
    pc.style_cards = pack.style_cards
  }
  if (!pc.why_rmaa?.body && !(pc.why_rmaa?.items || []).length) {
    pc.why_rmaa = {
      ...DEFAULT_WHY,
      title: `Why Learn ${courseName} at RMAA?`,
    }
  }
  if (isHeritage) {
    if (!pc.lineage?.title && !pc.lineage?.body) {
      pc.lineage = {
        title: "Our Lineage",
        body: "Authentic knowledge passed through generations. At RMAA, Shaolin training honors temple lineage with disciplined forms, conditioning, and character development under certified coaching.",
        founder_name: "Master B. Devaraj",
        founder_title: "Founder — Rock Martial Arts Academy",
      }
    }
    if (!(pc.philosophy_pillars || []).length) {
      pc.philosophy_pillars = [
        { title: "Chan / Zen", description: "Meditation for inner peace", icon: "🧘" },
        { title: "Wu (Martial Arts)", description: "Kungfu for self-defense", icon: "🥋" },
        { title: "Yi (Traditional Healing)", description: "Balance of body and mind", icon: "☯️" },
      ]
    }
    if (!(pc.qualities || []).length) {
      pc.qualities = [
        { title: "Strength", description: "Physical power", icon: "💪" },
        { title: "Discipline", description: "Daily practice", icon: "🎯" },
        { title: "Focus", description: "Mindful presence", icon: "🪷" },
        { title: "Confidence", description: "Inner courage", icon: "🛡️" },
        { title: "Respect", description: "Community values", icon: "🤝" },
        { title: "Balance", description: "Body & mind", icon: "⚖️" },
        { title: "Character", description: "Warrior spirit", icon: "⚔️" },
      ]
    }
  }
  const packBenefits = (pack.benefits || []).map((b) => ({
    title: b.title,
    description: b.description || "",
  }))
  const existingBenefits = (pc.benefits || []).filter((b) => b.title?.trim())
  // Replace paragraph-like CMS benefit titles with pack checklist when needed
  const benefitsAreChecklist =
    existingBenefits.length > 0 &&
    existingBenefits.every((b) => (b.title || "").length <= 48)
  pc.benefits = benefitsAreChecklist
    ? mergeList(existingBenefits, packBenefits)
    : packBenefits.length
      ? packBenefits
      : existingBenefits

  const finalCta: FinalCtaContent = { ...(pc.final_cta || {}) }
  if (!finalCta.headline?.trim()) {
    finalCta.headline = `Start Your ${courseName} Journey Today`
  }
  if (!finalCta.tagline?.trim()) {
    finalCta.tagline =
      pack.final_tagline ||
      "GET FIT | LEARN SELF-DEFENSE | BUILD CONFIDENCE | COMPETE & GROW"
  }
  if (!finalCta.background_image?.trim()) {
    finalCta.background_image = pack.hero_fallback || IMG.bag
  }
  if (!finalCta.primary_cta_text?.trim()) finalCta.primary_cta_text = "Join Now"
  pc.final_cta = finalCta

  const vis = { ...(pc.section_visibility || {}) }
  const onKeys = isHeritage
    ? [
        "hero",
        "about",
        "learn_cards",
        "lineage",
        "philosophy",
        "qualities",
        "gallery",
        "final_cta",
      ]
    : [
        "hero",
        "info_bar",
        "about",
        "learn_cards",
        "who_can_join",
        "training_programs",
        "course_content",
        "benefits",
        "why_rmaa",
        "final_cta",
        ...(pack.show_sport ? (["sport_spotlight"] as const) : []),
        ...(pack.style_cards?.length ? (["style_cards"] as const) : []),
      ]
  const offKeys = [
    "cta",
    "course_info_sections",
    "learning",
    "instructors",
    "testimonials",
    "attachments",
    ...(isHeritage
      ? ["who_can_join", "training_programs", "sport_spotlight", "course_content", "benefits", "why_rmaa", "style_cards", "info_bar"]
      : ["lineage", "philosophy", "qualities", "gallery", ...(pack.show_sport ? [] : ["sport_spotlight"])]),
  ]
  onKeys.forEach((k) => {
    ;(vis as Record<string, boolean>)[k] = true
  })
  offKeys.forEach((k) => {
    ;(vis as Record<string, boolean>)[k] = false
  })
  pc.section_visibility = vis

  /** Prefer pack lists when CMS stored paragraphs instead of checklist lines */
  const looksLikeChecklist = (lines: string[]) =>
    lines.length > 0 &&
    lines.every((l) => l.length <= 72) &&
    (lines.length > 1 || lines[0].length <= 48)

  const syllabusLines = looksLikeChecklist(opts?.existingSyllabus || [])
    ? opts!.existingSyllabus!
    : pack.syllabus || opts?.existingSyllabus || []
  const equipment = looksLikeChecklist(opts?.existingEquipment || [])
    ? opts!.existingEquipment!
    : pack.equipment || opts?.existingEquipment || []

  return {
    page_content: pc,
    syllabusLines,
    equipment,
    heroImageFallback:
      opts?.existingHeroImage || pack.hero_fallback || IMG.heroCombat,
    learnVariant: pack.learn_variant || "image",
  }
}
