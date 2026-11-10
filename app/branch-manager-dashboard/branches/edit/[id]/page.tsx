"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building, MapPin, Users, Clock, CreditCard, AlertCircle, Loader2, X, Calendar } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface FormData {
  branch: {
    name: string
    code: string
    email: string
    phone: string
    address: {
      line1: string
      area: string
      city: string
      state: string
      pincode: string
      country: string
    }
  }
  location_id: string
  manager_id: string
  operational_details: {
    courses_offered: string[]
    timings: Array<{
      day: string
      open: string
      close: string
    }>
    holidays: string[]
  }
  assignments: {
    accessories_available: boolean
    courses: string[]
    branch_admins: string[]
  }
  bank_details: {
    bank_name: string
    account_number: string
    upi_id: string
  }
}

interface FormErrors {
  [key: string]: string
}

export default function EditBranch() {
  const router = useRouter()
  const params = useParams()
  const branchId = params.id as string
  const { toast } = useToast()

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  // State for new timing form
  const [newTiming, setNewTiming] = useState({
    day: "",
    open: "07:00",
    close: "19:00"
  })

  const [formData, setFormData] = useState<FormData>({
    branch: {
      name: "",
      code: "",
      email: "",
      phone: "",
      address: {
        line1: "",
        area: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      }
    },
    location_id: "",
    manager_id: "",
    operational_details: {
      courses_offered: [],
      timings: [],
      holidays: []
    },
    assignments: {
      accessories_available: false,
      courses: [],
      branch_admins: []
    },
    bank_details: {
      bank_name: "",
      account_number: "",
      upi_id: ""
    }
  })

  // Available options
  const [availableCourses, setAvailableCourses] = useState<any[]>([])
  const [availableManagers, setAvailableManagers] = useState<any[]>([])
  const [availableAdmins, setAvailableAdmins] = useState<any[]>([])
  const [availableStates, setAvailableStates] = useState<any[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false)

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const token = BranchManagerAuth.getToken()

        // Fetch branch data and other required data in parallel
        const [branchResponse, coursesResponse, managersResponse, adminsResponse, statesResponse] = await Promise.allSettled([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branches/${branchId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses?active_only=true&limit=100`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branch-managers?active_only=true&limit=100`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/coaches?active_only=true&limit=100`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ])

        // Handle branch data
        if (branchResponse.status === 'fulfilled' && branchResponse.value.ok) {
          const branchData = await branchResponse.value.json()
          console.log('Branch data received:', branchData)
          setFormData(branchData)
        } else {
          console.error('Failed to fetch branch data:', branchResponse)
          toast({
            title: "Error",
            description: "Failed to load branch data. Please try again.",
            variant: "destructive",
          })
        }

        // Handle courses data
        if (coursesResponse.status === 'fulfilled' && coursesResponse.value.ok) {
          const coursesData = await coursesResponse.value.json()
          setAvailableCourses(coursesData.courses || [])
        } else {
          console.warn('Failed to fetch courses data')
          setAvailableCourses([])
        }

        // Handle managers data
        if (managersResponse.status === 'fulfilled' && managersResponse.value.ok) {
          const managersData = await managersResponse.value.json()
          const managers = managersData.branch_managers || []
          setAvailableManagers(managers.map((manager: any) => ({
            id: manager.id,
            name: manager.full_name || `${manager.personal_info?.first_name || ''} ${manager.personal_info?.last_name || ''}`.trim()
          })))
        } else {
          console.warn('Failed to fetch managers data')
          setAvailableManagers([])
        }

        // Handle admins data (coaches)
        if (adminsResponse.status === 'fulfilled' && adminsResponse.value.ok) {
          const adminsData = await adminsResponse.value.json()
          const coaches = adminsData.coaches || []
          setAvailableAdmins(coaches.map((coach: any) => ({
            id: coach.id,
            name: coach.full_name || `${coach.personal_info?.first_name || ''} ${coach.personal_info?.last_name || ''}`.trim()
          })))
        } else {
          console.warn('Failed to fetch coaches data')
          setAvailableAdmins([])
        }

        // Handle states data (locations)
        if (statesResponse.status === 'fulfilled' && statesResponse.value.ok) {
          const statesData = await statesResponse.value.json()
          const locations = statesData.locations || []
          setAvailableStates(locations.map((location: any) => ({
            id: location.id,
            name: location.state
          })))
        } else {
          console.warn('Failed to fetch locations data')
          setAvailableStates([])
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load branch data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (branchId) {
      fetchData()
    }
  }, [branchId, toast])

  const handleInputChange = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current: any = newData

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }

      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const addTiming = () => {
    if (!newTiming.day) return

    const existingIndex = formData.operational_details.timings.findIndex(t => t.day === newTiming.day)

    if (existingIndex >= 0) {
      // Update existing timing
      const updatedTimings = formData.operational_details.timings.map((timing, index) =>
        index === existingIndex ? { ...newTiming } : timing
      )
      handleInputChange('operational_details.timings', updatedTimings)
    } else {
      // Add new timing
      handleInputChange('operational_details.timings', [...formData.operational_details.timings, { ...newTiming }])
    }

    setNewTiming({ day: "", open: "07:00", close: "19:00" })
  }

  const removeTiming = (index: number) => {
    const updatedTimings = formData.operational_details.timings.filter((_, i) => i !== index)
    handleInputChange('operational_details.timings', updatedTimings)
  }

  const addHoliday = (date: string) => {
    if (!date || formData.operational_details.holidays.includes(date)) return

    handleInputChange('operational_details.holidays', [...formData.operational_details.holidays, date])
  }

  const removeHoliday = (holidayIndex: number) => {
    const updatedHolidays = formData.operational_details.holidays.filter((_, index) => index !== holidayIndex)
    handleInputChange('operational_details.holidays', updatedHolidays)
  }

  const handleTimingChange = (index: number, field: 'open' | 'close', value: string) => {
    const updatedTimings = formData.operational_details.timings.map((timing, i) =>
      i === index ? { ...timing, [field]: value } : timing
    )
    handleInputChange('operational_details.timings', updatedTimings)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Edit Branch" role="branch_admin" />
        <main className="w-full mx-auto p-4 sm:p-6 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading branch data...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Edit Branch" role="branch_admin" />

      <main className="w-full mx-auto p-4 sm:p-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/branch-manager-dashboard/branches")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Branches</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#4F5077]">Edit Branch</h1>
              <p className="text-[#7D8592]">Update branch information and settings</p>
            </div>
          </div>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault()
          setIsSubmitting(true)

          try {
            const token = BranchManagerAuth.getToken()
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branches/${branchId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(formData)
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}))
              throw new Error(errorData.detail || 'Failed to update branch')
            }

            const result = await response.json()
            console.log('Branch updated successfully:', result)

            setShowSuccessPopup(true)
            setTimeout(() => {
              setShowSuccessPopup(false)
              router.push('/branch-manager-dashboard/branches')
            }, 2000)

          } catch (error) {
            console.error('Error updating branch:', error)
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to update branch. Please try again.",
              variant: "destructive",
            })
          } finally {
            setIsSubmitting(false)
          }
        }}>
          <div className="flex flex-row gap-6">
            <div className="flex flex-col gap-6 w-full">
              {/* Branch & Address Information */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-[#4F5077]">
                    <Building className="w-5 h-5" />
                    <span>Branch & Address Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-[#7D8592]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="branchName">Branch Name *</Label>
                      <Input
                        id="branchName"
                        value={formData.branch.name}
                        onChange={(e) => handleInputChange('branch.name', e.target.value)}
                        placeholder="Enter branch name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branchCode">Branch Code *</Label>
                      <Input
                        id="branchCode"
                        value={formData.branch.code}
                        onChange={(e) => handleInputChange('branch.code', e.target.value)}
                        placeholder="Enter branch code"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="branchEmail">Email *</Label>
                      <Input
                        id="branchEmail"
                        type="email"
                        value={formData.branch.email}
                        onChange={(e) => handleInputChange('branch.email', e.target.value)}
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branchPhone">Phone *</Label>
                      <Input
                        id="branchPhone"
                        value={formData.branch.phone}
                        onChange={(e) => handleInputChange('branch.phone', e.target.value)}
                        placeholder="Enter phone number"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={formData.branch.address.line1}
                      onChange={(e) => handleInputChange('branch.address.line1', e.target.value)}
                      placeholder="Enter address line 1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="area">Area</Label>
                      <Input
                        id="area"
                        value={formData.branch.address.area}
                        onChange={(e) => handleInputChange('branch.address.area', e.target.value)}
                        placeholder="Enter area"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.branch.address.city}
                        onChange={(e) => handleInputChange('branch.address.city', e.target.value)}
                        placeholder="Enter city"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Select
                        value={formData.branch.address.state}
                        onValueChange={(value) => handleInputChange('branch.address.state', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStates.map((state) => (
                            <SelectItem key={state.id || state.name} value={state.name}>
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        value={formData.branch.address.pincode}
                        onChange={(e) => handleInputChange('branch.address.pincode', e.target.value)}
                        placeholder="Enter pincode"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.branch.address.country}
                        onChange={(e) => handleInputChange('branch.address.country', e.target.value)}
                        placeholder="Enter country"
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manager">Branch Manager</Label>
                    <Select
                      value={formData.manager_id}
                      onValueChange={(value) => handleInputChange('manager_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableManagers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Course & Staff Assignments */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-[#4F5077]">
                    <Users className="w-5 h-5" />
                    <span>Course & Staff Assignments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-[#7D8592]">
                  {/* Accessories Available */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accessoriesAvailable"
                      checked={formData.assignments.accessories_available}
                      onCheckedChange={(checked) => handleInputChange('assignments.accessories_available', checked)}
                    />
                    <Label htmlFor="accessoriesAvailable">Accessories Available at Branch</Label>
                  </div>

                  {/* Course Assignments */}
                  <div className="space-y-2">
                    <Label>Assign Courses to Branch</Label>
                    {isLoadingCourses ? (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">Loading courses...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
                        {availableCourses.length > 0 ? (
                          availableCourses.map((course) => (
                            <div key={course.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`course-assign-${course.id}`}
                                checked={formData.assignments.courses.includes(course.id)}
                                onCheckedChange={() => {
                                  const isSelected = formData.assignments.courses.includes(course.id)
                                  const updatedCourses = isSelected
                                    ? formData.assignments.courses.filter(c => c !== course.id)
                                    : [...formData.assignments.courses, course.id]

                                  handleInputChange('assignments.courses', updatedCourses)
                                }}
                              />
                              <Label htmlFor={`course-assign-${course.id}`} className="text-sm cursor-pointer">
                                {course.name}
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <p className="text-sm">No courses available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.assignments.courses.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
                        {formData.assignments.courses.map((courseId) => {
                          const course = availableCourses.find(c => c.id === courseId)
                          return course ? (
                            <Badge key={courseId} variant="secondary" className="bg-green-100 text-green-800">
                              {course.name}
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedCourses = formData.assignments.courses.filter(c => c !== courseId)
                                  handleInputChange('assignments.courses', updatedCourses)
                                }}
                                className="ml-2 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>

                  {/* Branch Admins */}
                  <div className="space-y-2">
                    <Label>Branch Administrators</Label>
                    {isLoadingAdmins ? (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">Loading administrators...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-32 overflow-y-auto">
                        {availableAdmins.length > 0 ? (
                          availableAdmins.map((admin) => (
                            <div key={admin.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`admin-${admin.id}`}
                                checked={formData.assignments.branch_admins.includes(admin.id)}
                                onCheckedChange={() => {
                                  const isSelected = formData.assignments.branch_admins.includes(admin.id)
                                  const updatedAdmins = isSelected
                                    ? formData.assignments.branch_admins.filter(a => a !== admin.id)
                                    : [...formData.assignments.branch_admins, admin.id]

                                  handleInputChange('assignments.branch_admins', updatedAdmins)
                                }}
                              />
                              <Label htmlFor={`admin-${admin.id}`} className="text-sm cursor-pointer">
                                {admin.name}
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <p className="text-sm">No administrators available</p>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.assignments.branch_admins.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.assignments.branch_admins.map((adminId) => {
                          const admin = availableAdmins.find(a => a.id === adminId)
                          return admin ? (
                            <Badge key={adminId} variant="secondary" className="bg-purple-100 text-purple-800">
                              {admin.name}
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedAdmins = formData.assignments.branch_admins.filter(a => a !== adminId)
                                  handleInputChange('assignments.branch_admins', updatedAdmins)
                                }}
                                className="ml-2 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-col gap-6 w-full">
              {/* Top Right Card - Operational Details */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-[#4F5077]">
                    <span>Operational Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-[#7D8592]">
                  {/* Courses Offered */}
                  <div className="space-y-2">
                    <Label>Courses Offered *</Label>
                    {isLoadingCourses ? (
                      <div className="p-4 text-center text-gray-500">
                        <p className="text-sm">Loading courses...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                        {availableCourses.length > 0 ? (
                          availableCourses.map((course) => (
                            <div key={course.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`course-offered-${course.id}`}
                                checked={formData.operational_details.courses_offered.includes(course.name)}
                                onCheckedChange={() => {
                                  const isSelected = formData.operational_details.courses_offered.includes(course.name)
                                  const updatedCourses = isSelected
                                    ? formData.operational_details.courses_offered.filter(c => c !== course.name)
                                    : [...formData.operational_details.courses_offered, course.name]

                                  handleInputChange('operational_details.courses_offered', updatedCourses)
                                }}
                              />
                              <Label htmlFor={`course-offered-${course.id}`} className="text-sm cursor-pointer">
                                {course.name}
                              </Label>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <p className="text-sm">No courses available</p>
                          </div>
                        )}
                      </div>
                    )}
                    {errors.coursesOffered && <p className="text-red-500 text-sm">{errors.coursesOffered}</p>}

                    {formData.operational_details.courses_offered.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.operational_details.courses_offered.map((course) => (
                          <Badge key={course} variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {course}
                            <button
                              type="button"
                              onClick={() => {
                                const updatedCourses = formData.operational_details.courses_offered.filter(c => c !== course)
                                handleInputChange('operational_details.courses_offered', updatedCourses)
                              }}
                              className="ml-2 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Operating Hours - Dynamic */}
                  <div className="space-y-2">
                    <Label>Operating Hours</Label>

                    {/* Add New Timing Form */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Day</Label>
                          <Select
                            value={newTiming.day}
                            onValueChange={(value) => setNewTiming(prev => ({ ...prev, day: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              {daysOfWeek.map((day) => (
                                <SelectItem key={day} value={day}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Open Time</Label>
                          <Input
                            type="time"
                            value={newTiming.open}
                            onChange={(e) => setNewTiming(prev => ({ ...prev, open: e.target.value }))}
                            className="text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Close Time</Label>
                          <Input
                            type="time"
                            value={newTiming.close}
                            onChange={(e) => setNewTiming(prev => ({ ...prev, close: e.target.value }))}
                            className="text-xs"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addTiming}
                          disabled={!newTiming.day}
                          className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300"
                        >
                          {formData.operational_details.timings.some(t => t.day === newTiming.day) ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </div>

                    {/* Display Added Timings */}
                    {formData.operational_details.timings.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <Label className="text-sm font-medium">Configured Operating Hours:</Label>
                        {formData.operational_details.timings.map((timing, index) => (
                          <div key={`${timing.day}-${index}`} className="grid grid-cols-4 gap-2 items-center p-2 bg-white border rounded">
                            <div className="font-medium text-sm">{timing.day}</div>
                            <Input
                              type="time"
                              value={timing.open}
                              onChange={(e) => handleTimingChange(index, 'open', e.target.value)}
                              className="text-xs"
                            />
                            <Input
                              type="time"
                              value={timing.close}
                              onChange={(e) => handleTimingChange(index, 'close', e.target.value)}
                              className="text-xs"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeTiming(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.operational_details.timings.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No operating hours configured yet. Add days and times above.</p>
                    )}
                  </div>

                  {/* Holidays */}
                  <div className="space-y-2">
                    <Label>Holidays</Label>
                    <div className="flex space-x-2">
                      <div className="relative w-full max-w-sm">
                        <Input
                          type="date"
                          id="holidayDate"
                          className="w-full pl-3 pr-9 py-1.5 h-9 text-xs sm:text-sm bg-white border-gray-200 rounded-md cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0"
                          onClick={(e) => e.currentTarget.showPicker?.()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const input = e.target as HTMLInputElement
                              addHoliday(input.value)
                              input.value = ''
                            }
                          }}
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById('holidayDate') as HTMLInputElement
                          addHoliday(input.value)
                          input.value = ''
                        }}
                      >
                        Add
                      </Button>
                    </div>

                    {formData.operational_details.holidays.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
                        {formData.operational_details.holidays.map((holiday, index) => (
                          <Badge key={holiday} variant="secondary" className="bg-blue-100 text-blue-800">
                            {holiday}
                            <button
                              type="button"
                              onClick={() => removeHoliday(index)}
                              className="ml-2 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Bottom Right Card - Bank Details */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-[#4F5077]">
                    <span>Bank Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-[#7D8592]">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bank_details.bank_name}
                      onChange={(e) => handleInputChange('bank_details.bank_name', e.target.value)}
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.bank_details.account_number}
                      onChange={(e) => handleInputChange('bank_details.account_number', e.target.value)}
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      value={formData.bank_details.upi_id}
                      onChange={(e) => handleInputChange('bank_details.upi_id', e.target.value)}
                      placeholder="Enter UPI ID"
                    />
                  </div>
                </CardContent>
              </Card>
              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/branch-manager-dashboard/branches")}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-yellow-400 hover:bg-yellow-500 text-white px-6 py-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating Branch...
                    </>
                  ) : (
                    'Update Branch'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Branch Updated!</h3>
                <p className="text-gray-600 mb-4">The branch has been successfully updated.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}