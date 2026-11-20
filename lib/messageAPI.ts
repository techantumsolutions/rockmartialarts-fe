import { BaseAPI } from './baseAPI'
import { TokenManager } from './tokenManager'
import { BranchManagerAuth } from './branchManagerAuth'

// Message-related interfaces
export interface MessageParticipant {
  user_id: string
  user_type: 'student' | 'coach' | 'branch_manager' | 'superadmin'
  user_name: string
  user_email: string
  branch_id?: string
}

export interface MessageAttachment {
  id: string
  filename: string
  file_type: string
  file_size: number
  file_url: string
  uploaded_at: string
}

export interface Message {
  id: string
  thread_id?: string
  sender_name: string
  sender_type: 'student' | 'coach' | 'branch_manager' | 'superadmin'
  recipient_name: string
  recipient_type: 'student' | 'coach' | 'branch_manager' | 'superadmin'
  subject: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'sent' | 'delivered' | 'read' | 'archived' | 'deleted'
  is_read: boolean
  is_archived: boolean
  is_reply: boolean
  reply_to_message_id?: string
  attachments?: MessageAttachment[]
  created_at: string
  updated_at: string
  read_at?: string
}

export interface Conversation {
  thread_id: string
  subject: string
  participants: MessageParticipant[]
  message_count: number
  last_message?: Message
  last_message_at?: string
  unread_count: number
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface MessageStats {
  total_messages: number
  unread_messages: number
  sent_messages: number
  received_messages: number
  archived_messages: number
  deleted_messages: number
  active_conversations: number
}

export interface MessageRecipient {
  id: string
  name: string
  email: string
  type: 'student' | 'coach' | 'branch_manager' | 'superadmin'
  branch_id?: string
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

export interface SendMessageRequest {
  recipient_id: string
  recipient_type: 'student' | 'coach' | 'branch_manager' | 'superadmin'
  subject: string
  content: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  reply_to_message_id?: string
  thread_id?: string
  attachments?: any[]
}

export interface UpdateMessageRequest {
  is_read?: boolean
  is_archived?: boolean
  is_deleted?: boolean
  status?: 'sent' | 'delivered' | 'read' | 'archived' | 'deleted'
}

export interface ConversationsResponse {
  conversations: Conversation[]
  total_count: number
  skip: number
  limit: number
}

export interface ThreadMessagesResponse {
  messages: Message[]
  thread: any
  total_count: number
  skip: number
  limit: number
}

export interface RecipientsResponse {
  recipients: MessageRecipient[]
  total_count: number
}

class MessageAPI extends BaseAPI {
  
  /**
   * Get authentication token for API requests
   */
  private getAuthToken(): string | null {
    console.log('🔍 DEBUG: Getting auth token for messageAPI...')

    // Try different authentication methods in order of priority

    // 1. Try TokenManager first (unified token storage for all user types including coaches)
    const tokenManagerToken = TokenManager.getToken()
    if (tokenManagerToken) {
      console.log('✅ DEBUG: Using TokenManager token for authentication')
      console.log('🔍 DEBUG: TokenManager token preview:', tokenManagerToken.substring(0, 20) + '...')
      return tokenManagerToken
    }

    // 2. Try BranchManagerAuth
    const branchManagerToken = BranchManagerAuth.getToken()
    if (branchManagerToken) {
      console.log('✅ DEBUG: Using BranchManager token for authentication')
      console.log('🔍 DEBUG: BranchManager token preview:', branchManagerToken.substring(0, 20) + '...')
      return branchManagerToken
    }

    // 3. Check for legacy coach authentication tokens (fallback)
    const coachToken = localStorage.getItem("access_token") || localStorage.getItem("token")
    if (coachToken) {
      console.log('🔍 DEBUG: Found legacy coach token, verifying...')
      console.log('🔍 DEBUG: Legacy coach token preview:', coachToken.substring(0, 20) + '...')
      try {
        const parts = coachToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1] + '='.repeat((4 - parts[1].length % 4) % 4)))
          console.log('🔍 DEBUG: Legacy coach token payload:', { role: payload.role, sub: payload.sub, exp: payload.exp })

          // Check if token is expired
          const isExpired = payload.exp && payload.exp * 1000 < Date.now()
          if (isExpired) {
            console.warn('⚠️ DEBUG: Legacy coach token is expired')
            return null
          }

          // Accept both 'coach' and any valid token for messaging (coaches can message)
          if (payload.role === 'coach' || payload.sub) {
            console.log('✅ DEBUG: Using legacy coach token for authentication')
            return coachToken
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not decode legacy coach token:', e)
      }
    }

    // 4. Fallback to environment token
    const envToken = process.env.NEXT_PUBLIC_AUTH_TOKEN
    if (envToken) {
      console.log('✅ DEBUG: Using environment token for authentication')
      return envToken
    }

    console.warn('⚠️ DEBUG: No authentication token found!')
    console.log('🔍 DEBUG: Available localStorage keys:', Object.keys(localStorage))
    return null
  }

  /**
   * Get authentication headers based on user type (legacy method for backward compatibility)
   */
  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * Send a new message
   */
  async sendMessage(messageData: SendMessageRequest): Promise<{ message: string; message_id: string; thread_id: string }> {
    const token = this.getAuthToken()
    console.log('🔍 DEBUG: Sending message with token:', token ? 'Present' : 'Missing')

    return await this.makeRequest('/api/messages/send', {
      method: 'POST',
      token: token,
      body: messageData
    })
  }

