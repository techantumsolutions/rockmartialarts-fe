"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import DashboardHeader from "@/components/dashboard-header"
import { Send, Search, MessageCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import messageAPI, { Conversation, Message, MessageRecipient, MessageStats } from "@/lib/messageAPI"
import { TokenManager } from "@/lib/tokenManager"

export default function SuperAdminMessagesPage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [superAdminData, setSuperAdminData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [threadMessages, setThreadMessages] = useState<Message[]>([])
  const [messageStats, setMessageStats] = useState<MessageStats | null>(null)
  const [recipients, setRecipients] = useState<MessageRecipient[]>([])

  const [searchTerm, setSearchTerm] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingThread, setIsLoadingThread] = useState(false)

  const [messageInput, setMessageInput] = useState("")
  const [isSending, setIsSending] = useState(false)

  const [selectedRecipient, setSelectedRecipient] = useState<MessageRecipient | null>(null)
  const [newChatSubject, setNewChatSubject] = useState("")

  useEffect(() => {
    const initializeData = async () => {
      try {
        if (!TokenManager.isAuthenticated()) {
          router.push("/login")
          return
        }

        const user = TokenManager.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        if (user.role !== "superadmin") {
          if (user.role === "student") router.push("/student-dashboard")
          else if (user.role === "coach") router.push("/coach-dashboard")
          else if (user.role === "branch_manager") router.push("/branch-manager-dashboard")
          else router.push("/login")
          return
        }

        setSuperAdminData(user)
        await Promise.all([loadConversations(), loadMessageStats(), loadRecipients()])
      } catch (error) {
        console.error("Error initializing superadmin messages:", error)
        setError("Failed to load messages. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    initializeData()
  }, [router])

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
    setSelectedRecipient(null)
    await loadThreadMessages(conversation.thread_id)
  }

  const handleStartNewChat = (recipient: MessageRecipient) => {
    const existingConv = conversations.find(conv =>
      conv.participants.some(p => p.user_id === recipient.id) && !conv.is_archived
    )
    if (existingConv) {
      handleConversationSelect(existingConv)
      return
    }
    setSelectedRecipient(recipient)
    setSelectedConversation(null)
    setThreadMessages([])
    setNewChatSubject("")
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return
    try {
      setIsSending(true)
      setError(null)

      if (selectedConversation) {
        const lastMessage = threadMessages[threadMessages.length - 1]
        const otherParticipant = selectedConversation.participants.find(p => p.user_id !== superAdminData?.id)
        if (!otherParticipant) return
        const recipient = recipients.find(r => r.id === otherParticipant.user_id)
        if (!recipient) return

        let replySubject = selectedConversation.subject
        if (!replySubject.startsWith("Re: ")) replySubject = `Re: ${replySubject}`

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
        await messageAPI.sendMessage({
          recipient_id: selectedRecipient.id,
          recipient_type: selectedRecipient.type,
          subject: newChatSubject || "New Message",
          content: messageInput,
          priority: "normal"
        })

        setMessageInput("")
        setSelectedRecipient(null)
        setNewChatSubject("")
        await loadConversations()
        await loadMessageStats()

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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const handleLogout = () => { TokenManager.clearAuthData(); router.push("/login") }

  const filteredConversations = conversations.filter(conv => {
    if (conv.is_archived) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      return conv.subject.toLowerCase().includes(s) ||
        conv.participants.some(p => p.user_name.toLowerCase().includes(s)) ||
        conv.last_message?.content.toLowerCase().includes(s)
    }
    return true
  })

  const contactList = recipients
    .filter(r => r.type === "coach" || r.type === "branch_manager")
    .filter(r => {
      if (!searchTerm) return true
      return r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type.toLowerCase().includes(searchTerm.toLowerCase())
    })
    .map(r => {
      const conv = conversations.find(c => c.participants.some(p => p.user_id === r.id) && !c.is_archived)
      return { recipient: r, conversation: conv || null }
    })
    .sort((a, b) => {
      if (a.conversation && b.conversation) {
        return new Date(b.conversation.last_message_at || b.conversation.created_at).getTime() -
          new Date(a.conversation.last_message_at || a.conversation.created_at).getTime()
      }
      if (a.conversation) return -1
      if (b.conversation) return 1
      return a.recipient.name.localeCompare(b.recipient.name)
    })

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

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
        <DashboardHeader userName={superAdminData?.full_name || "Admin"} onLogout={handleLogout} />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        </main>
      </div>
    )
  }

  const currentOtherParticipant = selectedConversation?.participants.find(p => p.user_id !== superAdminData?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader userName={superAdminData?.full_name || "Admin"} onLogout={handleLogout} />

      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
            <div className="flex h-full">
              {/* Left Panel */}
              <div className="w-80 border-r border-gray-200 flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Messages</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input placeholder="Search coaches, managers..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
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
                        <button key={recipient.id} onClick={() => conversation ? handleConversationSelect(conversation) : handleStartNewChat(recipient)}
                          className={`w-full flex items-center space-x-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${isSelected ? "bg-purple-50 border-l-3 border-l-purple-500" : ""} ${conversation && conversation.unread_count > 0 ? "bg-blue-50/50" : ""}`}>
                          <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold ${getAvatarColor(recipient.type)}`}>{getInitials(recipient.name)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${conversation && conversation.unread_count > 0 ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>{recipient.name}</p>
                              {conversation?.last_message_at && <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{format(new Date(conversation.last_message_at), "h:mm a")}</span>}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{conversation?.last_message?.content || getUserTypeLabel(recipient.type)}</p>
                          </div>
                          {conversation && conversation.unread_count > 0 && <span className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{conversation.unread_count}</span>}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Right Panel */}
              <div className="flex-1 flex flex-col h-full">
                {selectedConversation || selectedRecipient ? (
                  <>
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold ${selectedConversation ? getAvatarColor(currentOtherParticipant?.user_type || "") : getAvatarColor(selectedRecipient?.type || "")}`}>
                        {selectedConversation ? getInitials(currentOtherParticipant?.user_name || "?") : getInitials(selectedRecipient?.name || "?")}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{selectedConversation ? currentOtherParticipant?.user_name : selectedRecipient?.name}</p>
                        <p className="text-xs text-gray-500">{selectedConversation ? getUserTypeLabel(currentOtherParticipant?.user_type || "") : getUserTypeLabel(selectedRecipient?.type || "")}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/50">
                      {isLoadingThread ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
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
                            const isFromCurrentUser = message.sender_name === superAdminData?.full_name
                            return (
                              <div key={message.id} className={`flex ${isFromCurrentUser ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[65%]`}>
                                  <div className={`rounded-2xl px-4 py-2.5 ${isFromCurrentUser ? "bg-blue-500 text-white rounded-br-md" : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"}`}>
                                    <p className="text-sm leading-relaxed">{message.content}</p>
                                  </div>
                                  <p className={`text-xs mt-1 ${isFromCurrentUser ? "text-right" : "text-left"} text-gray-400`}>{format(new Date(message.created_at), "h:mm a")}</p>
                                </div>
                              </div>
                            )
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {selectedRecipient && !selectedConversation && (
                      <div className="px-6 py-2 border-t border-gray-100 bg-white">
                        <Input placeholder="Subject (optional)" value={newChatSubject} onChange={(e) => setNewChatSubject(e.target.value)} className="h-8 text-sm border-gray-200" />
                      </div>
                    )}

                    <div className="px-6 py-4 border-t border-gray-200 bg-white">
                      {error && <div className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded mb-2">{error}</div>}
                      <div className="flex items-end space-x-3">
                        <div className="flex-1">
                          <Input placeholder="Type your message here ..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={handleKeyPress} className="h-10 border-gray-300 focus:border-blue-400" disabled={isSending} />
                        </div>
                        <Button onClick={handleSendMessage} disabled={isSending || !messageInput.trim()} className="bg-blue-500 hover: h-10 px-4">
                          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
        </div>
      </main>
    </div>
  )
}
