/**
 * Action overlay helpers — disabled.
 * The previous global click lock + full-screen loader broke live admin UI.
 */

type Listener = () => void

const listeners = new Set<Listener>()

export function subscribeActionOverlay(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getActionOverlayState() {
  return { locked: false, visible: false, label: "" }
}

export function isActionLocked() {
  return false
}

export function beginActionOverlay(_opts?: {
  label?: string
  lockMs?: number
  overlayMs?: number
}): boolean {
  return true
}

export function endActionOverlay() {}

export function shouldSkipActionOverlayTarget(_el: Element | null): boolean {
  return true
}

export function findActionButton(_target: EventTarget | null): HTMLElement | null {
  return null
}
