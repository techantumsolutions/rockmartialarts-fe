// Razorpay integration utilities

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  theme?: {
    color?: string
  }
  handler: (response: RazorpayPaymentResponse) => void
  modal?: {
    ondismiss?: () => void
  }
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_signature?: string
}

export interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (response: unknown) => void) => void
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

/**
 * Load Razorpay script dynamically
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Initialize Razorpay checkout
 */
export const initializeRazorpay = async (
  options: RazorpayOptions
): Promise<RazorpayInstance | null> => {
  const loaded = await loadRazorpayScript()
  
  if (!loaded) {
    console.error('Failed to load Razorpay script')
    return null
  }

  if (typeof window === 'undefined' || !window.Razorpay) {
    console.error('Razorpay not available')
    return null
  }

  return new window.Razorpay(options)
}

/**
 * Open Razorpay checkout with payment details
 */
export const openRazorpayCheckout = async (
  paymentDetails: {
    /** Amount in rupees (used only when amountPaise is not set and no order_id). */
    amount?: number
    /** Authoritative amount in paise from Razorpay order (avoids double ×100). */
    amountPaise?: number
    /** Prefer server-returned publishable key (matches `/api/payments/create-order` / reg-checkout). */
    razorpayKeyId?: string
    currency?: string
    name: string
    description: string
    customerName?: string
    customerEmail?: string
    customerContact?: string
    orderId?: string
    onSuccess: (response: RazorpayPaymentResponse) => void
    onDismiss?: () => void
    onPaymentFailure?: (message: string) => void
  }
): Promise<void> => {
  const keyId =
    (typeof paymentDetails.razorpayKeyId === 'string' && paymentDetails.razorpayKeyId.trim()) ||
    (typeof process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'string' &&
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.trim()) ||
    ''

  if (!keyId) {
    throw new Error('Razorpay Key ID not configured')
  }

  let amountPaise: number
  if (typeof paymentDetails.amountPaise === 'number') {
    amountPaise = Math.round(paymentDetails.amountPaise)
  } else if (typeof paymentDetails.amount === 'number') {
    amountPaise = Math.round(paymentDetails.amount * 100)
  } else {
    throw new Error('Missing payment amount')
  }

  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    throw new Error('Invalid payment amount')
  }

  const options: RazorpayOptions = {
    key: keyId,
    amount: amountPaise,
    currency: paymentDetails.currency || 'INR',
    name: paymentDetails.name,
    description: paymentDetails.description,
    ...(paymentDetails.orderId ? { order_id: paymentDetails.orderId } : {}),
    prefill: {
      name: paymentDetails.customerName,
      email: paymentDetails.customerEmail,
      contact: paymentDetails.customerContact,
    },
    theme: {
      color: '#facc15', // Yellow-400 to match your theme
    },
    handler: paymentDetails.onSuccess,
    modal: {
      ondismiss: paymentDetails.onDismiss,
    },
  }

  const razorpay = await initializeRazorpay(options)
  
  if (!razorpay) {
    throw new Error('Failed to initialize Razorpay')
  }

  razorpay.on('payment.failed', (response: any) => {
    console.error('[openRazorpayCheckout] payment.failed', response)
    const msg =
      response?.error?.description ||
      response?.error?.code ||
      'Payment failed, please try again'
    paymentDetails.onPaymentFailure?.(msg)
  })

  razorpay.open()
}

/**
 * Format amount for display
 */
export const formatAmount = (amount: number, currency: string = 'INR'): string => {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
