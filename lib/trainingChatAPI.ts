/**
 * REST API client for Training Chat messages.
 * Used for fetching initial history, read receipts, and REST fallback.
 */

import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { getCoachAuthHeaders } from "./coachAuth"
import { BranchManagerAuth } from "./branchManagerAuth"

export interface TrainingChatMessage {
  id: string
  request_id: string
  room_id: string
  sender_id: string
  sender_name: string
  sender_role: "student" | "coach" | "super_admin"
  recipient_id: string
  recipient_name: string
  content: string
  created_at: string
  is_read: boolean
  read_at?: string | null
}

export interface ChatMessagesResponse {
  messages: TrainingChatMessage[]
  total: number
  skip: number
  limit: number
  coach_info?: {
    id: string
    name: string
  } | null
  student_info?: {
    id: string
    name: string
    email: string
  } | null
  request_id: string
}

function getChatAuthHeaders(role: "student" | "coach" = "student"): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (role === "coach") {
    const coachH = getCoachAuthHeaders()
    return { ...headers, ...coachH }
  }

  // Student: try BranchManagerAuth, then TokenManager
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

export const trainingChatAPI = {
  /**
   * Get paginated message history for a training request.
   */
  async getMessages(
    requestId: string,
    role: "student" | "coach" = "student",
    skip = 0,
    limit = 50
  ): Promise<ChatMessagesResponse> {
    const url = getBackendApiUrl(
      `training-requests/${requestId}/chat/messages?skip=${skip}&limit=${limit}`
    )
    const res = await fetch(url, {
      method: "GET",
      headers: getChatAuthHeaders(role),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to fetch messages (${res.status})`)
    }

    return res.json()
  },

  /**
   * Mark all unread messages from counterpart as read.
   */
  async markRead(
    requestId: string,
    role: "student" | "coach" = "student"
  ): Promise<{ marked: number; request_id: string }> {
    const url = getBackendApiUrl(`training-requests/${requestId}/chat/mark-read`)
    const res = await fetch(url, {
      method: "POST",
      headers: getChatAuthHeaders(role),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to mark read (${res.status})`)
    }

    return res.json()
  },

  /**
   * REST fallback to send a message when WebSocket is disconnected.
   */
  async sendMessage(
    requestId: string,
    content: string,
    role: "student" | "coach" = "student"
  ): Promise<TrainingChatMessage> {
    const url = getBackendApiUrl(`training-requests/${requestId}/chat/messages`)
    const res = await fetch(url, {
      method: "POST",
      headers: getChatAuthHeaders(role),
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to send message (${res.status})`)
    }

    return res.json()
  },
}

