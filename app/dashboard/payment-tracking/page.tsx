"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Bell, Search, ChevronDown, MoreHorizontal, Download, MessageCircle, Mail, DollarSign, TrendingUp, Users, Calendar, Eye, Filter } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import Link from "next/link"
import DashboardHeader from "@/components/dashboard-header"
import { useToast } from "@/hooks/use-toast"
import paymentAPI from "@/lib/paymentAPI"

interface Payment {
  id: string
  student_id?: string
  student_name?: string | null
  amount?: number | null
  payment_type?: string
  payment_method?: string | null
  payment_status: string
  transaction_id?: string | null
  payment_date?: string | null
  course_name?: string | null
  branch_name?: string | null
  created_at?: string | null
}

interface PaymentStats {
  total_collected: number
  pending_payments: number
  total_students: number
  this_month_collection: number
}

export default function PaymentTrackingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    total_collected: 0,
    pending_payments: 0,
    total_students: 0,
    this_month_collection: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [exporting, setExporting] = useState(false)

  // Fetch payments and stats
  useEffect(() => {
    fetchPayments()
    fetchStats()
  }, [])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payments/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error)
    }
  }

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = (payment.student_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (payment.transaction_id?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                         (payment.course_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter
    const matchesType = typeFilter === "all" || payment.payment_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">Paid</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  // Handle export
  const handleExport = async () => {
    if (exporting) return

    setExporting(true)
    try {
      toast({
        title: "Exporting payments...",
        description: "Your payment report is being generated.",
      })

      await paymentAPI.exportPayments({
        status: statusFilter,
        payment_type: typeFilter,
        format: 'csv'
      })

      toast({
        title: "Export successful",
        description: "Payment report has been downloaded.",
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export payment report",
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Payment Tracking" />

      <main className="w-full p-4 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment Tracking</h1>

       {/* Filter Bar */}
        <div className="flex  items-center justify-between border-1 shadow overflow-x-auto p-6 gap-6 mb-0">
          {/* Branch Select */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Select Branch:</span>
            <Select>
              <SelectTrigger className="w-48 bg-gray-100 text-gray-600 border-0">
                <SelectValue placeholder="Choose branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="madhapur">Madhapur</SelectItem>
                <SelectItem value="hitech">Hitech City</SelectItem>
                <SelectItem value="gachibowli">Gachibowli</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Alerts Button */}
          <Button className="bg-yellow-400 hover:bg-yellow-500  text-[#fff] text-[10px] px-6 py-2 w-[120px] rounded-md shadow-sm">
            Payment alerts
          </Button>

          {/* Export Report Button */}
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="bg-transparent border border-gray-300  text-[#5A6ACF] text-[10px] w-[120px] hover:bg-gray-100 px-6 py-2 rounded-md flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>

          {/* View & Filter Options */}
        
            {/* View By */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View by:</span>
              <Select defaultValue="weekly">
                <SelectTrigger className="w-28 bg-gray-100 border-0 text-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter By */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Filter by:</span>
              <Select defaultValue="jan-2025">
                <SelectTrigger className="w-32 bg-gray-100 border-0 text-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jan-2025">Jan 2025</SelectItem>
                  <SelectItem value="feb-2025">Feb 2025</SelectItem>
                  <SelectItem value="mar-2025">Mar 2025</SelectItem>
                </SelectContent>
              </Select>

              <Select defaultValue="april-2025">
                <SelectTrigger className="w-32 bg-gray-100 border-0 text-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="april-2025">April 2025</SelectItem>
                  <SelectItem value="may-2025">May 2025</SelectItem>
                  <SelectItem value="june-2025">June 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          
        </div>
        {/* Payment Table */}
        <div className="bg-white  rounded-b-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Course enrolled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Invoice Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Paid Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Payment date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#000] uppercase tracking-wider">
                  Action Alerts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2 text-gray-500">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.student_id ? (
                        <Link
                          href={`/dashboard/students/${payment.student_id}`}
                          className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {payment.student_name || "Unknown Student"}
                        </Link>
                      ) : (
                        payment.student_name || "Unknown Student"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.course_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{payment.amount?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{payment.amount?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.payment_date || payment.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.payment_method || 'N/A'} - {payment.transaction_id || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          payment.payment_status === "paid"
                            ? "bg-green-100 text-green-800"
                            : payment.payment_status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {payment.payment_status === "paid" ? "Paid" : payment.payment_status === "pending" ? "Pending" : "Failed"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1"
                          onClick={() => router.push(`/dashboard/payments/${payment.id}`)}
                          title="Explore Payment Details"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-1" title="Download Receipt">
                          <Download className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-1" title="Send Message">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-1" title="Send Email">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
