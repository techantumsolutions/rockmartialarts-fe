"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  X,
  Send,
  UserCheck,
  GraduationCap,
  Circle,
  Clock,
  Check,
  CheckCheck,
  Sparkles,
  RefreshCw,
  MessageSquare,
  Shield,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useTrainingChat } from "@/lib/useTrainingChat"
import { typeLabel } from "@/lib/trainingRequestAPI"

export interface TrainingRequestChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  requestId: string
  requestType?: string
  // When student is viewing: counterpart is coach
  coachName?: string | null
  coachId?: string | null
  // When coach is viewing: counterpart is student
  studentName?: string | null
  studentPhone?: string | null
  studentEmail?: string | null
  userRole: "student" | "coach"
}

const STUDENT_QUICK_PROMPTS = [
  "Hi Coach! Looking forward to the training sessions.",
  "What attire or equipment should I bring?",
  "Could you please confirm our preferred timing?",
]

const COACH_QUICK_PROMPTS = [
  "Hello! Welcome to Rock Martial Arts Academy. I will be your coach.",
  "Could you please share if the participants have any prior martial arts experience?",
  "Looking forward to our session! Please confirm the location details.",
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

export default function TrainingRequestChatDrawer({
  isOpen,
  onClose,
  requestId,
  requestType,
  coachName,
  studentName,
  userRole,
}: TrainingRequestChatDrawerProps) {
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
  } = useTrainingChat(isOpen ? requestId : null, userRole, {
    autoJoin: isOpen,
    enabled: isOpen,
  })

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isCounterpartTyping, isOpen])

  // Mark messages as read when drawer is open
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead()
    }
  }, [isOpen, unreadCount, markAsRead])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 200)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const counterpartDisplayName =
    userRole === "student"
      ? coachName || "Assigned Coach"
      : studentName || "Training Student"

  const counterpartSubLabel =
    userRole === "student" ? "Certified Academy Coach" : "Training Request Client"

  const counterpartInitials = counterpartDisplayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const quickPrompts =
    userRole === "student" ? STUDENT_QUICK_PROMPTS : COACH_QUICK_PROMPTS

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
    }, 60)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
    if (e.target.value.length > 0) {
      sendTyping(true)
    } else {
      sendTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-card border-l border-border/80 shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 bg-muted/30 border-b border-border/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Counterpart Avatar */}
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FFB70F] to-amber-500 text-black font-bold flex items-center justify-center text-sm shadow-md ring-2 ring-[#FFB70F]/30">
                  {counterpartInitials || <UserCheck className="w-5 h-5" />}
                </div>
                {/* Online Indicator */}
                <span
                  title={isCounterpartOnline ? "Online" : "Offline"}
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                    isCounterpartOnline
                      ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-gray-400"
                  }`}
                />
              </div>

              {/* Title & Status */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm truncate">
                    {counterpartDisplayName}
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
                  <span>{counterpartSubLabel}</span>
                  {requestType && (
                    <>
                      <span>•</span>
                      <span className="capitalize text-[#FFB70F] font-medium">
                        {typeLabel(requestType)}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-mono text-[10px]">#{requestId.slice(0, 6)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshHistory}
                disabled={loadingHistory}
                title="Refresh messages"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Connection Status Sub-bar */}
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
                  ? "Live Connected (Socket.IO)"
                  : isConnecting
                  ? "Connecting..."
                  : "Direct Chat Active"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <Shield className="w-3 h-3 text-[#FFB70F]" />
              <span>End-to-End Verified</span>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
            {loadingHistory && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#FFB70F]" />
                <span className="text-xs">Loading conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Empty state with Quick Prompts */
              <div className="py-8 px-2 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFB70F]/15 text-[#FFB70F] mx-auto flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Direct Line with {counterpartDisplayName}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                    Coordinate schedule, gear requirements, and get quick answers about your training session in real-time.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 text-left">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 px-1">
                    <Sparkles className="w-3 h-3 text-[#FFB70F]" />
                    Quick Starters:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {quickPrompts.map((prompt, idx) => (
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
              /* Message List */
              <>
                {messages.map((msg, index) => {
                  const isMe = msg.sender_role === userRole
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
                          className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs shadow-sm transition-all ${
                            isMe
                              ? "bg-[#FFB70F] text-black font-medium rounded-br-none"
                              : "bg-muted text-foreground border border-border/60 rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                        </div>

                        {/* Timestamp & read receipt */}
                        <div
                          className={`flex items-center gap-1 mt-1 px-1 text-[10px] text-muted-foreground`}
                        >
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
                    {typingUserName || counterpartDisplayName} is typing
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

          {/* Footer Input */}
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
                onKeyDown={handleKeyDown}
                placeholder={`Message ${counterpartDisplayName}...`}
                className="flex-1 text-xs h-10 rounded-xl bg-muted/40 border-border/80 focus-visible:ring-[#FFB70F]"
                disabled={sending}
              />
              <Button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="h-10 px-4 bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold rounded-xl shrink-0 shadow-sm transition-all"
              >
                {sending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
