"use client"

import React, { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  MessageSquare,
  Search,
  UserCheck,
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

const STUDENT_QUICK_PROMPTS = [
  "Hi Coach! Looking forward to our training sessions.",
  "What attire or equipment should I bring?",
  "Could you please confirm the schedule timing?",
  "Please let me know if you need any directions to the venue.",
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

function ChatPane({
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
  } = useTrainingChat(activeRequest.id, "student", {
    autoJoin: true,
    enabled: true,
  })

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isCounterpartTyping])

  // Mark as read when active
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

  const coachDisplayName = activeRequest.assigned_coach_name || "Assigned Coach"
  const coachInitials = coachDisplayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
      {/* Chat Pane Header */}
      <div className="p-4 bg-muted/30 border-b border-border/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FFB70F] to-amber-500 text-black font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-[#FFB70F]/30">
              {coachInitials || <UserCheck className="w-5 h-5" />}
            </div>
            <span
              title={isCounterpartOnline ? "Online" : "Offline"}
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                isCounterpartOnline
                  ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                  : "bg-gray-400"
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-sm truncate">
                {coachDisplayName}
              </h3>
              {isCounterpartOnline ? (
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Offline</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
              <span>Certified Academy Coach</span>
              <span>•</span>
              <span className="capitalize text-[#B87D00] font-medium">
                {typeLabel(activeRequest.type)} Training
              </span>
              <span>•</span>
              <span className="font-mono text-[10px]">#{activeRequest.id.slice(0, 6)}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenDetails}
            className="text-xs h-8 border-border hover:border-[#FFB70F] hover:text-[#B87D00] gap-1 px-2.5"
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Sub Status Bar */}
      <div className="px-4 py-1.5 bg-muted/15 border-b border-border/40 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
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
          <Shield className="w-3 h-3 text-[#FFB70F]" />
          <span>Official Academy Coach Channel</span>
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 min-h-[360px]">
        {loadingHistory && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FFB70F]" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#FFB70F]/15 text-[#FFB70F] mx-auto flex items-center justify-center shadow-inner">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">
                Direct Chat with {coachDisplayName}
              </h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Coordinate session times, attire, directions, or ask any preparation questions before training begins.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-left">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 px-1">
                <Sparkles className="w-3 h-3 text-[#FFB70F]" />
                Quick Prompts to start:
              </span>
              <div className="flex flex-col gap-1.5">
                {STUDENT_QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs bg-card hover:bg-muted p-2.5 rounded-xl border border-border/60 hover:border-[#FFB70F]/50 transition-all text-foreground font-medium shadow-sm hover:translate-x-0.5"
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
              const isMe = msg.sender_role === "student"
              const showDate =
                index === 0 ||
                formatDateLabel(msg.created_at) !==
                  formatDateLabel(messages[index - 1]?.created_at)

              return (
                <React.Fragment key={msg.id || index}>
                  {showDate && (
                    <div className="flex items-center justify-center my-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border/50">
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
                      className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-xs shadow-sm transition-all ${
                        isMe
                          ? "bg-[#FFB70F] text-black font-medium rounded-br-none"
                          : "bg-muted text-foreground border border-border/60 rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground">
                      <span>{formatTime(msg.created_at)}</span>
                      {isMe && (
                        <span>
                          {msg.is_read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                          ) : (
                            <Check className="w-3 h-3 text-muted-foreground inline" />
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
            <div className="bg-muted px-3 py-2 rounded-2xl rounded-bl-none border border-border/60 flex items-center gap-1.5 shadow-sm">
              <span className="text-[11px] text-muted-foreground font-medium">
                {typingUserName || coachDisplayName} is typing
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB70F] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB70F] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB70F] animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-card border-t border-border/80 shrink-0">
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
            placeholder={`Message Coach ${coachDisplayName}...`}
            className="flex-1 text-xs h-10 rounded-xl bg-muted/40 border-border/80 focus-visible:ring-[#FFB70F]"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="h-10 px-5 bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold rounded-xl shrink-0 shadow-sm gap-1.5 transition-all"
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

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRequestId = searchParams.get("request_id")

  const [requests, setRequests] = useState<TrainingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRequest, setActiveRequest] = useState<TrainingRequest | null>(null)
  const [search, setSearch] = useState("")
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  // Load all user requests that have an assigned coach
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await trainingRequestAPI.getMyRequests({ limit: 100 })
        const all = res.requests || []
        // Filter requests that have an assigned coach who has ACCEPTED
        const chatCapable = all.filter((r) => Boolean(r.assigned_coach_id) && r.coach_assignment_status === "accepted")
        setRequests(chatCapable)

        if (initialRequestId) {
          const matched = chatCapable.find((r) => r.id === initialRequestId)
          if (matched) {
            setActiveRequest(matched)
          } else if (chatCapable.length > 0) {
            setActiveRequest(chatCapable[0])
          }
        } else if (chatCapable.length > 0) {
          setActiveRequest(chatCapable[0])
        }
      } catch (err) {
        console.error("Failed to load requests for chat:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [initialRequestId])

  const filteredRequests = requests.filter((r) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const coach = (r.assigned_coach_name || "").toLowerCase()
    const type = (r.type || "").toLowerCase()
    const id = (r.id || "").toLowerCase()
    return coach.includes(term) || type.includes(term) || id.includes(term)
  })

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link href="/training-dashboard">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border hover:border-[#FFB70F]"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#FFB70F]" />
              Coach Messaging & Live Chat
            </h1>
            <p className="text-xs text-muted-foreground">
              Direct real-time communication channel with your assigned martial arts coaches
            </p>
          </div>
        </div>

        <Link href="/training-dashboard">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border hover:border-[#FFB70F] hover:text-[#B87D00] gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Training Requests</span>
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 text-muted-foreground space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#FFB70F]" />
          <span className="text-sm font-medium">Loading your conversations...</span>
        </div>
      ) : requests.length === 0 ? (
        /* Empty State */
        <div className="bg-card rounded-2xl border border-border/80 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm my-8">
          <div className="w-16 h-16 rounded-3xl bg-[#FFB70F]/15 text-[#FFB70F] mx-auto flex items-center justify-center">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">No Active Coach Chats Yet</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live chat unlocks automatically as soon as an academy coach is assigned to your training request.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <Link href="/training-dashboard">
              <Button className="bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-xs rounded-xl px-5">
                View Submitted Requests
              </Button>
            </Link>
            <Link href="/training-dashboard/new-request">
              <Button variant="outline" className="text-xs rounded-xl">
                Submit New Request
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Main Chat Layout (Left list + Right chat) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[580px]">
          {/* Left Conversations Sidebar (4 cols) */}
          <div className="lg:col-span-4 flex flex-col bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden">
            {/* Search filter */}
            <div className="p-3 border-b border-border/60 bg-muted/20 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search coach or request..."
                  className="pl-8 text-xs h-9 bg-card rounded-xl border-border/70"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40">
              {filteredRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No conversations match "{search}"
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const isSelected = activeRequest?.id === req.id
                  const coachName = req.assigned_coach_name || "Assigned Coach"
                  const initials = coachName
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
                      className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-muted/40 ${
                        isSelected
                          ? "bg-[#FFB70F]/10 border-l-4 border-l-[#FFB70F]"
                          : "border-l-4 border-l-transparent"
                      }`}
                    >
                      {/* Coach Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <div
                          className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-xs shadow-sm ${
                            isSelected
                              ? "bg-[#FFB70F] text-black"
                              : "bg-muted text-foreground border border-border"
                          }`}
                        >
                          {initials || <UserCheck className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-foreground truncate">
                            {coachName}
                          </h4>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            #{req.id.slice(0, 6)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/50">
                            {typeLabel(req.type)}
                          </span>
                          {Boolean((req.details as any)?.city) && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              &bull; {String((req.details as any)?.city)}
                            </span>
                          )}
                        </div>

                        {/* Last message preview */}
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          {req.chat_last_message || "Direct channel ready • Tap to chat"}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {Boolean(req.chat_unread_student_count) && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold">
                          {req.chat_unread_student_count}
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
              <ChatPane
                activeRequest={activeRequest}
                onOpenDetails={() => setDetailsModalOpen(true)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-card rounded-2xl border border-border/80 p-8 text-center text-muted-foreground space-y-2">
                <MessageSquare className="w-10 h-10 text-muted-foreground/50" />
                <span className="text-sm">Select a conversation from the left to start chatting</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Details Dialog */}
      {activeRequest && (
        <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold text-foreground">
                {typeLabel(activeRequest.type)} Training Request
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Request ID: <span className="font-mono text-foreground">{activeRequest.id}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <div>
                <span className="text-[11px] text-muted-foreground block">Status</span>
                <span className="text-xs font-semibold text-foreground capitalize mt-1 block">
                  {statusLabel(activeRequest.status)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Assigned Coach</span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-1">
                  <UserCheck className="h-3.5 w-3.5 text-[#FFB70F]" />
                  {activeRequest.assigned_coach_name || "Coach"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Contact Details
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs bg-card p-3 rounded-lg border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Name:</span>
                  <span className="font-medium text-foreground">{activeRequest.contact_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Phone:</span>
                  <span className="font-medium text-foreground">{activeRequest.contact_phone}</span>
                </div>
                {activeRequest.contact_email && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Email:</span>
                    <span className="font-medium text-foreground">{activeRequest.contact_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Fields */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Training Requirements
              </h5>
              <div className="space-y-2 text-xs bg-card p-3 rounded-lg border border-border/60">
                {Object.entries((activeRequest.details || {}) as Record<string, any>).map(
                  ([k, v]) => {
                    if (v == null || v === "") return null
                    const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    return (
                      <div
                        key={k}
                        className="flex justify-between items-start gap-4 py-1 border-b border-border/40 last:border-0"
                      >
                        <span className="text-muted-foreground text-[11px] shrink-0">{label}:</span>
                        <span className="font-medium text-foreground text-right">{String(v)}</span>
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
                className="text-xs"
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

export default function TrainingDashboardChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-80 text-muted-foreground space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#FFB70F]" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  )
}
