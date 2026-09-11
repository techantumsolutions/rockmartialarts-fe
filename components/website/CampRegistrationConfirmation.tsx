"use client"

import { forwardRef } from "react"

export type CampPaymentSuccess = {
  event_name: string
  event_dates: string
  event_location: string
  participant_name: string
  fee_total: string
  fee_pay_now: string
  fee_balance: string
  refund_text: string
  razorpay_payment_id: string
}

export const CampRegistrationConfirmation = forwardRef<HTMLDivElement, { data: CampPaymentSuccess }>(
  function CampRegistrationConfirmation({ data }, ref) {
    return (
      <div ref={ref} className="camp-confirm-card">
        <p className="camp-confirm-kicker">Registration confirmed</p>
        <h3>{data.event_name || "Residential Camp"}</h3>
        <p className="camp-confirm-meta">
          {[data.event_dates, data.event_location].filter(Boolean).join(" • ") || "Rock Martial Arts Academy"}
        </p>
        <dl className="camp-confirm-dl">
          <div>
            <dt>Participant</dt>
            <dd>{data.participant_name || "—"}</dd>
          </div>
          <div>
            <dt>Amount paid</dt>
            <dd>{data.fee_pay_now || "50%"}</dd>
          </div>
          <div>
            <dt>Total fee</dt>
            <dd>{data.fee_total || "—"}</dd>
          </div>
          <div>
            <dt>Balance due</dt>
            <dd>{data.fee_balance || "—"}</dd>
          </div>
          {data.razorpay_payment_id ? (
            <div className="camp-confirm-full">
              <dt>Payment ID</dt>
              <dd>{data.razorpay_payment_id}</dd>
            </div>
          ) : null}
        </dl>
        {data.refund_text ? <p className="camp-confirm-note">{data.refund_text}</p> : null}
        <p className="camp-confirm-brand">Rock Martial Arts Academy</p>
      </div>
    )
  }
)
