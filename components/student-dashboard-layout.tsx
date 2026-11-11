"use client"

import { ReactNode, Suspense } from "react"
import { ErrorBoundary } from "@/components/error-boundary"
import { PageLoading } from "@/components/ui/loading-skeleton"
import { cn } from "@/lib/utils"

interface StudentDashboardLayoutProps {
  children: ReactNode
  studentName?: string
  onLogout?: () => void
  isLoading?: boolean
  notificationCount?: number
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "none" | "sm" | "md" | "lg"
  showBreadcrumb?: boolean
  breadcrumbItems?: Array<{ label: string; href?: string }>
  pageTitle?: string
  pageDescription?: string
  headerActions?: ReactNode
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-none",
  "2xl": "max-w-screen-2xl",
  full: "max-w-none"
}

const paddingClasses = {
  none: "px-0",
  sm: "px-2 sm:px-4",
  md: "px-2 sm:px-4 lg:px-6",
  lg: "px-4 sm:px-6 lg:px-8"
}

export default function StudentDashboardLayout({
  children,
  studentName,
  onLogout,
  isLoading = false,
  notificationCount = 0,
  className,
  maxWidth = "xl",
  padding = "none",
  showBreadcrumb = false,
  breadcrumbItems = [],
  pageTitle,
  pageDescription,
  headerActions
}: StudentDashboardLayoutProps) {
  return (
    <ErrorBoundary>
      <div className={cn("relative w-full", className)}>
        <div className={cn("mx-auto", maxWidthClasses[maxWidth], paddingClasses[padding])}>
          {/* Breadcrumb Navigation */}
          {showBreadcrumb && breadcrumbItems.length > 0 && (
            <nav className="mb-4" aria-label="Breadcrumb navigation">
              <ol className="flex items-center space-x-2 text-sm" role="list">
                {breadcrumbItems.map((item, index) => (
                  <li key={index} className="flex items-center" role="listitem">
                    {index > 0 && (
                      <svg
                        className="w-4 h-4 text-gray-400 mx-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-gray-600 hover:text-yellow-600 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 rounded-sm"
                        aria-label={index === 0 ? `Go to ${item.label}` : `Go back to ${item.label}`}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <span
                        className="text-gray-900 font-semibold"
                        aria-current="page"
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Page Header */}
          {(pageTitle || pageDescription || headerActions) && (
            <header className="mb-6" role="banner">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  {pageTitle && (
                    <h1
                      className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1"
                      id="page-title"
                      tabIndex={-1}
                    >
                      {pageTitle}
                    </h1>
                  )}
                  {pageDescription && (
                    <p
                      className="text-gray-600 text-sm sm:text-base leading-relaxed"
                      id="page-description"
                      aria-describedby="page-title"
                    >
                      {pageDescription}
                    </p>
                  )}
                </div>
                {headerActions && (
                  <div
                    className="flex-shrink-0"
                    role="toolbar"
                    aria-label="Page actions"
                  >
                    {headerActions}
                  </div>
                )}
              </div>
            </header>
          )}

          {/* Page Content */}
          <Suspense fallback={<PageLoading />}>
            <ErrorBoundary>
              <div className="relative">
                {children}
                
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg min-h-[200px]">
                    <div className="flex items-center space-x-3 text-yellow-600 bg-white px-6 py-3 rounded-lg shadow-lg">
                      <div className="w-5 h-5 border-2 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
                      <span className="text-sm font-medium">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
            </ErrorBoundary>
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  )
}

// Specialized layout variants
export function StudentDashboardPageLayout({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  ...props
}: Omit<StudentDashboardLayoutProps, 'pageTitle' | 'pageDescription' | 'headerActions' | 'breadcrumbItems'> & {
  title?: string
  description?: string
  actions?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}) {
  return (
    <StudentDashboardLayout
      pageTitle={title}
      pageDescription={description}
      headerActions={actions}
      breadcrumbItems={breadcrumbs}
      showBreadcrumb={!!breadcrumbs?.length}
      {...props}
    >
      {children}
    </StudentDashboardLayout>
  )
}

export function StudentDashboardCardLayout({
  children,
  ...props
}: StudentDashboardLayoutProps) {
  return (
    <StudentDashboardLayout {...props}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
        {children}
      </div>
    </StudentDashboardLayout>
  )
}
