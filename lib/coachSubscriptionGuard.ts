"use client"

import { useEffect, useState, useCallback } from "react"
import { coachSubscriptionAPI } from "./coachSubscriptionAPI"

export interface CoachSubscriptionAccess {
  isExempt: boolean
  requiresSubscription: boolean
  hasActiveSubscription: boolean
  isRestricted: boolean
  subscriptionStatus: string
  registrationSource: string
  loading: boolean
}

const EVENT_NAME = "coach-subscription-updated"

/**
 * Read coach data from localStorage and compute immediate synchronous access flags
 */
export function getStoredCoachSubscriptionAccess(): CoachSubscriptionAccess {
  if (typeof window === "undefined") {
    return {
      isExempt: true,
      requiresSubscription: false,
      hasActiveSubscription: true,
      isRestricted: false,
      subscriptionStatus: "active",
      registrationSource: "admin",
      loading: false,
    }
  }

  let coach: any = null
  try {
    const raw = localStorage.getItem("coach") || localStorage.getItem("user")
    if (raw) coach = JSON.parse(raw)
  } catch (err) {
    console.warn("Failed to parse coach from storage:", err)
  }

  const registrationSource = (coach?.registration_source || "admin").toLowerCase()
  // Admin-created coaches (or legacy without "self") are exempt
  const isExempt = registrationSource !== "self"
  const requiresSubscription = !isExempt
  const subscriptionStatus = (coach?.subscription_status || "none").toLowerCase()

  const hasActiveSubscription =
    isExempt || ["active", "grace"].includes(subscriptionStatus)
  const isRestricted = requiresSubscription && !hasActiveSubscription

  return {
    isExempt,
    requiresSubscription,
    hasActiveSubscription,
    isRestricted,
    subscriptionStatus,
    registrationSource,
    loading: false,
  }
}

/**
 * Fetch fresh subscription status from backend API and update localStorage
 */
export async function refreshCoachSubscriptionStatus(): Promise<CoachSubscriptionAccess> {
  if (typeof window === "undefined") return getStoredCoachSubscriptionAccess()

  try {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token")
    if (!token) return getStoredCoachSubscriptionAccess()

    const res = await coachSubscriptionAPI.mySubscription()
    const sub = res.subscription
    const regSource = (res.registration_source || "admin").toLowerCase()
    const isExempt = regSource !== "self"
    const requiresSub = !isExempt

    const subStatus = (sub?.status || (isExempt ? "active" : "none")).toLowerCase()
    const hasActiveSub =
      res.has_active_subscription ??
      (isExempt || ["active", "grace"].includes(subStatus))
    const isRestricted = requiresSub && !hasActiveSub

    // Update stored coach object
    try {
      const rawCoach = localStorage.getItem("coach")
      if (rawCoach) {
        const coach = JSON.parse(rawCoach)
        coach.registration_source = regSource
        coach.subscription_status = subStatus
        localStorage.setItem("coach", JSON.stringify(coach))
      }
    } catch {
      // ignore
    }

    // Broadcast update event to all subscribers/components
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: {
          isExempt,
          requiresSubscription: requiresSub,
          hasActiveSubscription: hasActiveSub,
          isRestricted,
          subscriptionStatus: subStatus,
          registrationSource: regSource,
        },
      })
    )

    return {
      isExempt,
      requiresSubscription: requiresSub,
      hasActiveSubscription: hasActiveSub,
      isRestricted,
      subscriptionStatus: subStatus,
      registrationSource: regSource,
      loading: false,
    }
  } catch (error) {
    console.warn("Failed to refresh coach subscription status from API:", error)
    return getStoredCoachSubscriptionAccess()
  }
}

/**
 * React hook to observe coach subscription status with live updates
 */
export function useCoachSubscriptionGuard() {
  const [access, setAccess] = useState<CoachSubscriptionAccess>(() =>
    getStoredCoachSubscriptionAccess()
  )
  const [loading, setLoading] = useState(true)

  const sync = useCallback(async () => {
    // 1. Initial synchronous state from localStorage
    const local = getStoredCoachSubscriptionAccess()
    setAccess(local)

    // 2. Fresh check against API
    const fresh = await refreshCoachSubscriptionStatus()
    setAccess(fresh)
    setLoading(false)
  }, [])

  useEffect(() => {
    sync()

    const handler = (event: Event) => {
      const custom = event as CustomEvent<any>
      if (custom.detail) {
        setAccess((prev) => ({
          ...prev,
          ...custom.detail,
          loading: false,
        }))
      } else {
        setAccess(getStoredCoachSubscriptionAccess())
      }
    }

    window.addEventListener(EVENT_NAME, handler)
    window.addEventListener("storage", handler)

    return () => {
      window.removeEventListener(EVENT_NAME, handler)
      window.removeEventListener("storage", handler)
    }
  }, [sync])

  return {
    ...access,
    loading,
    refresh: refreshCoachSubscriptionStatus,
  }
}

