import { BaseAPI } from './baseAPI'
import { TokenManager } from './tokenManager'

// Payment interfaces
export interface Payment {
  id: string
  student_id: string
  student_name: string
  amount: number
  payment_type: string
  payment_method: string
  payment_status: string
  transaction_id: string
  payment_date: string
  course_name?: string
  branch_name?: string
  created_at: string
}

export interface PaymentStats {
  total_collected: number
  pending_payments: number
  total_students: number
  this_month_collection: number
  monthly_revenue: number
  total_revenue: number
  payment_count: number
  average_payment: number
  /** Paid payments in the selected date range */
  period_payment_count?: number
  /** Distinct students with a paid payment in the selected range */
  students_with_payments_in_period?: number
  revenue_by_month?: Array<{
    month: string
    revenue: number
    payment_count: number
  }>
}

export interface PaymentListResponse {
  payments: Payment[]
  total: number
  skip: number
  limit: number
}

export interface PaymentFilters {
  skip?: number
  limit?: number
  status?: string
  payment_type?: string
  search?: string
  start_date?: string
  end_date?: string
  branch_id?: string
}

class PaymentAPI extends BaseAPI {
  /**
   * Trigger server-side Razorpay reconciliation (super admin only).
   * Additive: does not change payment flows; just fixes stale statuses.
   */
  async syncRazorpayPayments(token?: string): Promise<any> {
    const authToken = token || TokenManager.getToken()
    return await this.makeRequest('/api/payments/sync-razorpay', {
      method: 'POST',
      token: authToken,
    })
  }

  /**
   * Get payment statistics for dashboard
   */
  async getPaymentStats(token?: string, params?: { start_date?: string; end_date?: string; period?: string; branch_id?: string }): Promise<PaymentStats> {
    const authToken = token || TokenManager.getToken()

    const searchParams = new URLSearchParams()
    if (params?.start_date) searchParams.append('start_date', params.start_date)
    if (params?.end_date) searchParams.append('end_date', params.end_date)
    if (params?.period) searchParams.append('period', params.period)
    if (params?.branch_id) searchParams.append('branch_id', params.branch_id)

    let endpoint = '/api/payments/stats'
    const qs = searchParams.toString()
    if (qs) endpoint += `?${qs}`

    return await this.makeRequest(endpoint, {
      method: 'GET',
      token: authToken
    })
  }

  /**
   * Get payments list with filtering
   */
  async getPayments(filters: PaymentFilters = {}, token?: string): Promise<PaymentListResponse> {
    const authToken = token || TokenManager.getToken()
    
    let endpoint = '/api/payments'
    const searchParams = new URLSearchParams()
    
    // Add filters to search params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })
    
    if (searchParams.toString()) {
      endpoint += `?${searchParams.toString()}`
    }

    return await this.makeRequest(endpoint, {
      method: 'GET',
      token: authToken
    })
  }

  /**
   * Get recent payments for dashboard
   */
  async getRecentPayments(limit: number = 10, token?: string): Promise<Payment[]> {
    const authToken = token || TokenManager.getToken()
    
    const response = await this.getPayments({ limit, skip: 0 }, authToken)
    return response.payments || []
  }

