"use client"

import { useState, useEffect } from "react"
import { MessageCircle, User, Clock, Check, Reply, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import messageAPI, { MessageNotification } from "@/lib/messageAPI"
import { useRouter, usePathname } from "next/navigation"
import { getNotificationTargetPath } from "@/lib/notificationNavigation"
import { getDashboardBasePath } from "@/lib/notificationNavigation"
import { format } from "date-fns"

interface MessageNotificationDropdownProps {
  className?: string
  onNotificationUpdate?: (unreadCount: number) => void
}

export default function MessageNotificationDropdown({ 
  className = "", 
  onNotificationUpdate 
}: MessageNotificationDropdownProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const [notifications, setNotifications] = useState<MessageNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const data = await messageAPI.getMessageNotifications(0, 20)
      setNotifications(data.notifications)
      setUnreadCount(data.unread_count)
      
      // Notify parent component of unread count change
      if (onNotificationUpdate) {
        onNotificationUpdate(data.unread_count)
      }
    } catch (error) {
      console.error('Error fetching message notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await messageAPI.markMessageNotificationAsRead(notificationId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      )
      
      // Update unread count
      const newUnreadCount = Math.max(0, unreadCount - 1)
      setUnreadCount(newUnreadCount)
      
      if (onNotificationUpdate) {
        onNotificationUpdate(newUnreadCount)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = async (notification: MessageNotification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    router.push(getNotificationTargetPath(notification, pathname))
    setIsOpen(false)
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500'
      case 'high':
        return 'border-l-orange-500'
      case 'normal':
        return 'border-l-blue-500'
      case 'low':
        return 'border-l-gray-500'
      default:
        return 'border-l-blue-500'
    }
  }

  // Get sender type icon
  const getSenderTypeIcon = (senderType: string) => {
    switch (senderType) {
      case 'student':
        return <User className="w-3 h-3 text-blue-600" />
      case 'coach':
        return <User className="w-3 h-3 text-green-600" />
      case 'branch_manager':
        return <User className="w-3 h-3 text-yellow-600" />
      case 'superadmin':
        return <User className="w-3 h-3 text-purple-600" />
      default:
        return <User className="w-3 h-3 text-gray-600" />
    }
  }

  // Get notification type icon
  const getNotificationTypeIcon = (notificationType: string) => {
    switch (notificationType) {
      case 'message_reply':
        return <Reply className="w-4 h-4 text-blue-600" />
      case 'new_message':
      default:
        return <Mail className="w-4 h-4 text-green-600" />
    }
  }

  // Load notifications on component mount and when dropdown opens
  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        fetchNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={`relative p-2 ${className}`}>
          <MessageCircle className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 overflow-y-auto"
        sideOffset={5}
      >
        <div className="px-4 py-2 border-b">
          <h3 className="font-semibold text-sm">Message Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No message notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`px-4 py-3 cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationTypeIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        {getSenderTypeIcon(notification.sender_type)}
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.sender_name}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1 truncate">
                      {notification.subject}
                    </p>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {format(new Date(notification.created_at), "MMM d, h:mm a")}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {notification.notification_type === 'message_reply' ? 'Reply' : 'New'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        
        <div className="px-4 py-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => {
              router.push(`${getDashboardBasePath(pathname)}/messages`)
              setIsOpen(false)
            }}
          >
            View All Messages
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
