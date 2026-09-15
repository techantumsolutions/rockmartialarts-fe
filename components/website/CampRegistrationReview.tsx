"use client"

import { campRegPretty, type CampRegistrationForm } from "@/lib/campRegistration"

type Fees = {
  total: string
  payNow: string
  balance: string
  refundLabel: string
  refundText: string
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="camp-review-row">
      <dt>{label}</dt>
      <dd>{campRegPretty(value)}</dd>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="camp-review-section">
      <h3>{title}</h3>
      <dl className="camp-review-grid">{children}</dl>
    </section>
  )
}

export function CampRegistrationReview({
  form,
  fees,
}: {
  form: CampRegistrationForm
  fees: Fees
}) {
  const p = form.participant
  const t = form.training
  const m = form.medical
  const hear = form.hear_about.sources[0] || ""

  return (
    <div className="camp-review">
      <p className="camp-review-lead">Please review your details before paying the 50% registration amount.</p>

      <section className="camp-review-section camp-review-fees">
        <h3>Payment due now</h3>
        <dl className="camp-review-grid">
          <Row label="Total camp fee" value={fees.total} />
          <Row label="Pay now (50%)" value={fees.payNow} />
          <Row label="Balance" value={fees.balance} />
          <Row label={fees.refundLabel.replace(/:$/, "") || "Refund policy"} value={fees.refundText} />
        </dl>
      </section>

      <Block title="Participant">
        <Row label="Full name" value={p.full_name} />
        <Row label="Date of birth" value={p.date_of_birth} />
        <Row label="Age" value={p.age} />
        <Row label="Gender" value={p.gender} />
        <Row label="Parent / guardian" value={p.parent_guardian_name} />
        <Row label="Mobile" value={p.parent_guardian_mobile} />
        <Row label="Alternate contact" value={p.alternate_contact} />
        <Row label="Email" value={p.email} />
        <Row label="Address" value={p.address} />
      </Block>

      <Block title="Training">
        <Row label="Shaolin beginner" value={t.shaolin_beginner} />
        <Row label="Trained before" value={t.trained_before} />
        {t.trained_before === "yes" ? <Row label="Details" value={t.trained_details} /> : null}
        <Row label="Current sports" value={t.current_sports} />
        <Row label="Fitness level" value={t.fitness_level} />
      </Block>

      <Block title="Medical">
        <Row label="Injury" value={m.injury === "yes" ? m.injury_details : m.injury} />
        <Row label="Medical condition" value={m.medical_condition === "yes" ? m.medical_condition_details : m.medical_condition} />
        <Row label="Allergies" value={m.allergies === "yes" ? m.allergies_details : m.allergies} />
        <Row label="Medication" value={m.medication === "yes" ? m.medication_details : m.medication} />
        <Row label="Blood group" value={m.blood_group} />
      </Block>

      <Block title="Food">
        <Row label="Preference" value={form.food.preference} />
        <Row label="Dietary restriction" value={form.food.dietary_restriction === "yes" ? form.food.dietary_details : form.food.dietary_restriction} />
      </Block>

      <Block title="Emergency">
        <Row label="Contact" value={form.emergency.name} />
        <Row label="Relationship" value={form.emergency.relationship} />
        <Row label="Phone" value={form.emergency.phone} />
        <Row label="Alternate" value={form.emergency.alternate_phone} />
      </Block>

      <Block title="Camp">
        <Row label="Attended before" value={form.residential.attended_before} />
        <Row label="Special requirements" value={form.residential.special_requirements === "yes" ? form.residential.special_requirements_details : form.residential.special_requirements} />
      </Block>

      <Block title="Consents">
        <Row label="Camp rules" value={form.rules.agree_rules ? "Accepted" : "Not accepted"} />
        <Row label="Photo / video" value={form.photo.consent ? "Consent given" : "No"} />
        <Row label="Parent consent" value={form.parent_consent.agreed ? "Agreed" : "No"} />
        <Row label="Parent / guardian" value={form.parent_consent.name} />
        <Row label="Relationship" value={form.parent_consent.relationship} />
      </Block>

      {form.parent_consent.signature ? (
        <section className="camp-review-section">
          <h3>Parent signature</h3>
          <img src={form.parent_consent.signature} alt="Parent signature" className="camp-review-sign" />
        </section>
      ) : null}

      <Block title="Source">
        <Row label="How did you hear" value={hear} />
        {hear === "Other" ? <Row label="Other" value={form.hear_about.other_source} /> : null}
        {hear === "Friend / Referral" || hear === "Existing RMAA Student" ? (
          <Row label="Referred by" value={form.hear_about.referred_by} />
        ) : null}
      </Block>

      <Block title="Declaration">
        <Row label="Participant" value={form.participant.full_name} />
        <Row label="Guardian" value={form.parent_consent.name} />
        <Row label="Registration date" value={form.final.registration_date} />
      </Block>

      {form.final.signature ? (
        <section className="camp-review-section">
          <h3>Participant signature</h3>
          <img src={form.final.signature} alt="Participant signature" className="camp-review-sign" />
        </section>
      ) : null}
    </div>
  )
}
