"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showBackButton?: boolean
  showHomeButton?: boolean
  className?: string
  separator?: React.ReactNode
  maxItems?: number
}

export function Breadcrumb({
  items,
  showBackButton = false,
  showHomeButton = true,
  className = '',
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />,
  maxItems = 5
}: BreadcrumbProps) {
  const router = useRouter()

  // Truncate items if they exceed maxItems
  const displayItems = items.length > maxItems 
    ? [
        items[0],
        { label: '...', current: false },
        ...items.slice(-(maxItems - 2))
      ]
    : items

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm ${className}`}
      aria-label="Breadcrumb navigation"
    >
      {/* Back Button */}
      {showBackButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="p-1 h-8 w-8 hover:bg-gray-100"
          aria-label="Go back to previous page"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Home Button */}
      {showHomeButton && (
        <>
          <Link
            href="/dashboard"
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Go to dashboard home"
          >
            <Home className="w-4 h-4" />
          </Link>
          {items.length > 0 && (
            <span className="text-gray-400" aria-hidden="true">
              {separator}
            </span>
          )}
        </>
      )}

      {/* Breadcrumb Items */}
      <ol className="flex items-center space-x-2" role="list">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const isCurrent = item.current || isLast

          return (
            <li key={index} className="flex items-center space-x-2">
              {item.label === '...' ? (
                <span className="text-gray-400 px-1">...</span>
              ) : (
                <>
                  {item.href && !isCurrent ? (
                    <Link
                      href={item.href}
                      className="flex items-center text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {item.icon && <item.icon className="w-4 h-4 mr-1" />}
                      <span className="truncate max-w-[150px]">{item.label}</span>
                    </Link>
                  ) : (
                    <span 
                      className={`flex items-center ${
                        isCurrent 
                          ? 'text-gray-900 font-medium' 
                          : 'text-gray-500'
                      }`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {item.icon && <item.icon className="w-4 h-4 mr-1" />}
                      <span className="truncate max-w-[150px]">{item.label}</span>
                    </span>
                  )}
                </>
              )}

              {/* Separator */}
              {!isLast && item.label !== '...' && (
                <span className="text-gray-400" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Specialized breadcrumb for reports
export function ReportsBreadcrumb({
  categoryId,
  categoryName,
  reportId,
  reportName,
  className = ''
}: {
  categoryId?: string
  categoryName?: string
  reportId?: string
  reportName?: string
  className?: string
}) {
  const items: BreadcrumbItem[] = [
    {
      label: 'Reports',
      href: '/dashboard/reports'
    }
  ]

  if (categoryId && categoryName) {
    items.push({
      label: categoryName,
      href: reportId ? `/dashboard/reports/${categoryId}` : undefined,
      current: !reportId
    })
  }

  if (reportId && reportName) {
    items.push({
      label: reportName,
      current: true
    })
  }

  return (
    <Breadcrumb
      items={items}
      showBackButton={true}
      className={className}
    />
  )
}

// Hook for building breadcrumb items from route
export function useBreadcrumbFromRoute() {
  const router = useRouter()
  
  const buildBreadcrumb = (pathname: string): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []

    // Build breadcrumb based on route segments
    let currentPath = ''
    
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1

      // Customize labels based on route patterns
      let label = segment
      let href = isLast ? undefined : currentPath

      switch (segment) {
        case 'dashboard':
          label = 'Dashboard'
          href = '/dashboard'
          break
        case 'reports':
          label = 'Reports'
          if (!isLast) href = '/dashboard/reports'
          break
        case 'students':
          label = 'Students'
          break
        case 'courses':
          label = 'Courses'
          break
        case 'coaches':
          label = 'Coaches'
          break
        case 'branches':
          label = 'Academies'
          break
        default:
          // Capitalize and format segment
          label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
      }

      items.push({
        label,
        href,
        current: isLast
      })
    })

    return items
  }

  return { buildBreadcrumb }
}

// Breadcrumb with error boundary
export function SafeBreadcrumb(props: BreadcrumbProps) {
  try {
    return <Breadcrumb {...props} />
  } catch (error) {
    console.error('Breadcrumb error:', error)
    
    // Fallback breadcrumb
    return (
      <nav className="flex items-center space-x-2 text-sm">
        <Link
          href="/dashboard"
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <Home className="w-4 h-4" />
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900">Current Page</span>
      </nav>
    )
  }
}

export default Breadcrumb
