"use client"
import Header from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Search, ChevronDown, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useParams } from "next/navigation"
import { useState } from "react"

export default function BranchManagerCoachAttendanceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [currentMonth, setCurrentMonth] = useState("May - 2025")
  const [activeTab, setActiveTab] = useState("attendance")

  // Sample coach data based on ID
  const coachData = {
    name: "Avinash",
    age: "32 years",
    gender: "Male",
    expertIn: "Kung fu",
    email: "Avinash@gmail.com",
    contactNumbers: "9848123456",
    address: "Hyderabad",
    experience: "Hyderabad",
    designation: "Sr. Coach",
    branch: "Madhapur",
    totalDays: 75,
    totalDaysPresent: 63,
    lateComings: 12,
    attendancePercentage: 86.7,
    monthlyTotalDays: 31,
    monthlyPresent: 25,
    monthlyLateComings: 5,
    monthlyPercentage: 90,
  }

  const attendanceData = [
    {
      date: "Thurs day, 1 may 2025",
      status: "Present",
      scheduled: "9 am - 6 pm",
      shift: "9 hr Shift: A",
      checkIn: "8:30 AM",
      checkOut: "5:30 PM",
      workedHours: "9 hr 00 min",
      difference: "00",
      isPresent: true,
    },
    {
      date: "Thurs day, 1 may 2025",
      status: "Absent",
      scheduled: "9 am - 6 pm",
      shift: "9 hr Shift: A",
      checkIn: "No Records",
      checkOut: "No Records",
      workedHours: "--",
      difference: "-9 hr",
      isAbsent: true,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header title="Coach Attendance" role="branch_admin" />

      <main className="w-full p-4 lg:px-8 overflow-x-hidden flex gap-4 flex-col">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-[#0A1629]">Coach Attendance</h1>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <Button className="bg-yellow-400 hover:bg-yellow-500 text-white text-sm">Send Alerts</Button>
            <Button variant="outline" className="text-sm bg-transparent text-[#5A6ACF]">
              View Report
            </Button>
            <Button variant="outline" className="text-sm flex items-center space-x-2 bg-transparent text-[#5A6ACF]">
              <span>📥</span>
              <span>Download attendance sheet</span>
            </Button>
          </div>
        </div>

        {/* Coach Profile Card */}
        <Card >
          <CardContent className="py-2 px-8 flex flex-col">
            {/* Attendance Overview */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 boeder border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Attendance Overview</h2>
              <div className="flex gap-2">
                <Select defaultValue="2023-2024">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="annual">
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-row gap-4 justify-between">
              {/* image div */}
              <div className="relative">
                <img
                  src="/professional-martial-arts-coach.jpg"
                  alt="Coach"
                  className="w-full h-72 object-cover rounded-lg"
                />
                <div className="absolute bottom-4 left-10 flex gap-2">
                  <Badge className="bg-green-500 text-white font-semibold px-3 py-1">Branch Admin</Badge>
                  <Badge className="bg-gray-800 text-white font-semibold px-3 py-1">Full Time</Badge>
                </div>
              </div>
              {/* personal detail div */}
              <div className="flex gap-4 flex-col">
                <h3 className="font-semibold text-gray-700 mb-2">Personal Details:</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coach Name</span>
                    <span>{coachData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span>{coachData.age}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender</span>
                    <span>{coachData.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expert in</span>
                    <span>{coachData.expertIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email</span>
                    <span>{coachData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 mr-4">Contact numbers</span>
                    <span>{coachData.contactNumbers}</span>
                  </div>
                </div>
              </div>
              <div className="mt-11">
                <div className="flex gap-4 flex-col">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address</span>
                    <span>{coachData.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Experience</span>
                    <span>{coachData.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 mr-8">Designation</span>
                    <span>{coachData.designation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Branch</span>
                    <span>{coachData.branch}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{coachData.totalDays}</div>
                      <div className="text-sm text-gray-600">Total Days</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{coachData.totalDaysPresent}</div>
                      <div className="text-sm text-gray-600">Total days Present</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex flex-col gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">{coachData.lateComings}</div>
                      <div className="text-sm text-gray-600">Late Comings</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{coachData.attendancePercentage}%</div>
                      <div className="text-sm text-gray-600">Attendance Percentage</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">

            <Card>
            <CardContent className="py-6">
                        {/* Statistics Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Monthly Navigation */}
            <div className="flex justify-between items-center border-b border-gray-200 p-4">

              {/* Attendance/Leaves Tabs */}
              <div className="flex space-x-2 border-r border-gray-200 justify-center w-full">
                <Button
                  onClick={() => setActiveTab("attendance")}
                  className={
                    activeTab === "attendance"
                      ? "bg-yellow-400 hover:bg-yellow-500 text-black"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }
                >
                  Attendance
                </Button>
                <Button
                  onClick={() => setActiveTab("leaves")}
                  className={
                    activeTab === "leaves"
                      ? "bg-yellow-400 hover:bg-yellow-500 text-black"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }
                >
                  Leaves
                </Button>
              </div>
              <div className="flex items-center justify-center border-r border-gray-200 space-x-4 w-full">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth("April - 2025")}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-semibold">{currentMonth}</h3>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth("June - 2025")}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="w-full border-r border-gray-200 flex justify-center text-[#5A6ACF]">
              <Button variant="outline" size="sm" >
                View Report
              </Button>
              </div>
              <div className="flex gap-2 w-full px-6">
                <span className="text-xs text-gray-600">View by:</span>
                <Select defaultValue="month">
                  <SelectTrigger className="w-20 h-8 bg-[#F1F1F1] text-[#9593A8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-600">Filter by:</span>
                <Select defaultValue="jan-2025">
                  <SelectTrigger className="w-24 h-8 bg-[#F1F1F1] text-[#9593A8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jan-2025">Jan 2025</SelectItem>
                    <SelectItem value="feb-2025">Feb 2025</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="june-2025">
                  <SelectTrigger className="w-24 h-8 bg-[#F1F1F1] text-[#9593A8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="june-2025">June 2025</SelectItem>
                    <SelectItem value="july-2025">July 2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Monthly Statistics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-gray-200 py-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{coachData.monthlyTotalDays}</div>
                  <div className="text-sm text-gray-600">Total Days</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{coachData.monthlyPresent}</div>
                  <div className="text-sm text-gray-600">Total days Present</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{coachData.monthlyLateComings}</div>
                  <div className="text-sm text-gray-600">Late Comings</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{coachData.monthlyPercentage}%</div>
                  <div className="text-sm text-gray-600">Attendance Percentage</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Attendance Table */}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Scheduled</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Check in</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Check out</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Worked hours</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-600">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((record, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">{record.date}</td>
                        <td className="py-3 px-2">
                          <Badge className={record.isPresent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <div>{record.scheduled}</div>
                            <div className="text-xs text-gray-500">{record.shift}</div>
                          </div>
                        </td>
                        <td className="py-3 px-2">{record.checkIn}</td>
                        <td className="py-3 px-2">{record.checkOut}</td>
                        <td className="py-3 px-2">{record.workedHours}</td>
                        <td className="py-3 px-2">
                          <span className={record.difference.includes("-") ? "text-red-600" : "text-gray-900"}>
                            {record.difference}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
