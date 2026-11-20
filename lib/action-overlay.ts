/**
 * Global action overlay — blocks double-clicks with a martial-arts loader.
 * Always auto-releases so admin / website UI cannot freeze permanently.
 */

type Listener = () => void

export type ActionOverlayMode = "full" | "short"

type State = {
  locked: boolean
  visible: boolean
  label: string
  mode: ActionOverlayMode
}

const listeners = new Set<Listener>()

let state: State = {
  locked: false,
  visible: false,
  label: "",
  mode: "full",
}

let lockTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function notify() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch {
      /* ignore */
    }
  })
}

function clearTimers() {
  if (lockTimer) {
    clearTimeout(lockTimer)
    lockTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

export function subscribeActionOverlay(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getActionOverlayState(): State {
  return { ...state }
}

export function isActionLocked() {
  return state.locked
}

export function beginActionOverlay(opts?: {
  label?: string
  /** full = page overlay; short = compact corner/center chip */
  mode?: ActionOverlayMode
  /** How long the UI stays click-locked (ms) */
  lockMs?: number
  /** How long the visual overlay stays (ms); 0 = no visual (lock only) */
  overlayMs?: number
  /** When false, lock clicks but do not show any loader UI */
  showVisual?: boolean
}): boolean {
  if (state.locked) return false

  const mode = opts?.mode || "full"
  const lockMs = Math.max(
    180,
    Math.min(opts?.lockMs ?? (mode === "short" ? 450 : 1200), 2500)
  )
  const showVisual = opts?.showVisual !== false && (opts?.overlayMs ?? 1) > 0
  // Visual can outlive the click-lock (esp. navigations waiting for route load)
  const overlayMs = showVisual
    ? Math.max(
        140,
        Math.min(opts?.overlayMs ?? (mode === "short" ? 380 : 1000), 12000)
      )
    : 0

  clearTimers()
  state = {
    locked: true,
    visible: showVisual,
    label: (opts?.label || "").trim(),
    mode,
  }
  notify()

  if (showVisual) {
    hideTimer = setTimeout(() => {
      state = { ...state, visible: false, label: "", mode: "full" }
      notify()
    }, overlayMs)
  }

  lockTimer = setTimeout(() => {
    // Unlock clicks without forcing the visual off — hideTimer / endActionOverlay handle that
    state = { ...state, locked: false }
    if (!showVisual) {
      state = { locked: false, visible: false, label: "", mode: "full" }
    }
    notify()
  }, lockMs)

  return true
}

export function endActionOverlay() {
  clearTimers()
  if (!state.locked && !state.visible) return
  state = { locked: false, visible: false, label: "", mode: "full" }
  notify()
}

const SKIP_SELECTOR = [
  "[data-no-overlay]",
  "[data-no-loader]",
  "[data-radix-collection-item]",
  "[role='option']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='combobox']",
  "[aria-haspopup='listbox']",
  "[aria-haspopup='menu']",
  "[aria-haspopup='dialog']",
  ".training-program-slider-arrow",
  ".card-slider-arrow",
  "[data-embla-arrow]",
].join(",")

export function shouldSkipActionOverlayTarget(el: Element | null): boolean {
  if (!el || !(el instanceof Element)) return true
  if (el.closest(SKIP_SELECTOR)) return true
  if (el.closest("[data-state='open']")) {
    // Allow closing / choosing inside open menus without a full lock
    const interactive = el.closest("button, a, [role='button']")
    if (interactive?.closest("[role='menu'], [role='listbox'], [data-radix-popper-content-wrapper]")) {
      return true
    }
  }
  // Carousel / slider chevrons by aria-label
  const btn = el.closest("button, a, [role='button']") as HTMLElement | null
  if (!btn) return true
  if ((btn as HTMLButtonElement).disabled || btn.getAttribute("aria-disabled") === "true") {
    return true
  }
  const label = `${btn.getAttribute("aria-label") || ""} ${btn.textContent || ""}`.toLowerCase()
  if (
    label.includes("previous") ||
    label.includes("next") ||
    label.includes("close") ||
    label.includes("dismiss")
  ) {
    return true
  }
  return false
}

export function findActionButton(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof Element)) return null
  const el = target.closest(
    "button, a[href], [role='button'], input[type='submit'], input[type='button']"
  ) as HTMLElement | null
  return el
}

export function inferOverlayMode(el: HTMLElement): ActionOverlayMode {
  if (el.dataset.overlayMode === "short" || el.dataset.loader === "short") return "short"
  if (el.dataset.overlayMode === "full" || el.dataset.loader === "full") return "full"

  const tag = el.tagName.toLowerCase()
  if (tag === "a" && el.getAttribute("href")) {
    const href = el.getAttribute("href") || ""
    if (href.startsWith("#") || href.startsWith("javascript:")) return "short"
    if (el.getAttribute("target") === "_blank") return "short"
    return "full"
  }

  const type = (el.getAttribute("type") || "").toLowerCase()
  if (type === "submit") return "full"

  // Generic buttons → short loader (prevents double-tap without blocking navigation long)
  return "short"
}
