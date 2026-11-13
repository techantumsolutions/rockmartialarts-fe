"use client"

import React, { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import {
  MessageSquare,
  Search,
  User,
  Send,
  Calendar,
  MapPin,
  Clock,
  Check,
  CheckCheck,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Shield,
  Circle,
  Eye,
  FileText,
  Phone,
  Mail,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  trainingRequestAPI,
  type TrainingRequest,
  typeLabel,
  statusLabel,
} from "@/lib/trainingRequestAPI"
import { useTrainingChat } from "@/lib/useTrainingChat"
import { formatRegisteredDateTime } from "@/lib/formatRegisteredDate"

const COACH_QUICK_PROMPTS = [
  "Hello! Welcome to Rock Martial Arts Academy. I will be your coach.",
  "Could you please share if the participants have any prior martial arts experience?",
  "Looking forward to our session! Please confirm the location details.",
  "Please feel free to ask any questions about clothing or preparation.",
]

function formatTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

function formatDateLabel(iso: string) {
  try {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return "Today"
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return ""
  }
}

function CoachChatPane({
  activeRequest,
  onOpenDetails,
}: {
  activeRequest: TrainingRequest
  onOpenDetails: () => void
}) {
  const [inputText, setInputText] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    isConnected,
    isConnecting,
    isCounterpartOnline,
    isCounterpartTyping,
    typingUserName,
    unreadCount,
    loadingHistory,
    sendMessage,
    sendTyping,
    markAsRead,
    refreshHistory,
  } = useTrainingChat(activeRequest.id, "coach", {
    autoJoin: true,
    enabled: true,
  })

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isCounterpartTyping])

  // Mark as read
  useEffect(() => {
    if (unreadCount > 0) {
      markAsRead()
    }
  }, [unreadCount, markAsRead])

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || sending) return

    setSending(true)
    sendTyping(false)
    if (!textToSend) setInputText("")

    await sendMessage(text)
    setSending(false)

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      inputRef.current?.focus()
    }, 50)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (e.target.value.length > 0) {
      sendTyping(true)
    } else {
      sendTyping(false)
    }
  }

  const studentDisplayName = activeRequest.contact_name || "Training Client"
  const studentInitials = studentDisplayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
      {/* Pane Header */}
      <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 text-gray-900 font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-yellow-400/30">
              {studentInitials || <User className="w-5 h-5" />}
            </div>
            <span
              title={isCounterpartOnline ? "Online" : "Offline"}
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                isCounterpartOnline
                  ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-gray-400"
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm truncate">
                {studentDisplayName}
              </h3>
              {isCounterpartOnline ? (
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-[10px] text-gray-500">Offline</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
              <span className="capitalize text-yellow-800 font-medium bg-yellow-50 px-1.5 py-0.2 rounded border border-yellow-200">
                {typeLabel(activeRequest.type)} Training
              </span>
              <span>•</span>
              <span className="font-mono text-[10px]">#{activeRequest.id.slice(0, 6)}</span>
              {activeRequest.contact_phone && (
                <>
                  <span>•</span>
                  <span>{activeRequest.contact_phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDetails}
            className="text-xs h-8 border-gray-200 hover:border-yellow-400 hover:text-yellow-900 gap-1 px-2.5 rounded-lg"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Request Details</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshHistory}
            disabled={loadingHistory}
            title="Refresh messages"
            className="h-8 w-8 text-gray-500 hover:text-gray-900"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Sub Status Bar */}
      <div className="px-4 py-1.5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
        <div className="flex items-center gap-1.5">
          <Circle
            className={`w-2 h-2 fill-current ${
              isConnected
                ? "text-emerald-500"
                : isConnecting
                ? "text-amber-500 animate-ping"
                : "text-emerald-500"
            }`}
          />
          <span>
            {isConnected
              ? "Live Socket.IO Connected"
              : isConnecting
              ? "Connecting..."
              : "Direct Line Active"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px]">
          <Shield className="w-3 h-3 text-yellow-600" />
          <span>Verified Student Client</span>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 min-h-[360px]">
        {loadingHistory && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-yellow-500" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-yellow-100/80 text-yellow-800 mx-auto flex items-center justify-center shadow-inner">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">
                Direct Line with {studentDisplayName}
              </h4>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Send an introductory message to your student client to confirm timing, venue details, or required attire.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-left">
              <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 px-1">
                <Sparkles className="w-3 h-3 text-yellow-600" />
                Quick Prompts:
              </span>
              <div className="flex flex-col gap-1.5">
                {COACH_QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs bg-white hover:bg-yellow-50/50 p-2.5 rounded-xl border border-gray-200 hover:border-yellow-400 transition-all text-gray-800 font-medium shadow-xs hover:translate-x-0.5"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <>
            {messages.map((msg, index) => {
              const isMe = msg.sender_role === "coach"
              const showDate =
                index === 0 ||
                formatDateLabel(msg.created_at) !==
                  formatDateLabel(messages[index - 1]?.created_at)

              return (
                <React.Fragment key={msg.id || index}>
                  {showDate && (
                    <div className="flex items-center justify-center my-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                        {formatDateLabel(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      isMe ? "items-end" : "items-start"
                    } group`}
                  >
                    <div
                      className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs shadow-xs transition-all ${
                        isMe
                          ? "bg-yellow-400 text-gray-900 font-medium rounded-br-none"
                          : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-gray-400">
                      <span>{formatTime(msg.created_at)}</span>
                      {isMe && (
                        <span>
                          {msg.is_read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-400 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              )
            })}
          </>
        )}

        {/* Counterpart Typing Indicator */}
        {isCounterpartTyping && (
          <div className="flex items-center gap-2 pt-1 animate-in fade-in">
            <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-none border border-gray-200 flex items-center gap-1.5 shadow-xs">
              <span className="text-[11px] text-gray-500 font-medium">
                {typingUserName || studentDisplayName} is typing
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-white border-t border-gray-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <Input
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Message ${studentDisplayName}...`}
            className="flex-1 text-xs h-10 rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-yellow-400"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="h-10 px-5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl shrink-0 shadow-xs gap-1.5 transition-all"
          >
            {sending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

function CoachChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRequestId = searchParams.get("request_id")

  const [requests, setRequests] = useState<TrainingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRequest, setActiveRequest] = useState<TrainingRequest | null>(null)
  const [search, setSearch] = useState("")
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // Auth check
  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated) {
      router.push("/coach/login")
      return
    }
  }, [router])

  // Load all accepted training requests for this coach
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await trainingRequestAPI.myTrainingRequests({ status: "accepted" })
        const accepted = res.requests || []
        setRequests(accepted)

        if (initialRequestId) {
          const matched = accepted.find((r) => r.id === initialRequestId)
          if (matched) {
            setActiveRequest(matched)
          } else if (accepted.length > 0) {
            setActiveRequest(accepted[0])
          }
        } else if (accepted.length > 0) {
          setActiveRequest(accepted[0])
        }
      } catch (err) {
        console.error("Failed to load accepted requests for coach chat:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [initialRequestId])

  const filteredRequests = requests.filter((r) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const name = (r.contact_name || "").toLowerCase()
    const type = (r.type || "").toLowerCase()
    const id = (r.id || "").toLowerCase()
    const phone = (r.contact_phone || "").toLowerCase()
    return name.includes(term) || type.includes(term) || id.includes(term) || phone.includes(term)
  })

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link href="/coach-dashboard/training-requests">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-gray-200 hover:border-yellow-400 text-gray-700"
              title="Back to Training Requests"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-yellow-600" />
              Accepted Training Requests Chat
            </h1>
            <p className="text-xs text-gray-500">
              Live messaging channel with student clients for sessions you have accepted
            </p>
          </div>
        </div>

        <Link href="/coach-dashboard/training-requests">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-gray-200 hover:border-yellow-400 hover:text-yellow-900 gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Manage All Requests</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 text-gray-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
          <span className="text-sm font-medium">Loading accepted client chats...</span>
        </div>
      ) : requests.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs my-8">
          <div className="w-16 h-16 rounded-3xl bg-yellow-100 text-yellow-800 mx-auto flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">No Accepted Sessions Yet</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Once you review and accept assigned training requests, your direct live communication channel with the client will appear here.
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link href="/coach-dashboard/training-requests">
              <Button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-xs rounded-xl px-5">
                View Pending Requests
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* 2-column layout (Left list + Right chat) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[580px]">
          {/* Left Conversations Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-200 bg-gray-50/50 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client name or phone..."
                  className="pl-8 text-xs h-9 bg-white rounded-xl border-gray-200"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400">
                  No accepted requests match "{search}"
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const isSelected = activeRequest?.id === req.id
                  const studentName = req.contact_name || "Training Client"
                  const initials = studentName
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => setActiveRequest(req)}
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-gray-50 ${
                        isSelected
                          ? "bg-yellow-50/70 border-l-4 border-l-yellow-400"
                          : "border-l-4 border-l-transparent"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-xs shadow-xs ${
                            isSelected
                              ? "bg-yellow-400 text-gray-900"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {initials || <User className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-gray-900 truncate">
                            {studentName}
                          </h4>
                          <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                            #{req.id.slice(0, 6)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.2 rounded bg-yellow-50 text-yellow-800 border border-yellow-200">
                            {typeLabel(req.type)}
                          </span>
                          {Boolean((req.details as any)?.city) && (
                            <span className="text-[10px] text-gray-500 truncate">
                              • {String((req.details as any)?.city)}
                            </span>
                          )}
                        </div>

                        {/* Last message preview */}
                        <p className="text-[11px] text-gray-500 truncate mt-1">
                          {req.chat_last_message || "Direct line ready • Tap to chat"}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {Boolean(req.chat_unread_coach_count) && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold">
                          {req.chat_unread_coach_count}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Active Chat Pane (8 cols) */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
            {activeRequest ? (
              <CoachChatPane
                activeRequest={activeRequest}
                onOpenDetails={() => setDetailsModalOpen(true)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 space-y-2">
                <MessageSquare className="w-10 h-10 text-gray-300" />
                <span className="text-sm">Select an accepted session from the left to start messaging</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Dialog */}
      {activeRequest && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4 bg-white rounded-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold text-gray-900">
                {typeLabel(activeRequest.type)} Training Request
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Request ID: <span className="font-mono text-gray-900">{activeRequest.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Contact Person
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block text-[11px]">Name:</span>
                  <span className="font-medium text-gray-900">{activeRequest.contact_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Phone:</span>
                  <span className="font-medium text-gray-900">{activeRequest.contact_phone}</span>
                </div>
                {activeRequest.contact_email && (
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-[11px]">Email:</span>
                    <span className="font-medium text-gray-900">{activeRequest.contact_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Fields */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Requirements
              </h5>
              <div className="space-y-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-200">
                {Object.entries((activeRequest.details || {}) as Record<string, any>).map(
                  ([k, v]) => {
                    if (v == null || v === "") return null
                    const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    return (
                      <div
                        key={k}
                        className="flex justify-between items-start gap-4 py-1 border-b border-gray-200/60 last:border-0"
                      >
                        <span className="text-gray-500 text-[11px] shrink-0">{label}:</span>
                        <span className="font-medium text-gray-900 text-right">{String(v)}</span>
                      </div>
                    )
                  }
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailsModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default function CoachTrainingRequestsChatPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <CoachDashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-80 text-gray-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-yellow-500" />
            </div>
          }
        >
          <CoachChatContent />
        </Suspense>
      </main>
    </div>
  )
}

