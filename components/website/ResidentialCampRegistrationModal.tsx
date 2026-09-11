"use client"

import { useEffect, useRef, useState } from "react"
import { campFeeDisplay, campFactValue, type ResidentialCampContent } from "@/lib/residentialCamp"
import {
  CAMP_REG_VISIBLE_TABS,
  HEAR_ABOUT_OPTIONS,
  campRegBlockedAhead,
  emptyCampRegistration,
  validateCampRegAll,
  validateCampRegSection,
  type CampRegTabId,
  type CampRegistrationForm,
} from "@/lib/campRegistration"
import { CampSignaturePad } from "@/components/website/CampSignaturePad"
import { CampRegistrationReview } from "@/components/website/CampRegistrationReview"
import {
  CampRegistrationConfirmation,
  type CampPaymentSuccess,
} from "@/components/website/CampRegistrationConfirmation"
import { loadRazorpayScript } from "@/lib/razorpay"
import { toPng } from "html-to-image"

type Props = {
  open: boolean
  onClose: () => void
  content: ResidentialCampContent
}

type RazorpayVerifyPayload = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="camp-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Radios({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="camp-radios">
      {options.map((opt) => (
        <label key={opt.value} className="camp-choice">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span className="camp-choice-text">{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

function apiDetail(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const detail = (data as { detail?: unknown }).detail
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg
  return fallback
}

export function ResidentialCampRegistrationModal({ open, onClose, content }: Props) {
  const [tab, setTab] = useState<CampRegTabId>("participant")
  const [step, setStep] = useState<"form" | "review" | "success">("form")
  const [form, setForm] = useState<CampRegistrationForm>(() => emptyCampRegistration())
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [pendingVerify, setPendingVerify] = useState<RazorpayVerifyPayload | null>(null)
  const [confirmation, setConfirmation] = useState<CampPaymentSuccess | null>(null)
  const [downloading, setDownloading] = useState(false)
  const confirmRef = useRef<HTMLDivElement | null>(null)
  const fees = campFeeDisplay(content)
  const eventName = content.event_name || "Residential Camp"
  const dates = campFactValue(content, "Dates")
  const location = campFactValue(content, "Location")

  useEffect(() => {
    if (!open) return
    setTab("participant")
    setStep("form")
    setForm(emptyCampRegistration())
    setError(null)
    setSubmitting(false)
    setDraftId(null)
    setPendingVerify(null)
    setConfirmation(null)
  }, [open])

  if (!open) return null

  const tabIndex = CAMP_REG_VISIBLE_TABS.findIndex((t) => t.id === tab)
  const isLastFormTab = tab === "final"

  const patch = <K extends keyof CampRegistrationForm>(key: K, value: Partial<CampRegistrationForm[K]>) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }))
  }

  const withDeclarationFields = (current: CampRegistrationForm): CampRegistrationForm => ({
    ...current,
    final: {
      ...current.final,
      participant_name: current.participant.full_name,
      parent_guardian_name: current.parent_consent.name,
      registration_date: new Date().toISOString().slice(0, 10),
    },
  })

  const goNext = () => {
    const message = validateCampRegSection(form, tab)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    if (isLastFormTab) {
      setForm(withDeclarationFields)
      setStep("review")
      return
    }
    const next = CAMP_REG_VISIBLE_TABS[tabIndex + 1]
    if (!next) return
    if (next.id === "final") setForm(withDeclarationFields)
    setTab(next.id)
  }

  const goBack = () => {
    setError(null)
    if (step === "review") {
      setStep("form")
      setTab("final")
      return
    }
    const prev = CAMP_REG_VISIBLE_TABS[tabIndex - 1]
    if (prev) setTab(prev.id)
  }

  const uploadScreenshot = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/backend/camp-registrations/screenshot", { method: "POST", body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(apiDetail(data, "Upload failed"))
      patch("payment", { screenshot_url: data.file_url || data.url || "" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const buildPayload = (current: CampRegistrationForm): CampRegistrationForm => {
    const ready = withDeclarationFields(current)
    return {
      ...ready,
      payment: {
        payment_mode: "razorpay",
        other_mode: "",
        transaction_id: ready.payment.transaction_id,
        screenshot_url: ready.payment.screenshot_url,
        agree_policy: true,
      },
      final: { ...ready.final, agreed: true },
    }
  }

  const verifyPayment = async (regId: string, payload: RazorpayVerifyPayload) => {
    const verifyRes = await fetch(`/api/backend/camp-registrations/${encodeURIComponent(regId)}/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const verified = await verifyRes.json().catch(() => ({}))
    if (!verifyRes.ok) throw new Error(apiDetail(verified, "Payment verification failed"))
    setConfirmation({
      event_name: verified.event_name || eventName,
      event_dates: verified.event_dates || dates,
      event_location: verified.event_location || location,
      participant_name: verified.participant_name || form.participant.full_name,
      fee_total: verified.fee_total || fees.total,
      fee_pay_now: verified.fee_pay_now || fees.payNow,
      fee_balance: verified.fee_balance || fees.balance,
      refund_text: verified.refund_text || `${fees.refundLabel} ${fees.refundText}`.trim(),
      razorpay_payment_id: verified.razorpay_payment_id || payload.razorpay_payment_id,
    })
    setPendingVerify(null)
    setStep("success")
  }

  const registerAndPay = async () => {
    if (!form.final.agreed) {
      setError("Please confirm the declaration before registering")
      return
    }
    const payload = buildPayload(form)
    setForm(payload)
    const invalid = validateCampRegAll(payload)
    if (invalid) {
      setStep("form")
      setTab(invalid.tab)
      setError(invalid.message)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (draftId && pendingVerify) {
        await verifyPayment(draftId, pendingVerify)
        setSubmitting(false)
        return
      }
      let regId = draftId
      if (!regId) {
        const res = await fetch("/api/backend/camp-registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(apiDetail(data, "Could not submit registration"))
        regId = data.id as string
        if (!regId) throw new Error("Could not submit registration")
        setDraftId(regId)
      }

      const orderRes = await fetch(`/api/backend/camp-registrations/${encodeURIComponent(regId)}/create-order`, {
        method: "POST",
      })
      const orderData = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok) throw new Error(apiDetail(orderData, "Could not start payment"))
      const order = orderData.order
      const key = orderData.key
      if (!order?.id || !key) throw new Error("Could not start payment")

      const loaded = await loadRazorpayScript()
      if (!loaded || typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Failed to load Razorpay. Please refresh and try again.")
      }

      const rz = new window.Razorpay({
        key,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Rock Martial Arts",
        description: eventName,
        order_id: order.id,
        prefill: {
          name: form.participant.full_name,
          email: form.participant.email,
          contact: form.participant.parent_guardian_mobile,
        },
        theme: { color: "#f59e0b" },
        handler: async (response) => {
          const verifyBody: RazorpayVerifyPayload = {
            razorpay_order_id: response.razorpay_order_id || order.id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature || "",
          }
          try {
            await verifyPayment(regId as string, verifyBody)
          } catch (e) {
            setPendingVerify(verifyBody)
            setError(e instanceof Error ? e.message : "Payment received but confirmation failed. Tap Register to retry.")
          } finally {
            setSubmitting(false)
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false)
            setError("Payment cancelled. You can try again when you are ready.")
          },
        },
      })
      rz.on("payment.failed", (response: { error?: { description?: string } }) => {
        setSubmitting(false)
        setError(response?.error?.description || "Payment failed. Please try again.")
      })
      rz.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment")
      setSubmitting(false)
    }
  }

  const downloadConfirmation = async () => {
    if (!confirmRef.current || !confirmation) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(confirmRef.current, { pixelRatio: 2, cacheBust: true })
      const link = document.createElement("a")
      const slug = (confirmation.participant_name || "camp").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")
      link.download = `camp-registration-${slug || "confirmation"}.png`
      link.href = dataUrl
      link.click()
    } catch {
      setError("Could not download the confirmation image")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="camp-reg-overlay" role="dialog" aria-modal="true" aria-labelledby="camp-reg-title">
      <div className="camp-reg-panel">
        <header className="camp-reg-head">
          <div>
            <p className="camp-reg-kicker">{eventName}{dates ? ` • ${dates}` : ""}{location ? ` • ${location}` : ""}</p>
            <h2 id="camp-reg-title">
              {step === "review" ? "Review registration" : step === "success" ? "Registration confirmed" : "Camp registration"}
            </h2>
          </div>
          <button type="button" className="camp-reg-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {step === "success" && confirmation ? (
          <div className="camp-reg-body">
            <div className="camp-success-wrap">
              <CampRegistrationConfirmation ref={confirmRef} data={confirmation} />
              {error ? <p className="camp-reg-error">{error}</p> : null}
              <div className="camp-success-actions">
                <button type="button" className="camp-form-btn primary" onClick={downloadConfirmation} disabled={downloading}>
                  {downloading ? "Preparing…" : "Download"}
                </button>
                <button type="button" className="camp-form-btn" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {step === "form" ? (
              <div className="camp-reg-tabs">
                {CAMP_REG_VISIBLE_TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.id === tab ? "is-active" : ""}
                    onClick={() => {
                      const targetIndex = CAMP_REG_VISIBLE_TABS.findIndex((t) => t.id === item.id)
                      if (targetIndex > tabIndex) {
                        const blocked = campRegBlockedAhead(form, item.id)
                        if (blocked) {
                          setError(blocked.message)
                          if (blocked.tab === "final") setForm(withDeclarationFields)
                          setTab(blocked.tab)
                          return
                        }
                      }
                      setError(null)
                      if (item.id === "final") setForm(withDeclarationFields)
                      setTab(item.id)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="camp-reg-body">
              {step === "review" ? (
                <div className="camp-form-stack">
                  <CampRegistrationReview form={form} fees={fees} />
                  <div className="camp-review-confirm">
                    <Check
                      checked={form.final.agreed}
                      onChange={(agreed) => patch("final", { agreed })}
                      label="I confirm that all information provided in this form is true and correct. I have read and understood the camp rules, payment terms and non-refundable policy, and I agree to follow them."
                    />
                  </div>
                </div>
              ) : null}

              {step === "form" && tab === "participant" && (
                <div className="camp-form-grid">
                  <Field label="Full Name">
                    <input placeholder="Enter participant's full name" value={form.participant.full_name} onChange={(e) => patch("participant", { full_name: e.target.value })} />
                  </Field>
                  <Field label="Date of Birth">
                    <input type="date" value={form.participant.date_of_birth} onChange={(e) => patch("participant", { date_of_birth: e.target.value })} />
                  </Field>
                  <Field label="Age">
                    <input type="number" min={1} placeholder="e.g. 12" value={form.participant.age} onChange={(e) => patch("participant", { age: e.target.value })} />
                  </Field>
                  <div className="camp-field">
                    <span>Gender</span>
                    <Radios
                      name="gender"
                      value={form.participant.gender}
                      onChange={(gender) => patch("participant", { gender })}
                      options={[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </div>
                  <Field label="Parent / Guardian Name">
                    <input placeholder="Enter parent or guardian full name" value={form.participant.parent_guardian_name} onChange={(e) => patch("participant", { parent_guardian_name: e.target.value })} />
                  </Field>
                  <Field label="Parent / Guardian Mobile">
                    <input placeholder="10-digit mobile number" value={form.participant.parent_guardian_mobile} onChange={(e) => patch("participant", { parent_guardian_mobile: e.target.value })} />
                  </Field>
                  <Field label="Alternate Contact">
                    <input placeholder="Alternate 10-digit mobile number" value={form.participant.alternate_contact} onChange={(e) => patch("participant", { alternate_contact: e.target.value })} />
                  </Field>
                  <Field label="Email Address">
                    <input type="email" placeholder="name@example.com" value={form.participant.email} onChange={(e) => patch("participant", { email: e.target.value })} />
                  </Field>
                  <label className="camp-field camp-field-full">
                    <span>Complete Address</span>
                    <textarea rows={3} placeholder="House / street, area, city, state, PIN" value={form.participant.address} onChange={(e) => patch("participant", { address: e.target.value })} />
                  </label>
                </div>
              )}

              {step === "form" && tab === "training" && (
                <div className="camp-form-stack">
                  <div className="camp-field">
                    <span>Shaolin Kungfu Beginner?</span>
                    <Radios
                      name="beginner"
                      value={form.training.shaolin_beginner}
                      onChange={(shaolin_beginner) => patch("training", { shaolin_beginner })}
                      options={[
                        { value: "beginner", label: "Yes, complete beginner" },
                        { value: "experience", label: "Previous experience" },
                      ]}
                    />
                  </div>
                  <div className="camp-field">
                    <span>Trained in martial arts before?</span>
                    <Radios
                      name="trained"
                      value={form.training.trained_before}
                      onChange={(trained_before) => patch("training", { trained_before })}
                      options={[
                        { value: "no", label: "No" },
                        { value: "yes", label: "Yes" },
                      ]}
                    />
                  </div>
                  {form.training.trained_before === "yes" && (
                    <Field label="If yes, martial art & duration">
                      <input placeholder="e.g. Taekwondo, 2 years" value={form.training.trained_details} onChange={(e) => patch("training", { trained_details: e.target.value })} />
                    </Field>
                  )}
                  <label className="camp-field">
                    <span>Current Sports / Physical Activities</span>
                    <textarea rows={2} placeholder="e.g. Football, swimming, school PE" value={form.training.current_sports} onChange={(e) => patch("training", { current_sports: e.target.value })} />
                  </label>
                  <div className="camp-field">
                    <span>Current Fitness Level</span>
                    <Radios
                      name="fitness"
                      value={form.training.fitness_level}
                      onChange={(fitness_level) => patch("training", { fitness_level })}
                      options={[
                        { value: "beginner", label: "Beginner" },
                        { value: "intermediate", label: "Intermediate" },
                        { value: "advanced", label: "Advanced" },
                      ]}
                    />
                  </div>
                </div>
              )}

              {step === "form" && tab === "medical" && (
                <div className="camp-form-stack">
                  <YesNoDetails
                    label="Previous / Current Injury"
                    name="injury"
                    yesNo={form.medical.injury}
                    details={form.medical.injury_details}
                    onYesNo={(injury) => patch("medical", { injury })}
                    onDetails={(injury_details) => patch("medical", { injury_details })}
                  />
                  <YesNoDetails
                    label="Medical condition / limitation"
                    name="medical"
                    yesNo={form.medical.medical_condition}
                    details={form.medical.medical_condition_details}
                    onYesNo={(medical_condition) => patch("medical", { medical_condition })}
                    onDetails={(medical_condition_details) => patch("medical", { medical_condition_details })}
                  />
                  <YesNoDetails
                    label="Allergies"
                    name="allergies"
                    yesNo={form.medical.allergies}
                    details={form.medical.allergies_details}
                    onYesNo={(allergies) => patch("medical", { allergies })}
                    onDetails={(allergies_details) => patch("medical", { allergies_details })}
                  />
                  <YesNoDetails
                    label="Regular Medication"
                    name="medication"
                    yesNo={form.medical.medication}
                    details={form.medical.medication_details}
                    onYesNo={(medication) => patch("medical", { medication })}
                    onDetails={(medication_details) => patch("medical", { medication_details })}
                  />
                  <Field label="Blood Group">
                    <input placeholder="e.g. O+" value={form.medical.blood_group} onChange={(e) => patch("medical", { blood_group: e.target.value })} />
                  </Field>
                </div>
              )}

              {step === "form" && tab === "food" && (
                <div className="camp-form-stack">
                  <div className="camp-field">
                    <span>Food Preference</span>
                    <Radios
                      name="food"
                      value={form.food.preference}
                      onChange={(preference) => patch("food", { preference })}
                      options={[
                        { value: "vegetarian", label: "Vegetarian" },
                        { value: "non-vegetarian", label: "Non-Vegetarian" },
                      ]}
                    />
                  </div>
                  <YesNoDetails
                    label="Food Allergy / Dietary Restriction"
                    name="diet"
                    yesNo={form.food.dietary_restriction}
                    details={form.food.dietary_details}
                    onYesNo={(dietary_restriction) => patch("food", { dietary_restriction })}
                    onDetails={(dietary_details) => patch("food", { dietary_details })}
                  />
                </div>
              )}

              {step === "form" && tab === "emergency" && (
                <div className="camp-form-grid">
                  <Field label="Emergency Contact Person">
                    <input placeholder="Full name of emergency contact" value={form.emergency.name} onChange={(e) => patch("emergency", { name: e.target.value })} />
                  </Field>
                  <Field label="Relationship">
                    <input placeholder="e.g. Father, Mother, Uncle" value={form.emergency.relationship} onChange={(e) => patch("emergency", { relationship: e.target.value })} />
                  </Field>
                  <Field label="Emergency Contact Number">
                    <input placeholder="10-digit mobile number" value={form.emergency.phone} onChange={(e) => patch("emergency", { phone: e.target.value })} />
                  </Field>
                  <Field label="Alternate Emergency Number">
                    <input placeholder="Alternate 10-digit mobile number" value={form.emergency.alternate_phone} onChange={(e) => patch("emergency", { alternate_phone: e.target.value })} />
                  </Field>
                </div>
              )}

              {step === "form" && tab === "residential" && (
                <div className="camp-form-stack">
                  <div className="camp-field">
                    <span>Attended residential camp before?</span>
                    <Radios
                      name="attended"
                      value={form.residential.attended_before}
                      onChange={(attended_before) => patch("residential", { attended_before })}
                      options={[
                        { value: "no", label: "No" },
                        { value: "yes", label: "Yes" },
                      ]}
                    />
                  </div>
                  <YesNoDetails
                    label="Special requirements?"
                    name="special"
                    yesNo={form.residential.special_requirements}
                    details={form.residential.special_requirements_details}
                    onYesNo={(special_requirements) => patch("residential", { special_requirements })}
                    onDetails={(special_requirements_details) => patch("residential", { special_requirements_details })}
                  />
                </div>
              )}

              {step === "form" && tab === "payment" && (
                <div className="camp-form-stack">
                  <div className="camp-pay-box">
                    <p><b>Total Camp Fee</b> {fees.total}</p>
                    <p><b>Pay Now</b> {fees.payNow}</p>
                    <p><b>Balance</b> {fees.balance}</p>
                    <p><b>{fees.refundLabel}</b> {fees.refundText}</p>
                  </div>
                  <div className="camp-field">
                    <span>Payment Mode</span>
                    <Radios
                      name="paymode"
                      value={form.payment.payment_mode}
                      onChange={(payment_mode) => patch("payment", { payment_mode })}
                      options={[
                        { value: "upi", label: "UPI" },
                        { value: "cash", label: "Cash" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </div>
                  {form.payment.payment_mode === "other" && (
                    <Field label="Other Payment Mode">
                      <input placeholder="Specify payment mode" value={form.payment.other_mode} onChange={(e) => patch("payment", { other_mode: e.target.value })} />
                    </Field>
                  )}
                  <Field label="Transaction ID">
                    <input placeholder="UPI / bank transaction reference" value={form.payment.transaction_id} onChange={(e) => patch("payment", { transaction_id: e.target.value })} />
                  </Field>
                  <div className="camp-field">
                    <span>Payment Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadScreenshot(file)
                      }}
                    />
                    {uploading ? <small>Uploading…</small> : null}
                    {form.payment.screenshot_url ? <small>Uploaded</small> : null}
                  </div>
                  <label className="camp-check">
                    <input
                      type="checkbox"
                      checked={form.payment.agree_policy}
                      onChange={(e) => patch("payment", { agree_policy: e.target.checked })}
                    />
                    <span className="camp-choice-text">I have read and agree to the payment and no-refund policy.</span>
                  </label>
                </div>
              )}

              {step === "form" && tab === "rules" && (
                <div className="camp-form-stack">
                  <Check
                    checked={form.rules.agree_rules}
                    onChange={(agree_rules) => patch("rules", { agree_rules })}
                    label="I agree to follow all rules and regulations of Rock Martial Arts Academy."
                  />
                  <Check
                    checked={form.rules.agree_instructions}
                    onChange={(agree_instructions) => patch("rules", { agree_instructions })}
                    label="I will follow instructions given by the Master, coaches and camp staff."
                  />
                  <Check
                    checked={form.rules.agree_discipline}
                    onChange={(agree_discipline) => patch("rules", { agree_discipline })}
                    label="I understand that discipline and proper behaviour are mandatory throughout the camp."
                  />
                  <Check
                    checked={form.rules.agree_property}
                    onChange={(agree_property) => patch("rules", { agree_property })}
                    label="I will take care of academy/camp property and equipment."
                  />
                  <Check
                    checked={form.rules.agree_non_refundable}
                    onChange={(agree_non_refundable) => patch("rules", { agree_non_refundable })}
                    label="I understand that the camp registration fee is non-refundable."
                  />
                </div>
              )}

              {step === "form" && tab === "photo" && (
                <Check
                  checked={form.photo.consent}
                  onChange={(consent) => patch("photo", { consent })}
                  label="I give permission to Rock Martial Arts Academy to photograph/video the participant during the camp and use the content for academy promotional purposes, including social media, website and advertisements."
                />
              )}

              {step === "form" && tab === "parent" && (
                <div className="camp-form-stack">
                  <p>
                    I, the undersigned parent/guardian, give permission for my child to participate in {eventName}
                    {dates ? ` (${dates})` : ""} conducted by Rock Martial Arts Academy. I confirm that the information
                    provided is accurate and that I have informed the academy about relevant medical, dietary or safety
                    requirements.
                  </p>
                  <Check
                    checked={form.parent_consent.agreed}
                    onChange={(agreed) => patch("parent_consent", { agreed })}
                    label="I agree to the parent / guardian consent declaration."
                  />
                  <div className="camp-form-grid">
                    <Field label="Parent / Guardian Name">
                      <input placeholder="Enter parent or guardian full name" value={form.parent_consent.name} onChange={(e) => patch("parent_consent", { name: e.target.value })} />
                    </Field>
                    <Field label="Relationship">
                      <input placeholder="e.g. Father, Mother" value={form.parent_consent.relationship} onChange={(e) => patch("parent_consent", { relationship: e.target.value })} />
                    </Field>
                    <Field label="Date">
                      <input type="date" value={form.parent_consent.date} onChange={(e) => patch("parent_consent", { date: e.target.value })} />
                    </Field>
                  </div>
                  <div className="camp-field">
                    <span>Signature</span>
                    <CampSignaturePad value={form.parent_consent.signature} onChange={(signature) => patch("parent_consent", { signature })} />
                  </div>
                </div>
              )}

              {step === "form" && tab === "hear" && (
                <div className="camp-form-stack">
                  <div className="camp-field">
                    <span>How did you hear about us?</span>
                    <Radios
                      name="hear_about_source"
                      value={form.hear_about.sources[0] || ""}
                      onChange={(source) => {
                        patch("hear_about", {
                          sources: [source],
                          other_source: source === "Other" ? form.hear_about.other_source : "",
                          referred_by:
                            source === "Friend / Referral" || source === "Existing RMAA Student"
                              ? form.hear_about.referred_by
                              : "",
                        })
                      }}
                      options={HEAR_ABOUT_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                    />
                  </div>
                  {form.hear_about.sources.includes("Other") && (
                    <Field label="Other">
                      <input placeholder="Tell us how you heard about us" value={form.hear_about.other_source} onChange={(e) => patch("hear_about", { other_source: e.target.value })} />
                    </Field>
                  )}
                  {(form.hear_about.sources.includes("Friend / Referral") || form.hear_about.sources.includes("Existing RMAA Student")) && (
                    <Field label="Referred by">
                      <input placeholder="Name of the person who referred you" value={form.hear_about.referred_by} onChange={(e) => patch("hear_about", { referred_by: e.target.value })} />
                    </Field>
                  )}
                </div>
              )}

              {step === "form" && tab === "final" && (
                <div className="camp-form-stack">
                  <div className="camp-form-grid">
                    <Field label="Participant Name">
                      <input readOnly className="camp-input-locked" value={form.participant.full_name} />
                    </Field>
                    <Field label="Parent / Guardian Name">
                      <input readOnly className="camp-input-locked" value={form.parent_consent.name} />
                    </Field>
                    <Field label="Registration Date">
                      <input
                        type="date"
                        className="camp-date-locked camp-input-locked"
                        readOnly
                        value={form.final.registration_date}
                        onClick={(e) => e.preventDefault()}
                        onKeyDown={(e) => e.preventDefault()}
                      />
                    </Field>
                  </div>
                  <div className="camp-field">
                    <span>Participant Signature</span>
                    <CampSignaturePad value={form.final.signature} onChange={(signature) => patch("final", { signature })} />
                  </div>
                </div>
              )}

              {error ? <p className="camp-reg-error">{error}</p> : null}
            </div>

            <footer className="camp-reg-foot">
              <button type="button" className="camp-form-btn" onClick={goBack} disabled={step === "form" && tabIndex === 0}>
                Back
              </button>
              {step === "review" ? (
                <button
                  type="button"
                  className="camp-form-btn primary"
                  onClick={registerAndPay}
                  disabled={submitting || !form.final.agreed}
                >
                  {submitting ? "Processing…" : pendingVerify ? "Confirm payment" : "Register"}
                </button>
              ) : isLastFormTab ? (
                <button type="button" className="camp-form-btn primary" onClick={goNext}>
                  Preview
                </button>
              ) : (
                <button type="button" className="camp-form-btn primary" onClick={goNext}>
                  Next
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  )
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="camp-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="camp-choice-text">{label}</span>
    </label>
  )
}

function YesNoDetails({
  label,
  name,
  yesNo,
  details,
  onYesNo,
  onDetails,
}: {
  label: string
  name: string
  yesNo: string
  details: string
  onYesNo: (v: string) => void
  onDetails: (v: string) => void
}) {
  return (
    <div className="camp-field">
      <span>{label}</span>
      <Radios
        name={name}
        value={yesNo}
        onChange={onYesNo}
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
      />
      {yesNo === "yes" ? (
        <input value={details} onChange={(e) => onDetails(e.target.value)} placeholder={`Please describe ${label.toLowerCase()}`} />
      ) : null}
    </div>
  )
}