  /**
   * Get user's conversations
   */
  async getConversations(skip: number = 0, limit: number = 50): Promise<ConversationsResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    })

    const token = this.getAuthToken()
    console.log('🔍 DEBUG: Getting conversations with token:', token ? 'Present' : 'Missing')

    try {
      const response = await this.makeRequest(`/api/messages/conversations?${params}`, {
        method: 'GET',
        token: token
      })

      console.log('🔍 DEBUG: Conversations API response:', response)
      return response
    } catch (error) {
      console.error('🔍 DEBUG: Conversations API error:', error)
      throw error
    }
  }

  /**
   * Get messages in a specific thread
   */
  async getThreadMessages(threadId: string, skip: number = 0, limit: number = 50): Promise<ThreadMessagesResponse> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    })

    return await this.makeRequest(`/api/messages/thread/${threadId}/messages?${params}`, {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Update message status
   */
  async updateMessage(messageId: string, updateData: UpdateMessageRequest): Promise<{ message: string }> {
    return await this.makeRequest(`/api/messages/message/${messageId}`, {
      method: 'PATCH',
      token: this.getAuthToken(),
      body: updateData
    })
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<{ message: string }> {
    return await this.makeRequest(`/api/messages/message/${messageId}/mark-read`, {
      method: 'POST',
      token: this.getAuthToken()
    })
  }

  /**
   * Archive message
   */
  async archiveMessage(messageId: string): Promise<{ message: string }> {
    return await this.makeRequest(`/api/messages/message/${messageId}/archive`, {
      method: 'POST',
      token: this.getAuthToken()
    })
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<{ message: string }> {
    return await this.makeRequest(`/api/messages/message/${messageId}`, {
      method: 'DELETE',
      token: this.getAuthToken()
    })
  }

  /**
   * Get message statistics
   */
  async getMessageStats(): Promise<{ stats: MessageStats }> {
    const token = this.getAuthToken()
    console.log('🔍 DEBUG: Getting message stats with token:', token ? 'Present' : 'Missing')

    try {
      const response = await this.makeRequest('/api/messages/stats', {
        method: 'GET',
        token: token
      })

      console.log('🔍 DEBUG: Message stats API response:', response)
      return response
    } catch (error) {
      console.error('🔍 DEBUG: Message stats API error:', error)
      throw error
    }
  }

  /**
   * Get available recipients
   */
  async getAvailableRecipients(): Promise<RecipientsResponse> {
    const token = this.getAuthToken()
    console.log('🔍 DEBUG: Getting available recipients with token:', token ? 'Present' : 'Missing')

    try {
      const response = await this.makeRequest('/api/messages/recipients', {
        method: 'GET',
        token: token
      })

      console.log('🔍 DEBUG: Available recipients API response:', response)
      return response
    } catch (error) {
      console.error('🔍 DEBUG: Available recipients API error:', error)
      throw error
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<{ unread_count: number }> {
    return await this.makeRequest('/api/messages/unread-count', {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Get messageable students (for coaches, academy managers, superadmin)
   */
  async getMessageableStudents(branchId?: string): Promise<{ students: MessageRecipient[]; total_count: number }> {
    const params = branchId ? `?branch_id=${branchId}` : ''
    return await this.makeRequest(`/api/messages/students${params}`, {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Get messageable coaches (for students, academy managers, superadmin)
   */
  async getMessageableCoaches(branchId?: string): Promise<{ coaches: MessageRecipient[]; total_count: number }> {
    const params = branchId ? `?branch_id=${branchId}` : ''
    return await this.makeRequest(`/api/messages/coaches${params}`, {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Get messageable academy managers (for students, coaches, superadmin)
   */
  async getMessageableBranchManagers(): Promise<{ branch_managers: MessageRecipient[]; total_count: number }> {
    return await this.makeRequest('/api/messages/branch-managers', {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Get messageable superadmins (for students, coaches, academy managers)
   */
  async getMessageableSuperadmins(): Promise<{ superadmins: MessageRecipient[]; total_count: number }> {
    return await this.makeRequest('/api/messages/superadmins', {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Get message notifications for the current user
   */
  async getMessageNotifications(skip: number = 0, limit: number = 50): Promise<{ notifications: MessageNotification[]; total: number; unread_count: number }> {
    return await this.makeRequest(`/api/messages/notifications?skip=${skip}&limit=${limit}`, {
      method: 'GET',
      token: this.getAuthToken()
    })
  }

  /**
   * Mark a message notification as read
   */
  async markMessageNotificationAsRead(notificationId: string): Promise<{ message: string }> {
    return await this.makeRequest(`/api/messages/notifications/${notificationId}/read`, {
      method: 'PUT',
      token: this.getAuthToken()
    })
  }

  /**
   * Get unread message notification count
   */
  async getUnreadMessageNotificationCount(): Promise<number> {
    try {
      const response = await this.getMessageNotifications(0, 1)
      return response.unread_count
    } catch (error) {
      console.error('Error getting unread message notification count:', error)
      return 0
    }
  }
}

// Export singleton instance
export const messageAPI = new MessageAPI()
export default messageAPI
