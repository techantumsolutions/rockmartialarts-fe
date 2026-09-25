"use client"

import Link from "next/link"

export type RegistrationAccountType = "single" | "family"

type StepDef = {
  n: number
  label: string
  href?: string
}

const SINGLE_STEPS: StepDef[] = [
  { n: 1, label: "Personal Information", href: "/register" },
  { n: 2, label: "Branch Selection", href: "/register/select-branch" },
  { n: 3, label: "Course Selection", href: "/register/select-course" },
  { n: 4, label: "Payment", href: "/register/payment" },
  { n: 5, label: "Payment Confirmation" },
]

const FAMILY_STEPS: StepDef[] = [
  { n: 1, label: "Personal Information", href: "/register" },
  { n: 2, label: "Family students", href: "/register/family-students" },
  { n: 3, label: "Payment", href: "/register/payment" },
  { n: 4, label: "Payment Confirmation" },
]

function circleClass(n: number, current: number) {
  if (n < current) return "bg-green-500 text-white"
  if (n === current) return "bg-yellow-400 text-black"
  return "bg-gray-200 text-gray-400"
}

function barClass(afterStep: number, current: number) {
  return afterStep < current ? "bg-green-500" : afterStep === current ? "bg-yellow-400" : "bg-gray-200"
}

type Props = {
  accountType?: RegistrationAccountType | null
  /** 1-based index within the flow for this account type */
  currentStep: number
  /**
   * When true, completed steps are not links (e.g. payment confirmation is forward-only).
   * Default: completed steps with href are clickable.
   */
  disableBackLinks?: boolean
  className?: string
}

/**
 * Bottom registration stepper. Family account uses 4 steps (personal → family students →
 * payment → confirmation). Single account keeps 5 steps (personal → branch → course →
 * payment → confirmation). Avoids mismatched "of 3/4/5" labels across pages.
 */
export function RegistrationStepIndicator({
  accountType = "single",
  currentStep,
  disableBackLinks = false,
  className = "",
}: Props) {
  const isFamily = accountType === "family"
  const steps = isFamily ? FAMILY_STEPS : SINGLE_STEPS
  const total = steps.length
  const current = Math.min(Math.max(currentStep, 1), total)
  const currentLabel = steps[current - 1]?.label || ""

  return (
    <div className={`text-center py-4 ${className}`.trim()}>
      <div className="flex items-center justify-center space-x-2 mb-2">
        {steps.map((step, i) => {
          const canLink = !disableBackLinks && step.n < current && Boolean(step.href)
          const cls = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${circleClass(step.n, current)}${
            canLink ? " cursor-pointer hover:opacity-90 transition-opacity" : ""
          }`

          return (
            <div key={step.n} className="contents">
              {canLink ? (
                <Link href={step.href!} className={cls}>
                  {step.n}
                </Link>
              ) : (
                <div className={cls}>{step.n}</div>
              )}
              {i < steps.length - 1 ? (
                <div className={`w-8 h-1 rounded ${barClass(step.n, current)}`} />
              ) : null}
            </div>
          )
        })}
      </div>
      <span className="text-gray-500 text-sm font-medium">
        Step {current} of {total} - {currentLabel}
      </span>
    </div>
  )
}
