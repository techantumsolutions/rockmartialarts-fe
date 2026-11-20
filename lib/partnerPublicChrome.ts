/**
 * Cross-chunk singleton for partner public chrome flags.
 * Uses globalThis so Next.js client chunks share one store (React context can fork).
 */

export type PartnerPublicChromeState = {
  partnerOrgId: string
  footerEnabled: boolean
} | null

type Listener = (state: PartnerPublicChromeState) => void

type Store = {
  state: PartnerPublicChromeState
  listeners: Set<Listener>
}

const GLOBAL_KEY = "__rmaa_partner_public_chrome_v1__"

function getStore(): Store {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Store }
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { state: null, listeners: new Set() }
  }
  return g[GLOBAL_KEY]!
}

export function getPartnerPublicChrome(): PartnerPublicChromeState {
  return getStore().state
}

export function setPartnerPublicChrome(next: PartnerPublicChromeState) {
  const store = getStore()
  const prev = store.state
  const same =
    prev === next ||
    (!!prev &&
      !!next &&
      prev.partnerOrgId === next.partnerOrgId &&
      prev.footerEnabled === next.footerEnabled)
  if (same) return
  store.state = next
  store.listeners.forEach((fn) => {
    try {
      fn(store.state)
    } catch {
      /* ignore */
    }
  })
}

export function clearPartnerPublicChrome() {
  setPartnerPublicChrome(null)
}

export function subscribePartnerPublicChrome(listener: Listener): () => void {
  const store = getStore()
  store.listeners.add(listener)
  return () => {
    store.listeners.delete(listener)
  }
}
