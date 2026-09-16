/** M05-S01 enrollment cart client (FastAPI via /api/backend/carts). */

export const GUEST_CART_TOKEN_KEY = "rock_enrollment_cart_guest_token"

export type CartItemPricing = {
  course_fee: number
  admission_fee: number
  total_amount: number
  currency: string
  duration_multiplier?: number
  original_price?: number | null
  discount_amount?: number | null
  is_flat_price?: boolean
}

export type CartItem = {
  id: string
  student_line_id: string
  course_id: string
  branch_id: string
  duration_id: string
  batch_ref?: string | null
  course_name: string
  branch_name: string
  category_name: string
  duration_name: string
  pricing: CartItemPricing
}

export type CartStudent = {
  student_line_id: string
  student_id?: string | null
  label: string
  email?: string | null
  phone?: string | null
}

export type CartStudentGroup = CartStudent & {
  items: CartItem[]
  line_total: number
}

export type CartDiscountLine = {
  rule_id?: string
  rule_code?: string
  rule_name?: string
  trigger?: string
  discount_kind?: string
  discount_value?: number
  amount: number
  apply_scope?: string
  student_line_id?: string | null
  eligible_subtotal?: number
}

export type CartDiscountSnapshot = {
  computed_at?: string
  subtotal_amount?: number
  promo_discount_total?: number
  total_amount?: number
  rules_applied?: CartDiscountLine[]
  breakdown?: CartDiscountLine[]
}

export type CartTotals = {
  currency: string
  course_fee_subtotal: number
  admission_fee_subtotal: number
  subtotal_amount?: number
  promo_discount_total?: number
  total_amount: number
  item_count: number
  student_count?: number
}

export type EnrollmentCart = {
  id: string
  owner_user_id?: string | null
  guest_token?: string | null
  status: string
  students: CartStudent[]
  items: CartItem[]
  student_groups: CartStudentGroup[]
  totals: CartTotals
  validation_issues: Array<{ code: string; message: string; item_id?: string; student_line_id?: string }>
  discount_breakdown?: CartDiscountLine[]
  discount_snapshot?: CartDiscountSnapshot | null
  is_valid: boolean
  updated_at?: string
}

export function getGuestCartToken(): string {
  if (typeof window === "undefined") return ""
  let token = localStorage.getItem(GUEST_CART_TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(GUEST_CART_TOKEN_KEY, token)
  }
  return token
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Guest-Cart-Token": getGuestCartToken(),
  }
  try {
    const raw = localStorage.getItem("auth_data")
    if (raw) {
      const parsed = JSON.parse(raw) as { access_token?: string }
      if (parsed.access_token) {
        headers.Authorization = `Bearer ${parsed.access_token}`
      }
    }
  } catch {
    /* ignore */
  }
  return headers
}

async function cartRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend/carts/${path.replace(/^\//, "")}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
    cache: "no-store",
  })
  const text = await res.text()
  let body: unknown = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { detail: text }
  }
  if (!res.ok) {
    const detail =
      typeof body === "object" && body && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : res.statusText
    throw new Error(detail || "Cart request failed")
  }
  return body as T
}

export async function fetchEnrollmentCart(): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>("current")
  if (data.cart?.guest_token) {
    localStorage.setItem(GUEST_CART_TOKEN_KEY, data.cart.guest_token)
  }
  return data.cart
}

export async function addCartStudent(payload: {
  label: string
  student_id?: string
  email?: string
  phone?: string
}): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>("current/students", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data.cart
}

export type CartBulkSummary = {
  added: number
  requested: number
  skipped: Array<{ course_id?: string | null; label?: string; reason: string }>
}

export async function addCartStudentsBulk(
  students: Array<{ label: string; student_id?: string; email?: string; phone?: string }>
): Promise<{ cart: EnrollmentCart; bulk_summary?: CartBulkSummary }> {
  const data = await cartRequest<{ cart: EnrollmentCart; bulk_summary?: CartBulkSummary }>(
    "current/students/bulk",
    {
      method: "POST",
      body: JSON.stringify({ students }),
    }
  )
  return { cart: data.cart, bulk_summary: data.bulk_summary }
}

export async function updateCartStudent(
  studentLineId: string,
  payload: { label?: string; email?: string; phone?: string }
): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>(
    `current/students/${encodeURIComponent(studentLineId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
  return data.cart
}

export async function removeCartStudent(studentLineId: string): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>(
    `current/students/${encodeURIComponent(studentLineId)}`,
    { method: "DELETE" }
  )
  return data.cart
}

export async function addCartItem(payload: {
  student_line_id: string
  course_id: string
  branch_id: string
  duration_id: string
  batch_ref?: string
}): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>("current/items", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data.cart
}

export async function addCartItemsMulti(payload: {
  student_line_id: string
  branch_id: string
  selections: Array<{ course_id: string; duration_id: string; batch_ref?: string }>
}): Promise<{ cart: EnrollmentCart; bulk_summary?: CartBulkSummary }> {
  const data = await cartRequest<{ cart: EnrollmentCart; bulk_summary?: CartBulkSummary }>(
    "current/items/multi",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
  return { cart: data.cart, bulk_summary: data.bulk_summary }
}

export async function removeCartItem(itemId: string): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>(
    `current/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" }
  )
  return data.cart
}

export async function validateEnrollmentCart(): Promise<EnrollmentCart> {
  const data = await cartRequest<{ cart: EnrollmentCart }>("current/validate", {
    method: "POST",
    body: JSON.stringify({}),
  })
  return data.cart
}

export type CartCheckoutPrepareResult = {
  cart_checkout_id: string
  amount: number
  currency: string
  item_count: number
  student_count: number
  promo_discount_total?: number
  discount_breakdown?: CartDiscountLine[]
  enrollment_ids: string[]
  order: { id: string; amount: number; currency: string }
  key: string
}

export async function prepareCartCheckout(): Promise<CartCheckoutPrepareResult> {
  return cartRequest<CartCheckoutPrepareResult>("current/checkout/prepare", {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export async function confirmCartCheckout(payload: {
  cart_checkout_id: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): Promise<{
  message?: string
  already_fulfilled?: boolean
  cart_checkout_id: string
  enrollment_ids?: string[]
  status?: string
  item_count?: number
}> {
  return cartRequest("checkout/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function fetchCartCheckout(checkoutId: string): Promise<{
  checkout: {
    id: string
    status: string
    amount_inr?: number
    totals?: CartTotals
    enrollment_links?: Array<{
      enrollment_id: string
      course_name?: string
      student_label?: string
      branch_name?: string
    }>
    discount_snapshot?: CartDiscountSnapshot | null
  }
}> {
  return cartRequest(`checkout/${encodeURIComponent(checkoutId)}`)
}

export function formatInr(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}
