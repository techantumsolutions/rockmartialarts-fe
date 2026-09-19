"use client"

import { useState, useEffect } from "react"
import { Bell, DollarSign, User, Clock, Check, MessageCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { notificationAPI, PaymentNotification, MessageNotification } from "@/lib/notificationAPI"
import { useRouter, usePathname } from "next/navigation"
import {
  getAllNotificationsPath,
  getNotificationTargetPath,
  isMessageNotification,
  isPaymentNotification,
} from "@/lib/notificationNavigation"

interface NotificationDropdownProps {
  className?: string
}

export default function NotificationDropdown({ className = "" }: NotificationDropdownProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const [notifications, setNotifications] = useState<(PaymentNotification | MessageNotification)[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const data = await notificationAPI.getNotifications(0, 20)
      setNotifications(data)

      // Calculate unread count
      const unreadNotifications = data.filter(n => !n.is_read)
      setUnreadCount(unreadNotifications.length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Fetch notifications on component mount and set up polling
  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Unknown time'
      }

      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

      // Handle future dates (shouldn't happen but just in case)
      if (diffInMinutes < 0) {
        return 'Just now'
      }

      if (diffInMinutes < 1) return 'Just now'
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`

      const diffInHours = Math.floor(diffInMinutes / 60)
      if (diffInHours < 24) return `${diffInHours}h ago`

      const diffInDays = Math.floor(diffInHours / 24)
      if (diffInDays < 7) return `${diffInDays}d ago`

      const diffInWeeks = Math.floor(diffInDays / 7)
      if (diffInWeeks < 4) return `${diffInWeeks}w ago`

      // For older notifications, show the actual date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Unknown time'
    }
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'registration_payment':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'new_student':
        return <User className="w-4 h-4 text-blue-600" />
      case 'new_message':
        return <Mail className="w-4 h-4 text-blue-600" />
      case 'message_reply':
        return <MessageCircle className="w-4 h-4 text-green-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  // Check if notification is a payment notification
  const isPaymentNotificationType = (
    notification: PaymentNotification | MessageNotification
  ): notification is PaymentNotification => isPaymentNotification(notification)

  // Check if notification is a message notification
  const isMessageNotificationType = (
    notification: PaymentNotification | MessageNotification
  ): notification is MessageNotification => isMessageNotification(notification)

  const handleNotificationClick = (notification: PaymentNotification | MessageNotification) => {
    if (!notification.is_read) {
      void markAsRead(notification.id)
    }
    router.push(getNotificationTargetPath(notification, pathname))
    setIsOpen(false)
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'urgent':
        return 'border-l-red-600'
      case 'normal':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-300'
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button className={`relative rounded-full bg-purple-100 p-4 hover:bg-purple-200 transition-all duration-200 ${className}`}>
          <Bell className="w-5 h-5 text-yellow-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-4 py-2 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications yet</p>
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
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(notification.created_at)}</span>
                      </div>
                      {isPaymentNotificationType(notification) && notification.amount && (
                        <span className="text-xs font-medium text-green-600">
                          ₹{notification.amount.toLocaleString()}
                        </span>
                      )}
                      {isMessageNotificationType(notification) && (
                        <span className="text-xs text-gray-500">
                          From: {notification.sender_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="px-4 py-2 text-center text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
              onClick={() => {
                setIsOpen(false)
                router.push(getAllNotificationsPath(pathname))
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
