"use client"

import { createContext, useContext, type ReactNode } from "react"
import { getBackendApiUrl } from "@/lib/config"

const STORAGE_KEY = "bm_active_branch"

export type ActiveBranch = { id: string; name: string }

export function getActiveBranch(): ActiveBranch | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string; name?: string }
    if (!parsed?.id) return null
    return { id: String(parsed.id), name: String(parsed.name || parsed.id) }
  } catch {
    return null
  }
}

export function getActiveBranchId(): string | null {
  return getActiveBranch()?.id ?? null
}

export function setActiveBranch(branch: ActiveBranch) {
  if (typeof window === "undefined") return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: branch.id, name: branch.name })
  )
}

export function clearActiveBranch() {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
}

function branchName(branch: {
  id: string
  name?: string
  branch?: { name?: string; code?: string }
}): string {
  return branch.branch?.name || branch.name || branch.branch?.code || branch.id
}

export async function fetchAssignedBranches(token: string): Promise<ActiveBranch[]> {
  const response = await fetch(
    getBackendApiUrl("branches?skip=0&limit=100&active_only=true&include_stats=false"),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  )
  if (!response.ok) return []
  const data = await response.json()
  const list = (data.branches || []) as Array<{
    id: string
    name?: string
    branch?: { name?: string; code?: string }
  }>
  return list
    .filter((branch) => branch?.id)
    .map((branch) => ({ id: String(branch.id), name: branchName(branch) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

type ActiveBranchContextValue = {
  branches: ActiveBranch[]
  active: ActiveBranch | null
  setActive: (branch: ActiveBranch) => void
}

const ActiveBranchContext = createContext<ActiveBranchContextValue>({
  branches: [],
  active: null,
  setActive: () => {},
})

export function ActiveBranchProvider({
  value,
  children,
}: {
  value: ActiveBranchContextValue
  children: ReactNode
}) {
  return <ActiveBranchContext.Provider value={value}>{children}</ActiveBranchContext.Provider>
}

export function useActiveBranch() {
  return useContext(ActiveBranchContext)
}

function installActiveBranchFetch() {
  if (typeof window === "undefined") return
  const host = window as Window & { __bmActiveBranchFetch?: boolean }
  if (host.__bmActiveBranchFetch) return
  const original = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const id = getActiveBranchId()
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url
    const isApi = url.includes("/api/")
    const isBranchManager = !!localStorage.getItem("branch_manager")
    if (!id || !isApi || !isBranchManager) return original(input, init)
    const headers = new Headers(
      init?.headers || (input instanceof Request ? input.headers : undefined)
    )
    if (!headers.has("X-Active-Branch-Id")) headers.set("X-Active-Branch-Id", id)
    return original(input, { ...init, headers })
  }
  host.__bmActiveBranchFetch = true
}

installActiveBranchFetch()
