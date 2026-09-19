import type { MessageNotification, PaymentNotification } from "@/lib/notificationAPI"

export function getDashboardBasePath(pathname: string): string {
  const adminMatch = pathname.match(/^\/(super-admin|branch-admin)\/dashboard/)
  if (adminMatch) return adminMatch[0]
  if (pathname.startsWith("/branch-manager-dashboard")) return "/branch-manager-dashboard"
  if (pathname.startsWith("/student-dashboard")) return "/student-dashboard"
  if (pathname.startsWith("/coach-dashboard")) return "/coach-dashboard"
  if (pathname.startsWith("/dashboard")) return "/dashboard"
  return "/super-admin/dashboard"
}

export function isPaymentNotification(
  notification: PaymentNotification | MessageNotification
): notification is PaymentNotification {
  return "payment_id" in notification
}

export function isMessageNotification(
  notification: PaymentNotification | MessageNotification
): notification is MessageNotification {
  return "message_id" in notification
}

/** Resolve the page a notification should open when clicked. */
export function getNotificationTargetPath(
  notification: PaymentNotification | MessageNotification,
  pathname: string
): string {
  if (isMessageNotification(notification)) {
    const thread = encodeURIComponent(notification.thread_id)
    if (pathname.startsWith("/student-dashboard")) {
      return `/student-dashboard/messages?thread=${thread}`
    }
    if (pathname.startsWith("/coach-dashboard")) {
      return `/coach-dashboard/messages?thread=${thread}`
    }
    if (pathname.startsWith("/branch-manager-dashboard")) {
      return `/branch-manager-dashboard/messages?thread=${thread}`
    }
    return `${getDashboardBasePath(pathname)}/messages?thread=${thread}`
  }

  if (isPaymentNotification(notification)) {
    const base = getDashboardBasePath(pathname)
    if (notification.payment_id) {
      return `${base}/payments/${encodeURIComponent(notification.payment_id)}`
    }
    if (notification.student_id) {
      return `${base}/students/edit/${encodeURIComponent(notification.student_id)}`
    }
    return `${base}/payment-tracking`
  }

  return `${getDashboardBasePath(pathname)}/notifications`
}

export function getAllNotificationsPath(pathname: string): string {
  return `${getDashboardBasePath(pathname)}/notifications`
}
