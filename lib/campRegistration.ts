export const CAMP_REG_TABS = [
  { id: "participant", label: "1. Participant" },
  { id: "training", label: "2. Training" },
  { id: "medical", label: "3. Medical" },
  { id: "food", label: "4. Food" },
  { id: "emergency", label: "5. Emergency" },
  { id: "residential", label: "6. Camp" },
  { id: "payment", label: "7. Payment" },
  { id: "rules", label: "8. Rules" },
  { id: "photo", label: "9. Photo" },
  { id: "parent", label: "10. Parent" },
  { id: "hear", label: "11. Source" },
  { id: "final", label: "12. Declaration" },
] as const

export type CampRegTabId = (typeof CAMP_REG_TABS)[number]["id"]

export const CAMP_REG_VISIBLE_TABS = CAMP_REG_TABS.filter((tab) => tab.id !== "payment").map((tab, index) => ({
  id: tab.id,
  label: `${index + 1}. ${tab.label.replace(/^\d+\.\s*/, "")}`,
}))

export const HEAR_ABOUT_OPTIONS = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Friend / Referral",
  "Existing RMAA Student",
  "Website",
  "Other",
] as const

export type CampRegistrationForm = {
  participant: {
    full_name: string
    date_of_birth: string
    age: string
    gender: string
    parent_guardian_name: string
    parent_guardian_mobile: string
    alternate_contact: string
    email: string
    address: string
  }
  training: {
    shaolin_beginner: string
    trained_before: string
    trained_details: string
    current_sports: string
    fitness_level: string
  }
  medical: {
    injury: string
    injury_details: string
    medical_condition: string
    medical_condition_details: string
    allergies: string
    allergies_details: string
    medication: string
    medication_details: string
    blood_group: string
  }
  food: {
    preference: string
    dietary_restriction: string
    dietary_details: string
  }
  emergency: {
    name: string
    relationship: string
    phone: string
    alternate_phone: string
  }
  residential: {
    attended_before: string
    special_requirements: string
    special_requirements_details: string
  }
  payment: {
    payment_mode: string
    other_mode: string
    transaction_id: string
    screenshot_url: string
    agree_policy: boolean
  }
  rules: {
    agree_rules: boolean
    agree_instructions: boolean
    agree_discipline: boolean
    agree_property: boolean
    agree_non_refundable: boolean
  }
  photo: { consent: boolean }
  parent_consent: {
    agreed: boolean
    name: string
    relationship: string
    signature: string
    date: string
  }
  hear_about: {
    sources: string[]
    other_source: string
    referred_by: string
  }
  final: {
    agreed: boolean
    participant_name: string
    parent_guardian_name: string
    signature: string
    registration_date: string
  }
}

export function emptyCampRegistration(): CampRegistrationForm {
  const today = new Date().toISOString().slice(0, 10)
  return {
    participant: {
      full_name: "",
      date_of_birth: "",
      age: "",
      gender: "",
      parent_guardian_name: "",
      parent_guardian_mobile: "",
      alternate_contact: "",
      email: "",
      address: "",
    },
    training: {
      shaolin_beginner: "",
      trained_before: "",
      trained_details: "",
      current_sports: "",
      fitness_level: "",
    },
    medical: {
      injury: "",
      injury_details: "",
      medical_condition: "",
      medical_condition_details: "",
      allergies: "",
      allergies_details: "",
      medication: "",
      medication_details: "",
      blood_group: "",
    },
    food: { preference: "", dietary_restriction: "", dietary_details: "" },
    emergency: { name: "", relationship: "", phone: "", alternate_phone: "" },
    residential: { attended_before: "", special_requirements: "", special_requirements_details: "" },
    payment: {
      payment_mode: "",
      other_mode: "",
      transaction_id: "",
      screenshot_url: "",
      agree_policy: false,
    },
    rules: {
      agree_rules: false,
      agree_instructions: false,
      agree_discipline: false,
      agree_property: false,
      agree_non_refundable: false,
    },
    photo: { consent: false },
    parent_consent: { agreed: false, name: "", relationship: "", signature: "", date: today },
    hear_about: { sources: [], other_source: "", referred_by: "" },
    final: { agreed: false, participant_name: "", parent_guardian_name: "", signature: "", registration_date: today },
  }
}

function req(v: string, label: string): string | null {
  return v.trim() ? null : `${label} is required`
}

