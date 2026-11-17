/**
 * Realistic public-asset fallbacks (academy gallery photos).
 * Prefer these over the 1×1 `/placeholder.jpg` so missing media never looks broken.
 */

export const REALISTIC_PHOTO_PLACEHOLDERS = [
  "/assets/img/glry_img1.jpg",
  "/assets/img/glry_img2.jpg",
  "/assets/img/glry_img3.jpg",
  "/assets/img/glry_img4.jpg",
  "/assets/img/glry_img5.jpg",
  "/assets/img/glry_img6.jpg",
  "/assets/img/glry_img7.jpg",
  "/assets/img/glry_img8.jpg",
  "/assets/img/glry_img9.jpg",
  "/assets/img/class_img.png",
  "/assets/img/about-img.png",
] as const

/** Default full-bleed / card photo when no src is available */
export const DEFAULT_REALISTIC_IMAGE = REALISTIC_PHOTO_PLACEHOLDERS[0]

/** Default avatar-style photo */
export const DEFAULT_REALISTIC_AVATAR = "/assets/img/glry_img3.jpg"

export function realisticPlaceholder(seed?: string | number | null): string {
  const list = REALISTIC_PHOTO_PLACEHOLDERS
  if (seed == null || seed === "") return list[0]
  const s = String(seed)
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return list[hash % list.length]
}

export const MOCK_WARRIOR_TESTIMONIALS = [
  {
    id: "mock-t-1",
    student_name: "Ananya Reddy",
    student_photo: "/assets/img/glry_img2.jpg",
    testimonial_text:
      "Training at Rock Martial Arts completely changed my confidence. The coaches push you with care, and every session feels purposeful. I went from shy beginner to competing at state level in under two years.",
    rating: 5,
    role: "Kickboxing student · Hyderabad",
    achievement: "State medalist",
  },
  {
    id: "mock-t-2",
    student_name: "Rohan Mehta",
    student_photo: "/assets/img/glry_img4.jpg",
    testimonial_text:
      "The discipline I learned here shows up everywhere — school, work, and life. Classes are intense but fun, and the branch always feels like a second family. Highly recommend for kids and adults.",
    rating: 5,
    role: "Shaolin Kung Fu · Parent of student",
    achievement: "Black belt journey",
  },
  {
    id: "mock-t-3",
    student_name: "Sneha Patel",
    student_photo: "/assets/img/glry_img5.jpg",
    testimonial_text:
      "I joined for fitness and stayed for the community. The warriors culture is real — encouraging, competitive, and respectful. My stamina and focus have never been better.",
    rating: 4.5,
    role: "MMA & Self-defence",
    achievement: "2 years training",
  },
  {
    id: "mock-t-4",
    student_name: "Vikram Rao",
    student_photo: "/assets/img/glry_img6.jpg",
    testimonial_text:
      "Coaches explain technique clearly and correct form patiently. Within months I was sparring confidently. The academy’s structure and belt progression keep me motivated every week.",
    rating: 5,
    role: "Taekwondo student · Secunderabad",
    achievement: "District gold",
  },
  {
    id: "mock-t-5",
    student_name: "Meera Krishnan",
    student_photo: "/assets/img/glry_img7.jpg",
    testimonial_text:
      "As a parent, I love the safety standards and positive atmosphere. My daughter looks forward to every class. We’ve seen huge improvements in confidence and respect at home.",
    rating: 5,
    role: "Parent · Kids program",
    achievement: "Family warrior",
  },
  {
    id: "mock-t-6",
    student_name: "Arjun Singh",
    student_photo: "/assets/img/glry_img8.jpg",
    testimonial_text:
      "From day one the energy on the mats is electric. Strength, speed, and mindset — all train together. Rock Martial Arts is the real deal if you want serious growth.",
    rating: 4.8,
    role: "Boxing & Conditioning",
    achievement: "Warrior batch",
  },
] as const

export const MOCK_SHOWCASE_ACHIEVEMENTS = [
  {
    id: "mock-a-1",
    student_name: "Ananya Reddy",
    student_photo: "/assets/img/glry_img2.jpg",
    achievement_title: "State Kickboxing Gold — 2025",
    description: "Won gold in the senior women’s division after two years of dedicated warrior batch training.",
    image: "/assets/img/glry_img1.jpg",
  },
  {
    id: "mock-a-2",
    student_name: "Kartikeya Chiruvolu",
    student_photo: "/assets/img/glry_img3.jpg",
    achievement_title: "State Kickboxing Silver Medalist",
    description: "Back-to-back silver medals with outstanding ring control and discipline.",
    image: "/assets/img/glry_img3.jpg",
  },
  {
    id: "mock-a-3",
    student_name: "Panthangi Lasya",
    student_photo: "/assets/img/glry_img5.jpg",
    achievement_title: "State Wushu (Sanda) Silver",
    description: "Strong showing in Sanda with sharp technique and fighting spirit.",
    image: "/assets/img/glry_img5.jpg",
  },
  {
    id: "mock-a-4",
    student_name: "Rohan Mehta",
    student_photo: "/assets/img/glry_img4.jpg",
    achievement_title: "District MMA Champion",
    description: "Dominated the district open with three wins and a display of grit.",
    image: "/assets/img/glry_img4.jpg",
  },
  {
    id: "mock-a-5",
    student_name: "Sneha Patel",
    student_photo: "/assets/img/glry_img6.jpg",
    achievement_title: "National Silambam Selection Camp",
    description: "Selected for the national training camp after excelling at state trials.",
    image: "/assets/img/glry_img6.jpg",
  },
  {
    id: "mock-a-6",
    student_name: "Vikram Rao",
    student_photo: "/assets/img/glry_img7.jpg",
    achievement_title: "Inter-Academy Taekwondo Gold",
    description: "Gold medal in the inter-academy championship with perfect form scores.",
    image: "/assets/img/glry_img7.jpg",
  },
] as const
