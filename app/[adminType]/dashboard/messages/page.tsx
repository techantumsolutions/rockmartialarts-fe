"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Send, Search, MessageCircle, Plus, Loader2, User, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import messageAPI, { Conversation, Message, MessageRecipient, MessageStats } from "@/lib/messageAPI"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

export default function AdminMessagesPage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [adminData, setAdminData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Message state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null)
  const [recipients, setRecipients] = useState<MessageRecipient[]>([])

  // UI state
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatSearch, setNewChatSearch] = useState("")

  // Inline message input
  const [messageInput, setMessageInput] = useState("")
  const [isSending, setIsSending] = useState(false)

  // New chat state
  const [selectedRecipient, setSelectedRecipient] = useState<MessageRecipient | null>(null)
  const [newChatSubject, setNewChatSubject] = useState("")

  useEffect(() => {
    const initializeData = async () => {
      try {
        const isSuperAdmin = TokenManager.isAuthenticated()
        const isBranchAdmin = BranchManagerAuth.isAuthenticated()

        if (!isSuperAdmin && !isBranchAdmin) {
          router.push("/login")
          return
        }

        let user = null
        if (isSuperAdmin) {
          user = TokenManager.getUser()
        }
        if (!user && isBranchAdmin) {
          user = BranchManagerAuth.getCurrentUser()
        }

        if (!user) {
          router.push("/login")
          return
        }

        setAdminData(user)

        await Promise.all([
          loadConversations(),
          loadMessageStats(),
          loadRecipients()
        ])
      } catch (error) {
        console.error("Error initializing messages:", error)
        setError("Failed to load messages. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [router])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [threadMessages])

  const loadConversations = async () => {
    try {
      setIsLoadingMessages(true)
      const response = await messageAPI.getConversations(0, 50)
      setConversations(response.conversations)
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const loadMessageStats = async () => {
    try {
      const response = await messageAPI.getMessageStats()
      setMessageStats(response.stats)
    } catch (error) {
      console.error("Error loading message stats:", error)
    }
  }

  const loadRecipients = async () => {
    try {
      const response = await messageAPI.getAvailableRecipients()
      setRecipients(response.recipients)
    } catch (error) {
      console.error("Error loading recipients:", error)
    }
  }

  const loadThreadMessages = async (threadId: string) => {
    try {
      setIsLoadingThread(true)
      const response = await messageAPI.getThreadMessages(threadId, 0, 50)
      setThreadMessages(response.messages)
    } catch (error) {
      console.error("Error loading thread messages:", error)
    } finally {
      setIsLoadingThread(false)
    }
  }

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowNewChat(false)
    setSelectedRecipient(null)
    await loadThreadMessages(conversation.thread_id)
  }

  const handleStartNewChat = (recipient: MessageRecipient) => {
    // Check if there's an existing conversation with this recipient
    const existingConv = conversations.find(conv =>
      conv.participants.some(p => p.user_id === recipient.id) && !conv.is_archived
    )

    if (existingConv) {
      handleConversationSelect(existingConv)
      setShowNewChat(false)
      return
    }

    setSelectedRecipient(recipient)
    setSelectedConversation(null)
    setThreadMessages([])
    setShowNewChat(false)
    setNewChatSubject("")
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return

    try {
      setIsSending(true)
      setError(null)

      if (selectedConversation) {
        // Reply to existing conversation
        const lastMessage = threadMessages[threadMessages.length - 1]
        const otherParticipant = selectedConversation.participants.find(
          p => p.user_id !== adminData?.id
        )

        if (!otherParticipant) return

        const recipient = recipients.find(r => r.id === otherParticipant.user_id)
        if (!recipient) return

        let replySubject = selectedConversation.subject
        if (!replySubject.startsWith("Re: ")) {
          replySubject = `Re: ${replySubject}`
        }

        await messageAPI.sendMessage({
          recipient_id: recipient.id,
          recipient_type: recipient.type,
          subject: replySubject,
          content: messageInput,
          priority: "normal",
          reply_to_message_id: lastMessage?.id,
          thread_id: selectedConversation.thread_id
        })

        setMessageInput("")
        await loadThreadMessages(selectedConversation.thread_id)
        await loadConversations()
        await loadMessageStats()
      } else if (selectedRecipient) {
        // New conversation
        const subject = newChatSubject || "New Message"

        await messageAPI.sendMessage({
          recipient_id: selectedRecipient.id,
          recipient_type: selectedRecipient.type,
          subject: subject,
          content: messageInput,
          priority: "normal"
        })

        setMessageInput("")
        setSelectedRecipient(null)
        setNewChatSubject("")
        await loadConversations()
        await loadMessageStats()

        // Select the new conversation
        const updatedConvs = await messageAPI.getConversations(0, 50)
        setConversations(updatedConvs.conversations)
        const newConv = updatedConvs.conversations.find(c =>
          c.participants.some(p => p.user_id === selectedRecipient.id)
        )
        if (newConv) {
          setSelectedConversation(newConv)
          await loadThreadMessages(newConv.thread_id)
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleLogout = () => {
    if (BranchManagerAuth.isAuthenticated()) {
      BranchManagerAuth.clearAuthData()
      router.push("/branch-manager/login")
    } else {
      TokenManager.clearAuthData()
      router.push("/login")
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (conv.is_archived) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        conv.subject.toLowerCase().includes(searchLower) ||
        conv.participants.some(p => p.user_name.toLowerCase().includes(searchLower)) ||
        conv.last_message?.content.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Build a merged contact list: coaches & branch admins with conversation info
  const contactList = recipients
    .filter(r => r.type === "coach" || r.type === "branch_manager")
    .filter(r => {
      if (!searchTerm) return true
      return r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type.toLowerCase().includes(searchTerm.toLowerCase())
    })
    .map(r => {
      const conv = conversations.find(
        c => c.participants.some(p => p.user_id === r.id) && !c.is_archived
      )
      return { recipient: r, conversation: conv || null }
    })
    .sort((a, b) => {
      // Conversations with messages first, sorted by most recent
      if (a.conversation && b.conversation) {
        return new Date(b.conversation.last_message_at || b.conversation.created_at).getTime() -
          new Date(a.conversation.last_message_at || a.conversation.created_at).getTime()
      }
      if (a.conversation) return -1
      if (b.conversation) return 1
      return a.recipient.name.localeCompare(b.recipient.name)
    })

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (userType: string) => {
    switch (userType) {
      case "coach": return "bg-yellow-500"
      case "student": return "bg-blue-500"
      case "branch_manager": return "bg-green-500"
      case "superadmin": return "bg-purple-500"
      default: return "bg-gray-500"
    }
  }

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case "coach": return "Coach"
      case "student": return "Student"
      case "branch_manager": return "Branch Manager"
      case "superadmin": return "Admin"
      default: return "User"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        </main>
      </div>
    )
  }

  const currentOtherParticipant = selectedConversation?.participants.find(
    p => p.user_id !== adminData?.id
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
          <div className="flex h-full">
            {/* Left Panel - Contact List */}
            <div className="w-80 border-r border-gray-200 flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search coaches, managers..."
                    className="pl-9 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : contactList.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No contacts found</p>
                  </div>
                ) : (
                  contactList.map(({ recipient, conversation }) => {
                    const isSelected = conversation
                      ? selectedConversation?.thread_id === conversation.thread_id
                      : selectedRecipient?.id === recipient.id

                    return (
                      <button
                        key={recipient.id}
                        onClick={() => conversation ? handleConversationSelect(conversation) : handleStartNewChat(recipient)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                          isSelected ? "bg-purple-50 border-l-3 border-l-purple-500" : ""
                        } ${conversation && conversation.unread_count > 0 ? "bg-blue-50/50" : ""}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(recipient.type)}`}>
                          {getInitials(recipient.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${conversation && conversation.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                              {recipient.name}
                            </p>
                            {conversation?.last_message_at && (
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {format(new Date(conversation.last_message_at), "h:mm a")}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {conversation?.last_message?.content || getUserTypeLabel(recipient.type)}
                          </p>
                        </div>
                        {conversation && conversation.unread_count > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {conversation.unread_count}
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Panel - Chat Area */}
            <div className="flex-1 flex flex-col h-full">
              {selectedConversation || selectedRecipient ? (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                      selectedConversation
                        ? getAvatarColor(currentOtherParticipant?.user_type || "")
                        : getAvatarColor(selectedRecipient?.type || "")
                    }`}>
                      {selectedConversation
                        ? getInitials(currentOtherParticipant?.user_name || "?")
                        : getInitials(selectedRecipient?.name || "?")}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedConversation
                          ? currentOtherParticipant?.user_name
                          : selectedRecipient?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedConversation
                          ? getUserTypeLabel(currentOtherParticipant?.user_type || "")
                          : getUserTypeLabel(selectedRecipient?.type || "")}
                      </p>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/50">
                    {isLoadingThread ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : threadMessages.length === 0 && selectedRecipient ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">Start a conversation with {selectedRecipient.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {threadMessages.map((message) => {
                          const isFromCurrentUser = message.sender_name === adminData?.full_name
                          return (
                            <div
                              key={message.id}
                              className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`max-w-[65%] ${isFromCurrentUser ? "order-2" : ""}`}>
                                <div className={`rounded-2xl px-4 py-2.5 ${
                                  isFromCurrentUser
                                    ? "bg-blue-500 text-white rounded-br-md"
                                    : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"
                                }`}>
                                  <p className="text-sm leading-relaxed">{message.content}</p>
                                </div>
                                <p className={`text-xs mt-1 ${isFromCurrentUser ? "text-right" : "text-left"} text-gray-400`}>
                                  {format(new Date(message.created_at), "h:mm a")}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* New chat subject input */}
                  {selectedRecipient && !selectedConversation && (
                    <div className="px-6 py-2 border-t border-gray-100 bg-white">
                      <Input
                        placeholder="Subject (optional)"
                        value={newChatSubject}
                        onChange={(e) => setNewChatSubject(e.target.value)}
                        className="h-8 text-sm border-gray-200"
                      />
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-white">
                    {error && (
                      <div className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded mb-2">
                        {error}
                      </div>
                    )}
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Type your message here ..."
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={handleKeyPress}
                          className="h-10 border-gray-300 focus:border-blue-400"
                          disabled={isSending}
                        />
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={isSending || !messageInput.trim()}
                        className="bg-blue-500 hover: h-10 px-4"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Select a conversation</h3>
                    <p className="text-sm text-gray-500">Choose from the list or start a new chat</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
