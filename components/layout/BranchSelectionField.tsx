"use client"

import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { getActiveBranch, useActiveBranch } from "@/lib/activeBranch"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface BranchSelectionFieldProps {
  readOnly?: boolean
  children?: ReactNode
  className?: string
  branchName?: string
  id?: string
}

export default function BranchSelectionField({
  readOnly = true,
  children,
  className,
  branchName,
  id,
}: BranchSelectionFieldProps) {
  const { active } = useActiveBranch()
  const persisted = getActiveBranch()
  const branchManager = BranchManagerAuth.getCurrentUser()

  if (!readOnly) return children ?? null

  return (
    <Input
      id={id}
      aria-label="Selected branch"
      readOnly
      value={branchName || active?.name || persisted?.name || branchManager?.branch_name || "No branch selected"}
      className={`bg-gray-50 text-gray-700 ${className || ""}`}
    />
  )
}
