import { NextRequest, NextResponse } from 'next/server'
import { getBackendProxyBaseUrl } from '@/lib/serverBackendUrl'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function GET() {
  return NextResponse.json(
    { error: 'Use POST to verify payment' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export async function POST(req: NextRequest) {
  const BACKEND_URL = getBackendProxyBaseUrl().replace(/\/$/, '')
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      enrollmentData,
    } = body

    if (!razorpay_payment_id) {
      return NextResponse.json(
        { error: 'Missing razorpay_payment_id' },
        { status: 400 }
      )
    }

    if (!enrollmentData?.enrollment_id) {
      return NextResponse.json(
        { error: 'Missing enrollmentData.enrollment_id' },
        { status: 400 }
      )
    }

    const confirmBody = {
      enrollment_id: enrollmentData.enrollment_id,
      razorpay_payment_id,
      razorpay_order_id: razorpay_order_id || undefined,
      razorpay_signature: razorpay_signature || undefined,
      duration_months: enrollmentData.duration_months ?? undefined,
      course_name: enrollmentData.course_name ?? undefined,
      branch_name: enrollmentData.branch_name ?? undefined,
    }

    const res = await fetch(`${BACKEND_URL}/api/payments/confirm-razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(confirmBody),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const message =
        typeof data?.detail === 'string'
          ? data.detail
          : Array.isArray(data?.detail)
            ? data.detail.map((o: { msg?: string }) => o?.msg).filter(Boolean).join('; ') || 'Backend rejected verification'
            : data?.message ?? data?.error ?? 'Backend rejected verification'
      return NextResponse.json(
        { error: message },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      message: data?.message ?? 'Payment verified successfully',
      payment_id: data?.payment_id,
      invoice_id: data?.invoice_id,
      invoice_number: data?.invoice_number,
      is_renewal: data?.is_renewal === true,
      new_end_date: data?.new_end_date ?? null,
      prior_end_date: data?.prior_end_date ?? null,
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
