"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import {
  trainingChatAPI,
  type TrainingChatMessage,
} from "./trainingChatAPI"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export interface UseTrainingChatOptions {
  autoJoin?: boolean
  enabled?: boolean
}

export interface UseTrainingChatResult {
  messages: TrainingChatMessage[]
  isConnected: boolean
  isConnecting: boolean
  isCounterpartOnline: boolean
  isCounterpartTyping: boolean
  typingUserName: string | null
  unreadCount: number
  loadingHistory: boolean
  error: string | null
  sendMessage: (content: string) => Promise<boolean>
  sendTyping: (isTyping: boolean) => void
  markAsRead: () => Promise<void>
  refreshHistory: () => Promise<void>
}

function getActiveToken(role: "student" | "coach"): string | null {
  if (typeof window === "undefined") return null
  return (
    BranchManagerAuth.getToken() ||
    TokenManager.getToken() ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  )
}

function getSocketBaseUrl(): string {
  if (typeof window === "undefined") return "http://127.0.0.1:8003"
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL
  if (raw) return raw.replace(/\/+$/, "")
  return `${window.location.protocol}//${window.location.hostname}:8003`
}

export function useTrainingChat(
  requestId: string | null,
  role: "student" | "coach" = "student",
  options: UseTrainingChatOptions = {}
): UseTrainingChatResult {
  const { autoJoin = true, enabled = true } = options

  const [messages, setMessages] = useState<TrainingChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCounterpartOnline, setIsCounterpartOnline] = useState(false)
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false)
  const [typingUserName, setTypingUserName] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const counterpartTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Initial REST history fetch
  const fetchHistory = useCallback(async () => {
    if (!requestId) return
    setLoadingHistory(true)
    setError(null)
    try {
      const res = await trainingChatAPI.getMessages(requestId, role, 0, 50)
      if (res && Array.isArray(res.messages)) {
        setMessages((prev) => {
          // Merge: Keep any pending optimistic messages that haven't landed yet
          const pending = prev.filter((m) => m.id.startsWith("opt_"))
          const stillPending = pending.filter(
            (p) => !res.messages.some((s) => s.content === p.content && s.sender_role === p.sender_role)
          )
          return [...res.messages, ...stillPending]
        })

        const counterpartRole = role === "coach" ? "student" : "coach"
        const unread = res.messages.filter(
          (m) => m.sender_role === counterpartRole && !m.is_read
        ).length
        setUnreadCount(unread)
      }
    } catch (err: any) {
      console.warn("[TrainingChat] Notice: REST history not loaded:", err?.message || err)
    } finally {
      setLoadingHistory(false)
    }
  }, [requestId, role])

  // 2. Mark as read
  const markAsRead = useCallback(async () => {
    if (!requestId) return
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit("mark_read", { request_id: requestId })
      }
      await trainingChatAPI.markRead(requestId, role).catch(() => {})
      setUnreadCount(0)
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_role !== role ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
        )
      )
    } catch (err) {
      console.warn("[TrainingChat] Error marking as read:", err)
    }
  }, [requestId, role])

  // 3. Setup Socket.IO connection
  useEffect(() => {
    if (!requestId || !enabled || !autoJoin) {
      return
    }

    const token = getActiveToken(role)
    fetchHistory()

    if (!token) {
      console.warn("[TrainingChat] No auth token available for Socket.IO")
      return
    }

    setIsConnecting(true)
    const baseUrl = getSocketBaseUrl()
    console.log(`[TrainingChat] Connecting to Socket.IO at ${baseUrl} for request ${requestId}`)

    const socket = io(baseUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token, access_token: token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("[TrainingChat] Socket connected:", socket.id)
      setIsConnected(true)
      setIsConnecting(false)
      setError(null)
      socket.emit("join_room", { request_id: requestId })
    })

    socket.on("disconnect", (reason) => {
      console.log("[TrainingChat] Socket disconnected:", reason)
      setIsConnected(false)
      setIsConnecting(false)
    })

    socket.on("connect_error", (err) => {
      console.warn("[TrainingChat] Socket connection warning:", err.message)
      setIsConnected(false)
      setIsConnecting(false)
    })

    socket.on("message_history", (data: { messages: TrainingChatMessage[] }) => {
      if (Array.isArray(data?.messages)) {
        setMessages((prev) => {
          const pending = prev.filter((m) => m.id.startsWith("opt_"))
          const stillPending = pending.filter(
            (p) => !data.messages.some((s) => s.content === p.content && s.sender_role === p.sender_role)
          )
          return [...data.messages, ...stillPending]
        })
        const counterpartRole = role === "coach" ? "student" : "coach"
        const unread = data.messages.filter(
          (m) => m.sender_role === counterpartRole && !m.is_read
        ).length
        setUnreadCount(unread)
      }
    })

    socket.on("new_message", (message: TrainingChatMessage) => {
      setMessages((prev) => {
        // Check if we have an optimistic message matching this
        const optIndex = prev.findIndex(
          (m) =>
            m.id.startsWith("opt_") &&
            m.content === message.content &&
            m.sender_role === message.sender_role
        )
        if (optIndex !== -1) {
          const next = [...prev]
          next[optIndex] = message
          return next
        }
        // Prevent exact duplicates
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })

      if (message.sender_role !== role) {
        setUnreadCount((c) => c + 1)
      }
    })

    socket.on("user_typing", (data: { user_name: string; is_typing: boolean; role: string }) => {
      if (data.role !== role) {
        setIsCounterpartTyping(Boolean(data.is_typing))
        setTypingUserName(data.is_typing ? data.user_name || "Typing..." : null)

        if (counterpartTypingTimeoutRef.current) {
          clearTimeout(counterpartTypingTimeoutRef.current)
        }
        if (data.is_typing) {
          counterpartTypingTimeoutRef.current = setTimeout(() => {
            setIsCounterpartTyping(false)
            setTypingUserName(null)
          }, 4000)
        }
      }
    })

    socket.on("messages_read", (data: { request_id: string; reader_id: string; read_at: string }) => {
      if (data.request_id === requestId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_role === role ? { ...m, is_read: true, read_at: data.read_at } : m
          )
        )
      }
    })

    socket.on("user_status", (data: { user_id: string; status: "online" | "offline"; role?: string }) => {
      if (data.role && data.role !== role) {
        setIsCounterpartOnline(data.status === "online")
      }
    })

    socket.on("error", (errData: { message: string }) => {
      console.warn("[TrainingChat] Socket event notice:", errData)
    })

    return () => {
      if (socket.connected) {
        socket.emit("leave_room", { request_id: requestId })
      }
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
      setIsConnecting(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (counterpartTypingTimeoutRef.current) clearTimeout(counterpartTypingTimeoutRef.current)
    }
  }, [requestId, role, autoJoin, enabled, fetchHistory])

  // 4. Send Message (Optimistic UI + Socket + REST)
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim()
      if (!requestId || !trimmed) return false

      const currentUser = TokenManager.getUser()
      const optimisticId = `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

      const optimisticMessage: TrainingChatMessage = {
        id: optimisticId,
        request_id: requestId,
        room_id: `training_chat_${requestId}`,
        sender_id: currentUser?.id || "me",
        sender_name: currentUser?.full_name || (role === "student" ? "Student" : "Coach"),
        sender_role: role,
        recipient_id: "",
        recipient_name: role === "student" ? "Coach" : "Student",
        content: trimmed,
        created_at: new Date().toISOString(),
        is_read: false,
        read_at: null,
      }

      // 1. Immediately show in UI!
      setMessages((prev) => [...prev, optimisticMessage])

      // 2. Emit via socket if connected
      let sentViaSocket = false
      if (socketRef.current && socketRef.current.connected) {
        try {
          socketRef.current.emit("send_message", {
            request_id: requestId,
            content: trimmed,
          })
          sentViaSocket = true
        } catch (e) {
          console.warn("[TrainingChat] Socket emit failed, using fallback:", e)
        }
      }

      // 3. Fallback to REST persistence if socket is not connected
      if (!sentViaSocket) {
        trainingChatAPI
          .sendMessage(requestId, trimmed, role)
          .then((saved) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === optimisticId ? saved : m))
            )
          })
          .catch((err) => {
            console.warn("[TrainingChat] Message queued locally:", err?.message || err)
          })
      }

      return true
    },
    [requestId, role]
  )

  // 5. Send Typing Indicator (debounced)
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!requestId || !socketRef.current?.connected) return
      socketRef.current.emit("typing", {
        request_id: requestId,
        is_typing: isTyping,
      })

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit("typing", {
              request_id: requestId,
              is_typing: false,
            })
          }
        }, 3000)
      }
    },
    [requestId]
  )

  return {
    messages,
    isConnected,
    isConnecting,
    isCounterpartOnline,
    isCounterpartTyping,
    typingUserName,
    unreadCount,
    loadingHistory,
    error,
    sendMessage,
    sendTyping,
    markAsRead,
    refreshHistory: fetchHistory,
  }
}
