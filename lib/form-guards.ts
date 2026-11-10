"use client"

import { useCallback, useRef, useState } from "react"

/** Common Indian phone: 10 digits, optional +91 / 0 prefix stripped for check */
export function isValidIndianPhone(raw: string): boolean {
  const digits = String(raw || "").replace(/\D/g, "")
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits
  return /^[6-9]\d{9}$/.test(ten)
}

export function isValidEmail(raw: string): boolean {
  const v = String(raw || "").trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function requiredMsg(label: string): string {
  return `${label} is required`
}

export function emailMsg(): string {
  return "Enter a valid email address"
}

export function phoneMsg(): string {
  return "Enter a valid 10-digit mobile number"
}

export type FieldErrors = Record<string, string>

/**
 * Lock a submit handler so the button stays disabled until the promise settles.
 * Prevents double-submit without each form reinventing isSubmitting.
 */
export function useSubmitLock() {
  const [submitting, setSubmitting] = useState(false)
  const lockRef = useRef(false)

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) return undefined
    lockRef.current = true
    setSubmitting(true)
    try {
      return await fn()
    } finally {
      lockRef.current = false
      setSubmitting(false)
    }
  }, [])

  return { submitting, run, setSubmitting }
}

/** Scroll first invalid field into view and focus it. */
export function focusFirstError(errors: FieldErrors, order?: string[]) {
  if (typeof document === "undefined") return
  const keys = order?.length ? order.filter((k) => errors[k]) : Object.keys(errors)
  const first = keys.find((k) => errors[k])
  if (!first) return
  const el =
    (document.querySelector(`[name="${first}"]`) as HTMLElement | null) ||
    (document.getElementById(first) as HTMLElement | null) ||
    (document.querySelector(`[data-field="${first}"]`) as HTMLElement | null)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" })
    if (typeof (el as HTMLInputElement).focus === "function") {
      try {
        ;(el as HTMLInputElement).focus({ preventScroll: true })
      } catch {
        ;(el as HTMLInputElement).focus()
      }
    }
  }
}
