/**
 * Student Payment API - Handles payment-related operations for students
 */

import { BaseAPI } from './baseAPI'
import { TokenManager } from './tokenManager'

export interface PaymentRecord {
  id: string
  student_id: string
  enrollment_id?: string
  /** Top-level from list API aggregation (preferred over course_details). */
  course_name?: string
  /** Razorpay method key when stored (e.g. upi, card, netbanking). */
  gateway_method?: string
  /** Human-readable label from gateway (e.g. UPI, Card (VISA ••••1234)). */
  gateway_payment_label?: string
  amount: number
  payment_type: 'admission_fee' | 'course_fee' | 'monthly_fee' | 'registration_fee'
  payment_method: 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'digital_wallet' | 'cash' | 'bank_transfer'
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'processing' | 'failed'
  transaction_id?: string
  payment_date?: string
  due_date: string
  notes?: string
  payment_proof?: string
  course_details?: {
    course_id: string
    course_name: string
    category_id: string
    duration: string
  }
  branch_details?: {
    branch_id: string
    branch_name: string
  }
  created_at: string
  updated_at: string
}

export interface PaymentStats {
  total_paid: number
  total_pending: number
  total_overdue: number
  next_due_date?: string
  next_due_amount?: number
  payment_history_count: number
}

export interface EnrollmentWithPayments {
  id: string
  course_id: string
  course_name: string
  branch_id: string
  branch_name: string
  enrollment_date: string
  start_date: string
  end_date: string
  fee_amount: number
  admission_fee: number
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payments: PaymentRecord[]
  outstanding_balance: number
}

class StudentPaymentAPI extends BaseAPI {
  /**
   * Get student's payment history
   */
  async getPaymentHistory(token?: string): Promise<PaymentRecord[]> {
    const authToken = token || TokenManager.getToken()
    
    if (!authToken) {
      throw new Error('Authentication token required')
    }

    try {
      // Use the general payments endpoint which filters by student role automatically
      const response = await this.makeRequest(`/api/payments?_ts=${Date.now()}`, {
        method: 'GET',
        token: authToken
      })

      return response.payments || []
    } catch (error) {
      console.error('Error fetching payment history:', error)
      throw error
    }
  }

  /**
   * Get student's payment statistics
   */
  async getPaymentStats(token?: string): Promise<PaymentStats> {
    const authToken = token || TokenManager.getToken()
    
    if (!authToken) {
      throw new Error('Authentication token required')
    }

    try {
      const payments = await this.getPaymentHistory(authToken)
      
      const stats: PaymentStats = {
        total_paid: 0,
        total_pending: 0,
        total_overdue: 0,
        payment_history_count: payments.length
      }

      let nextDueDate: Date | null = null
      let nextDueAmount = 0

      payments.forEach(payment => {
        switch (payment.payment_status) {
          case 'paid':
            stats.total_paid += payment.amount
            break
          case 'pending':
            stats.total_pending += payment.amount
            // Check if this is the next due payment
            const dueDate = new Date(payment.due_date)
            if (!nextDueDate || dueDate < nextDueDate) {
              nextDueDate = dueDate
              nextDueAmount = payment.amount
            }
            break
          case 'overdue':
            stats.total_overdue += payment.amount
            break
        }
      })

      if (nextDueDate) {
        stats.next_due_date = nextDueDate.toISOString()
        stats.next_due_amount = nextDueAmount
      }

      return stats
    } catch (error) {
      console.error('Error calculating payment stats:', error)
      throw error
    }
  }

  /**
   * Get student's enrollments with payment details
   */
  async getEnrollmentsWithPayments(token?: string): Promise<EnrollmentWithPayments[]> {
    const authToken = token || TokenManager.getToken()
    
    if (!authToken) {
      throw new Error('Authentication token required')
    }

    try {
      // Get user info to get student ID
      const userResponse = await this.makeRequest('/api/auth/me', {
        method: 'GET',
        token: authToken
      })

      const studentId = userResponse.id

      // Get enrollments
      const enrollmentsResponse = await this.makeRequest(`/api/enrollments/students/${studentId}`, {
        method: 'GET',
        token: authToken
      })

      // Get payments
      const payments = await this.getPaymentHistory(authToken)

      // Combine enrollments with their payments
      const enrollmentsWithPayments: EnrollmentWithPayments[] = enrollmentsResponse.enrollments?.map((enrollment: any) => {
        const enrollmentPayments = payments.filter(payment => payment.enrollment_id === enrollment.id)
        
        const totalPaid = enrollmentPayments
          .filter(p => p.payment_status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0)
        
        const outstandingBalance = Math.max(0, (enrollment.fee_amount + enrollment.admission_fee) - totalPaid)

        return {
          ...enrollment,
          payments: enrollmentPayments,
          outstanding_balance: outstandingBalance
        }
      }) || []

      return enrollmentsWithPayments
    } catch (error) {
      console.error('Error fetching enrollments with payments:', error)
      throw error
    }
  }

  /**
   * Process a payment for an enrollment
   */
  async processPayment(paymentData: {
    enrollment_id: string
    amount: number
    payment_method: string
    transaction_id?: string
    notes?: string
  }, token?: string): Promise<any> {
    const authToken = token || TokenManager.getToken()
    
    if (!authToken) {
      throw new Error('Authentication token required')
    }

    try {
      return await this.makeRequest('/api/payments/students/payments', {
        method: 'POST',
        token: authToken,
        body: JSON.stringify(paymentData)
      })
    } catch (error) {
      console.error('Error processing payment:', error)
      throw error
    }
  }

  /**
   * Get payment methods available for student
   */
  getAvailablePaymentMethods(): Array<{
    value: string
    label: string
    icon?: string
  }> {
    return [
      { value: 'credit_card', label: 'Credit Card', icon: '💳' },
      { value: 'debit_card', label: 'Debit Card', icon: '💳' },
      { value: 'upi', label: 'UPI', icon: '📱' },
      { value: 'net_banking', label: 'Net Banking', icon: '🏦' },
      { value: 'digital_wallet', label: 'Digital Wallet', icon: '📱' },
      { value: 'cash', label: 'Cash', icon: '💵' },
      { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' }
    ]
  }

  /**
   * Format payment status for display
   */
  formatPaymentStatus(status: string): {
    label: string
    color: string
    bgColor: string
  } {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      paid: { label: 'Paid', color: 'text-green-700', bgColor: 'bg-green-100' },
      pending: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      overdue: { label: 'Overdue', color: 'text-red-700', bgColor: 'bg-red-100' },
      cancelled: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100' },
      processing: { label: 'Processing', color: 'text-blue-700', bgColor: 'bg-blue-100' },
      failed: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-100' }
    }

    return statusMap[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' }
  }

  /**
   * Format payment type for display
   */
  formatPaymentType(type: string): string {
    const typeMap: Record<string, string> = {
      admission_fee: 'Admission Fee',
      course_fee: 'Course Fee',
      monthly_fee: 'Monthly Fee',
      registration_fee: 'Registration Fee'
    }

    return typeMap[type] || type
  }
}

export const studentPaymentAPI = new StudentPaymentAPI()
export default studentPaymentAPI
