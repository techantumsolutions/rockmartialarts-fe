"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, FileText, Users, BookOpen, DollarSign, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface ReportCategory {
  id: string
  name: string
  icon: any
  description: string
  reports: Array<{
    id: string
    name: string
    icon: any
  }>
}

const reportCategories: ReportCategory[] = [
  {
    id: "coach",
    name: "Coach Reports",
    description: "Comprehensive coach (coach) information and analytics for your academy",
    icon: Users,
    reports: [
      { id: "coach-overview", name: "Coach Overview", icon: Users },
      { id: "coach-performance", name: "Coach Performance", icon: TrendingUp },
      { id: "coach-assignments", name: "Coach Assignments", icon: FileText },
    ]
  },
  {
    id: "branch",
    name: "Academy Reports",
    description: "Academy-specific analytics, performance, and operational reports",
    icon: TrendingUp,
    reports: [
      { id: "academy-performance-overview", name: "Academy Performance Overview", icon: TrendingUp },
      { id: "academy-enrollment-statistics", name: "Academy Enrollment Statistics", icon: FileText },
      { id: "academy-revenue-analysis", name: "Academy Revenue Analysis", icon: TrendingUp },
      { id: "academy-capacity-utilization", name: "Academy Capacity Utilization", icon: FileText },
      { id: "academy-staff-allocation", name: "Academy Staff Allocation", icon: FileText },
      { id: "academy-operational-hours", name: "Academy Operational Hours", icon: FileText },
    ]
  },
  {
    id: "student",
    name: "Student Reports",
    description: "Student enrollment, attendance, and performance analytics",
    icon: Users,
    reports: [
      { id: "student-enrollment-trends", name: "Student Enrollment Trends", icon: TrendingUp },
      { id: "student-attendance-summary", name: "Student Attendance Summary", icon: FileText },
      { id: "student-performance-analytics", name: "Student Performance Analytics", icon: TrendingUp },
      { id: "student-demographics", name: "Student Demographics", icon: FileText },
      { id: "student-retention-analysis", name: "Student Retention Analysis", icon: TrendingUp },
      { id: "student-feedback-summary", name: "Student Feedback Summary", icon: FileText },
    ]
  },
  {
    id: "course",
    name: "Course Reports",
    description: "Course popularity, completion rates, and effectiveness metrics",
    icon: BookOpen,
    reports: [
      { id: "course-popularity-analysis", name: "Course Popularity Analysis", icon: TrendingUp },
      { id: "course-completion-rates", name: "Course Completion Rates", icon: FileText },
      { id: "course-revenue-breakdown", name: "Course Revenue Breakdown", icon: TrendingUp },
      { id: "course-capacity-analysis", name: "Course Capacity Analysis", icon: FileText },
      { id: "course-instructor-performance", name: "Course Instructor Performance", icon: TrendingUp },
      { id: "course-feedback-analysis", name: "Course Feedback Analysis", icon: FileText },
    ]
  },
  {
    id: "financial",
    name: "Financial Reports",
    description: "Revenue, payments, and financial performance tracking",
    icon: DollarSign,
    reports: [
      { id: "revenue-summary", name: "Revenue Summary", icon: TrendingUp },
      { id: "payment-collection-report", name: "Payment Collection Report", icon: FileText },
      { id: "outstanding-dues-analysis", name: "Outstanding Dues Analysis", icon: TrendingUp },
      { id: "refund-and-adjustments", name: "Refund and Adjustments", icon: FileText },
      { id: "financial-forecasting", name: "Financial Forecasting", icon: TrendingUp },
      { id: "expense-tracking", name: "Expense Tracking", icon: FileText },
    ]
  },
  {
    id: "operational",
    name: "Operational Reports",
    description: "Daily operations, scheduling, and resource utilization",
    icon: Calendar,
    reports: [
      { id: "daily-operations-summary", name: "Daily Operations Summary", icon: TrendingUp },
      { id: "resource-utilization", name: "Resource Utilization", icon: FileText },
      { id: "scheduling-efficiency", name: "Scheduling Efficiency", icon: TrendingUp },
      { id: "equipment-maintenance", name: "Equipment Maintenance", icon: FileText },
      { id: "facility-usage-analysis", name: "Facility Usage Analysis", icon: TrendingUp },
      { id: "operational-costs", name: "Operational Costs", icon: FileText },
    ]
  }
]

export default function BranchManagerReports() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
    // Special handling for coach reports - go directly to coach page
    if (categoryId === 'coach') {
      router.push(`/branch-manager-dashboard/reports/coach`)
    } else if (categoryId === 'course') {
      // Special handling for course reports - go directly to dedicated course page
      router.push(`/branch-manager-dashboard/reports/course`)
    } else {
      router.push(`/branch-manager-dashboard/reports/${categoryId}`)
    }
  }

  const handleReportClick = (categoryId: string, reportId: string) => {
    router.push(`/branch-manager-dashboard/reports/${categoryId}/${reportId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Reports" role="branch_admin" />
      
      <main className="w-full p-4 lg:py-4 px-19">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start py-8 mb-4 lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-600">Academy Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Analytics and insights for your branch operations</p>
          </div>
        </div>

        {/* Report Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((category) => {
            const IconComponent = category.icon
            return (
              <Card 
                key={category.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-200"
                onClick={() => handleCategoryClick(category.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {category.name}
                      </CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {category.reports.length} reports
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {category.description}
                  </p>
                  

                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Stats Cards */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Reports</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {reportCategories.reduce((sum, cat) => sum + cat.reports.length, 0)}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-green-600">
                      {reportCategories.length}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Most Popular</p>
                    <p className="text-sm font-bold text-purple-600">
                      Academy Performance
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Last Updated</p>
                    <p className="text-sm font-bold text-orange-600">
                      Today
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Recent Report Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Academy Performance Overview</p>
                      <p className="text-xs text-gray-500">Generated 2 hours ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Report
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Student Enrollment Trends</p>
                      <p className="text-xs text-gray-500">Generated 5 hours ago</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Report
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Revenue Summary</p>
                      <p className="text-xs text-gray-500">Generated yesterday</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
