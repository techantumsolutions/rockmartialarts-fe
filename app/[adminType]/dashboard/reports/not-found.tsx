"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft, Home, Search, RefreshCw } from 'lucide-react'

export default function ReportsNotFound() {
  const handleRefresh = () => {
    window.location.reload()
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/dashboard/reports'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="w-full p-4 lg:px-8 mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto mb-6 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Error Title */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Report Not Found
              </h1>

              {/* Error Description */}
              <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
                The report or category you're looking for doesn't exist or may have been moved.
              </p>

              {/* Possible Reasons */}
              <div className="bg-white border border-red-200 rounded-lg p-4 mb-8 text-left max-w-lg mx-auto">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Possible reasons:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    The report category or ID in the URL is incorrect
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    The report may have been removed or renamed
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    You may not have permission to access this report
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    There might be a temporary server issue
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  onClick={handleGoBack}
                  className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>

                <Link href="/dashboard/reports">
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50 min-w-[140px]"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    All Reports
                  </Button>
                </Link>

                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  className="min-w-[140px]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>

              {/* Help Text */}
              <div className="mt-8 pt-6 border-t border-red-200">
                <p className="text-sm text-gray-500 mb-4">
                  Need help finding a specific report?
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <Link href="/dashboard/reports">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">Browse Categories</h4>
                      <p className="text-xs text-gray-500">View all available report categories</p>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                      <h4 className="font-medium text-gray-900 text-sm mb-1">Dashboard</h4>
                      <p className="text-xs text-gray-500">Return to main dashboard</p>
                    </div>
                  </Link>
                  
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 text-sm mb-1">Contact Support</h4>
                    <p className="text-xs text-gray-500">Get help with reports access</p>
                  </div>
                </div>
              </div>

              {/* URL Information (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-3 bg-gray-100 border border-gray-300 rounded text-left max-w-lg mx-auto">
                  <p className="text-xs font-mono text-gray-700">
                    <strong>Current URL:</strong> {window.location.pathname}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    This information is only shown in development mode.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Navigation */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Popular Report Categories
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: 'Student Reports', href: '/dashboard/reports/student' },
              { name: 'Financial Reports', href: '/dashboard/reports/financial' },
              { name: 'Course Reports', href: '/dashboard/reports/course' },
              { name: 'Coach Reports', href: '/dashboard/reports/coach' },
              { name: 'Academy Reports', href: '/dashboard/reports/branch' },
              { name: 'Coach Reports', href: '/dashboard/reports/coach' }
            ].map((category) => (
              <Link key={category.name} href={category.href}>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                  <p className="text-sm font-medium text-gray-900">{category.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