  /**
   * Get monthly revenue data for charts
   */
  async getMonthlyRevenue(months: number = 12, token?: string): Promise<Array<{
    month: string
    revenue: number
    payment_count: number
  }>> {
    const authToken = token || TokenManager.getToken()
    
    try {
      const stats = await this.getPaymentStats(authToken)
      
      // If the API provides monthly breakdown, use it
      if (stats.revenue_by_month && stats.revenue_by_month.length > 0) {
        return stats.revenue_by_month.slice(-months)
      }
      
      // Otherwise, create a basic structure with current month data
      const currentMonth = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
      
      return [{
        month: currentMonth,
        revenue: stats.monthly_revenue || 0,
        payment_count: stats.payment_count || 0
      }]
    } catch (error) {
      console.error('Error fetching monthly revenue:', error)
      return []
    }
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(paymentId: string, token?: string): Promise<Payment> {
    const authToken = token || TokenManager.getToken()
    
    return await this.makeRequest(`/api/payments/${paymentId}`, {
      method: 'GET',
      token: authToken
    })
  }

  /**
   * Cancel a mistaken/pending payment attempt (super admin only)
   */
  async cancelPayment(paymentId: string, token?: string): Promise<{ message: string }> {
    const authToken = token || TokenManager.getToken()
    return await this.makeRequest(`/api/payments/${paymentId}/cancel`, {
      method: 'PUT',
      token: authToken,
    })
  }

  /**
   * Recover an admin-cancelled payment row (super admin only).
   */
  async recoverCancelledPayment(
    paymentId: string,
    payload: { action: 'restore_checkout' | 'mark_received' | 'waive'; note?: string },
    token?: string
  ): Promise<{ message: string }> {
    const authToken = token || TokenManager.getToken()
    return await this.makeRequest(`/api/payments/${paymentId}/recover`, {
      method: 'POST',
      token: authToken,
      body: payload,
    })
  }

  /**
   * Process a payment (for registration or student payments)
   */
  async processPayment(paymentData: any, token?: string): Promise<any> {
    const authToken = token || TokenManager.getToken()
    
    return await this.makeRequest('/api/payments/process-registration', {
      method: 'POST',
      token: authToken,
      body: JSON.stringify(paymentData)
    })
  }

  /**
   * Get payment course info
   */
  async getCoursePaymentInfo(
    courseId: string,
    branchId: string,
    duration: string,
    batchRef?: string
  ): Promise<any> {
    const batchQ =
      batchRef?.trim() ? `&batch_ref=${encodeURIComponent(batchRef.trim())}` : ""
    return await this.makeRequest(
      `/api/courses/${courseId}/payment-info?branch_id=${branchId}&duration=${duration}${batchQ}`,
      {
        method: 'GET'
      }
    )
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number, currency: string = 'INR'): string {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  /**
   * Format payment status for display
   */
  formatPaymentStatus(status: string): { label: string; color: string } {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return { label: 'Paid', color: 'text-green-600' }
      case 'pending':
        return { label: 'Pending', color: 'text-yellow-600' }
      case 'failed':
        return { label: 'Failed', color: 'text-red-600' }
      case 'refunded':
        return { label: 'Refunded', color: 'text-blue-600' }
      default:
        return { label: status, color: 'text-gray-600' }
    }
  }

  /**
   * Export payments as CSV
   */
  async exportPayments(filters: {
    status?: string
    payment_type?: string
    branch_id?: string
    start_date?: string
    end_date?: string
    format?: string
  } = {}, token?: string): Promise<void> {
    const authToken = token || TokenManager.getToken()

    // Build query parameters
    const params = new URLSearchParams()
    if (filters.status && filters.status !== 'all') params.append('status', filters.status)
    if (filters.payment_type && filters.payment_type !== 'all') params.append('payment_type', filters.payment_type)
    if (filters.branch_id && filters.branch_id !== 'all') params.append('branch_id', filters.branch_id)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    params.append('format', filters.format || 'csv')

    try {
      const response = await fetch(`${this.baseURL}/api/payments/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Export failed: ${response.status}`)
      }

      const data = await response.json()

      // Create and download the file
      const blob = new Blob([data.content], { type: data.content_type })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method: string | null | undefined): string {
    const m = (method || '').toLowerCase()
    switch (m) {
      case 'credit_card':
        return 'Credit card'
      case 'debit_card':
        return 'Debit card'
      case 'upi':
        return 'UPI'
      case 'net_banking':
        return 'Net banking'
      case 'digital_wallet':
        return 'Online (UPI / card / wallet)'
      case 'cash':
        return 'Cash'
      case 'bank_transfer':
        return 'Bank transfer'
      case 'cheque':
        return 'Cheque'
      default:
        return m ? m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'
    }
  }

  /** Prefer gateway label from API (UPI, card network, etc.); else format payment_method. */
  formatPaymentSource(payment: {
    gateway_payment_label?: string | null
    payment_method?: string | null
  }): string {
    const label = payment.gateway_payment_label?.trim()
    if (label) return label
    return this.formatPaymentMethod(payment.payment_method || '')
  }
}

// Export singleton instance
export const paymentAPI = new PaymentAPI()
export default paymentAPI