export function validateCampRegSection(form: CampRegistrationForm, tab: CampRegTabId): string | null {
  if (tab === "participant") {
    const p = form.participant
    return (
      req(p.full_name, "Full name") ||
      req(p.date_of_birth, "Date of birth") ||
      req(p.age, "Age") ||
      req(p.gender, "Gender") ||
      req(p.parent_guardian_name, "Parent / guardian name") ||
      req(p.parent_guardian_mobile, "Parent / guardian mobile") ||
      req(p.email, "Email") ||
      req(p.address, "Address")
    )
  }
  if (tab === "training") {
    const t = form.training
    if (!t.shaolin_beginner) return "Select beginner status"
    if (!t.trained_before) return "Select whether trained before"
    if (t.trained_before === "yes" && !t.trained_details.trim()) return "Enter martial art and duration"
    if (!t.fitness_level) return "Select fitness level"
    return null
  }
  if (tab === "medical") {
    const m = form.medical
    if (!m.injury) return "Select injury status"
    if (m.injury === "yes" && !m.injury_details.trim()) return "Enter injury details"
    if (!m.medical_condition) return "Select medical condition status"
    if (m.medical_condition === "yes" && !m.medical_condition_details.trim()) return "Enter medical details"
    if (!m.allergies) return "Select allergy status"
    if (m.allergies === "yes" && !m.allergies_details.trim()) return "Enter allergy details"
    if (!m.medication) return "Select medication status"
    if (m.medication === "yes" && !m.medication_details.trim()) return "Enter medication details"
    return req(m.blood_group, "Blood group")
  }
  if (tab === "food") {
    if (!form.food.preference) return "Select food preference"
    if (!form.food.dietary_restriction) return "Select dietary restriction status"
    if (form.food.dietary_restriction === "yes" && !form.food.dietary_details.trim()) {
      return "Enter dietary details"
    }
    return null
  }
  if (tab === "emergency") {
    const e = form.emergency
    return req(e.name, "Emergency contact") || req(e.relationship, "Relationship") || req(e.phone, "Emergency number")
  }
  if (tab === "residential") {
    if (!form.residential.attended_before) return "Select whether attended a camp before"
    if (!form.residential.special_requirements) return "Select special requirements"
    if (form.residential.special_requirements === "yes" && !form.residential.special_requirements_details.trim()) {
      return "Enter special requirements"
    }
    return null
  }
  if (tab === "payment") {
    const p = form.payment
    if (!p.payment_mode) return "Select payment mode"
    if (p.payment_mode === "other" && !p.other_mode.trim()) return "Specify other payment mode"
    if ((p.payment_mode === "upi" || p.payment_mode === "other") && !p.screenshot_url.trim()) {
      return "Upload a payment screenshot"
    }
    if (!p.agree_policy) return "Accept the payment and no-refund policy"
    return null
  }
  if (tab === "rules") {
    const r = form.rules
    if (!r.agree_rules || !r.agree_instructions || !r.agree_discipline || !r.agree_property || !r.agree_non_refundable) {
      return "Accept all camp rules"
    }
    return null
  }
  if (tab === "photo") return form.photo.consent ? null : "Photo / video consent is required"
  if (tab === "parent") {
    const p = form.parent_consent
    if (!p.agreed) return "Parent / guardian consent is required"
    return req(p.name, "Parent / guardian name") || req(p.relationship, "Relationship") || req(p.signature, "Signature") || req(p.date, "Date")
  }
  if (tab === "hear") {
    if (form.hear_about.sources.length === 0) return "Select how you heard about us"
    if (form.hear_about.sources.includes("Other") && !form.hear_about.other_source.trim()) {
      return "Specify other source"
    }
    return null
  }
  if (tab === "final") {
    const f = form.final
    return (
      req(form.participant.full_name || f.participant_name, "Participant name") ||
      req(form.parent_consent.name || f.parent_guardian_name, "Parent / guardian name") ||
      req(f.signature, "Participant signature") ||
      req(f.registration_date, "Registration date")
    )
  }
  return null
}

export function validateCampRegAll(form: CampRegistrationForm): { tab: CampRegTabId; message: string } | null {
  for (const tab of CAMP_REG_VISIBLE_TABS) {
    const message = validateCampRegSection(form, tab.id)
    if (message) return { tab: tab.id, message }
  }
  return null
}

export function campRegBlockedAhead(
  form: CampRegistrationForm,
  targetId: CampRegTabId,
): { tab: CampRegTabId; message: string } | null {
  const targetIndex = CAMP_REG_VISIBLE_TABS.findIndex((item) => item.id === targetId)
  if (targetIndex <= 0) return null
  for (let i = 0; i < targetIndex; i++) {
    const id = CAMP_REG_VISIBLE_TABS[i].id
    const message = validateCampRegSection(form, id)
    if (message) return { tab: id, message }
  }
  return null
}

export function campRegPretty(value: string | boolean | undefined | null): string {
  if (value === true) return "Yes"
  if (value === false) return "No"
  const text = String(value ?? "").trim()
  if (!text) return "—"
  return text
}
