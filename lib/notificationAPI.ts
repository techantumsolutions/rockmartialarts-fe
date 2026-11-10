import { TokenManager } from './tokenManager'
import { BranchManagerAuth } from './branchManagerAuth'

export interface PaymentNotification {
  id: string
  payment_id: string
  student_id: string
  notification_type: string
  title: string
  message: string
  amount?: number
  course_name?: string
  branch_name?: string
  is_read: boolean
  priority: string
  created_at: string
  read_at?: string
}

export interface LeadNotification {
  id: string
  lead_id: string
  lead_name?: string
  notification_type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  priority: string
  created_at: string
  read_at?: string
}

export interface MessageNotification {
  id: string
  message_id: string
  thread_id: string
  recipient_id: string
  recipient_type: string
  sender_id: string
  sender_name: string
  sender_type: string
  notification_type: string
  title: string
  message: string
  subject: string
  is_read: boolean
  priority: string
  created_at: string
  read_at?: string
}

export interface NotificationResponse {
  notifications: PaymentNotification[]
  total: number
  unread_count: number
}

export interface MessageNotificationResponse {
  notifications: MessageNotification[]
  total: number
  unread_count: number
}

export interface LeadNotificationResponse {
  notifications: LeadNotification[]
  total: number
  unread_count: number
}

export type InAppNotification =
  | PaymentNotification
  | MessageNotification
  | LeadNotification

class NotificationAPI {
  /** Use the same-origin proxy so all browser requests stay on HTTPS */
  private baseURL: string

  constructor() {
    // In the browser, always go through the Next.js proxy to avoid mixed-content issues
    if (typeof window !== 'undefined') {
      this.baseURL = '/api/backend'
    } else {
      this.baseURL = (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8003') + '/api'
    }
  }

  private getUserRole(): string | null {
    // Check if user is a branch manager
    const branchManagerUser = BranchManagerAuth.getCurrentUser()
    if (branchManagerUser && branchManagerUser.role === 'branch_manager') {
      return 'branch_manager'
    }

    // Check if user is superadmin or other role via TokenManager
    const token = TokenManager.getToken()
    if (token) {
      try {
        const user = TokenManager.getUser()
        return user?.role || null
      } catch (error) {
        console.error('Error getting user role:', error)
        return null
      }
    }

    return null
  }

  private getAuthToken(): string | null {
    // Check if user is a branch manager first
    const branchManagerUser = BranchManagerAuth.getCurrentUser()
    if (branchManagerUser && branchManagerUser.role === 'branch_manager') {
      return BranchManagerAuth.getToken()
    }

    // Otherwise use TokenManager
    return TokenManager.getToken()
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken()

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }

    // endpoint comes in as /api/xxx — strip leading /api/ when using proxy
    let url: string
    if (this.baseURL === '/api/backend') {
      // Browser: /api/backend/payments/notifications
      const stripped = endpoint.replace(/^\/api\//, '')
      url = `${this.baseURL}/${stripped}`
    } else {
      // Server: http://…/api/payments/notifications
      url = `${this.baseURL.replace(/\/api$/, '')}${endpoint}`
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  private sortByCreatedAt(
    items: InAppNotification[]
  ): InAppNotification[] {
    return [...items].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  private isLeadManagerRole(role: string | null): boolean {
    if (!role) return false
    const r = role.toLowerCase()
    return (
      r === 'super_admin' ||
      r === 'superadmin' ||
      r === 'coach_admin' ||
      r === 'coachadmin' ||
      r === 'partner_super_admin' ||
      r === 'partnersuperadmin' ||
      r === 'branch_manager'
    )
  }

  async getLeadNotifications(
    skip: number = 0,
    limit: number = 50
  ): Promise<LeadNotificationResponse> {
    try {
      const data = await this.makeRequest(
        `/api/leads/notifications?skip=${skip}&limit=${limit}`
      )
      return {
        notifications: data.notifications || [],
        total: data.total ?? 0,
        unread_count: data.unread_count ?? 0,
      }
    } catch (error) {
      console.error('Error fetching lead notifications:', error)
      return { notifications: [], total: 0, unread_count: 0 }
    }
  }

  async getNotifications(
    skip: number = 0,
    limit: number = 50
  ): Promise<InAppNotification[]> {
    try {
      const userRole = this.getUserRole()
      const leadManager = this.isLeadManagerRole(userRole)

      if (userRole === 'branch_manager') {
        const [messages, leads] = await Promise.all([
          this.getMessageNotifications(skip, limit),
          leadManager
            ? this.getLeadNotifications(skip, limit)
            : Promise.resolve({
                notifications: [],
                total: 0,
                unread_count: 0,
              }),
        ])
        return this.sortByCreatedAt([
          ...(messages.notifications || []),
          ...(leads.notifications || []),
        ]).slice(0, limit)
      }

      if (userRole === 'super_admin' || userRole === 'superadmin') {
        const [payments, leads] = await Promise.all([
          this.getPaymentNotifications(skip, limit),
          this.getLeadNotifications(skip, limit),
        ])
        return this.sortByCreatedAt([...payments, ...leads.notifications]).slice(
          0,
          limit
        )
      }

      const data = await this.getMessageNotifications(skip, limit)
      const merged: InAppNotification[] = [...(data.notifications || [])]
      if (leadManager) {
        const leads = await this.getLeadNotifications(skip, limit)
        merged.push(...leads.notifications)
      }
      return this.sortByCreatedAt(merged).slice(0, limit)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  async getPaymentNotifications(skip: number = 0, limit: number = 50): Promise<PaymentNotification[]> {
    try {
      const data = await this.makeRequest(`/api/payments/notifications?skip=${skip}&limit=${limit}`)
      return data || []
    } catch (error) {
      console.error('Error fetching payment notifications:', error)
      throw error
    }
  }

  async getMessageNotifications(skip: number = 0, limit: number = 50): Promise<MessageNotificationResponse> {
    try {
      const data = await this.makeRequest(`/api/messages/notifications?skip=${skip}&limit=${limit}`)
      return data
    } catch (error) {
      console.error('Error fetching message notifications:', error)
      throw error
    }
  }

  async markNotificationAsRead(
    notificationId: string,
    notificationType?: string
  ): Promise<void> {
    try {
      const userRole = this.getUserRole()
      const type = (notificationType || '').toLowerCase()

      if (type === 'new_lead' || type === 'lead') {
        await this.makeRequest(
          `/api/leads/notifications/${notificationId}/read`,
          { method: 'PUT' }
        )
        return
      }

      if (userRole === 'branch_manager') {
        await this.makeRequest(`/api/messages/notifications/${notificationId}/read`, {
          method: 'PUT'
        })
      } else if (userRole === 'super_admin' || userRole === 'superadmin') {
        try {
          await this.makeRequest(`/api/payments/notifications/${notificationId}/read`, {
            method: 'PUT'
          })
        } catch {
          await this.makeRequest(
            `/api/leads/notifications/${notificationId}/read`,
            { method: 'PUT' }
          )
        }
      } else {
        try {
          await this.makeRequest(`/api/messages/notifications/${notificationId}/read`, {
            method: 'PUT'
          })
        } catch {
          await this.makeRequest(
            `/api/leads/notifications/${notificationId}/read`,
            { method: 'PUT' }
          )
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const userRole = this.getUserRole()
      const leadManager = this.isLeadManagerRole(userRole)

      if (userRole === 'branch_manager') {
        const [messages, leads] = await Promise.all([
          this.getMessageNotifications(0, 100),
          leadManager
            ? this.getLeadNotifications(0, 100)
            : Promise.resolve({ notifications: [], total: 0, unread_count: 0 }),
        ])
        return (messages.unread_count || 0) + (leads.unread_count || 0)
      }

      if (userRole === 'super_admin' || userRole === 'superadmin') {
        const [payments, leads] = await Promise.all([
          this.getPaymentNotifications(0, 100),
          this.getLeadNotifications(0, 100),
        ])
        const paymentUnread = payments.filter((n) => !n.is_read).length
        return paymentUnread + (leads.unread_count || 0)
      }

      const data = await this.getMessageNotifications(0, 100)
      let count = data.unread_count || 0
      if (leadManager) {
        const leads = await this.getLeadNotifications(0, 100)
        count += leads.unread_count || 0
      }
      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }
}

export const notificationAPI = new NotificationAPI()
