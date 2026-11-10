"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2, User, MapPin, Building, Phone } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import {
  DashboardFormPageHeader,
  DashboardSectionHeading,
  cardContentClass,
  dashboardFormCardClass,
  primaryButtonClass,
} from "@/components/dashboard/dashboardFormStyles"

export default function EditBranchManagerPage() {
  const router = useRouter()
  const params = useParams()
  const basePath = useDashboardBasePath()
  const managerId = params.id as string
  const { toast } = useToast()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "", // Optional password field for updates
    gender: "",
    dateOfBirth: "",

    // Address Information
    address: "",
    area: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",

    // Professional Information
    designation: "Branch Manager",
    experience: "",
    qualifications: "",
    certifications: "",

    // Branch Assignment
    branchId: "",

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",

    // Additional Information
    notes: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [branches, setBranches] = useState<any[]>([])
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)

  useEffect(() => {
    loadManagerData()
    loadBranches()
  }, [managerId])

  const loadManagerData = async () => {
    try {
      setIsLoading(true)
      
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${managerId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Branch manager not found")
        }
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to fetch branch manager (${response.status})`)
      }

      const manager = await response.json()
      
      // Populate form with existing data
      setFormData({
        firstName: manager.personal_info.first_name || "",
        lastName: manager.personal_info.last_name || "",
        email: manager.contact_info.email || "",
        phone: manager.contact_info.phone || "",
        password: "", // Always empty for security
        gender: manager.personal_info.gender || "",
        dateOfBirth: manager.personal_info.date_of_birth || "",
        address: manager.contact_info.address?.street || "",
        area: manager.contact_info.address?.area || "",
        city: manager.contact_info.address?.city || "",
        state: manager.contact_info.address?.state || "",
        zipCode: manager.contact_info.address?.postal_code || "",
        country: manager.contact_info.address?.country || "India",
        designation: manager.professional_info.designation || "Branch Manager",
        experience: manager.professional_info.professional_experience || "",
        qualifications: manager.professional_info.education_qualification || "",
        certifications: manager.professional_info.certifications?.join(', ') || "",
        branchId: manager.branch_assignment?.branch_id || "",
        emergencyContactName: manager.emergency_contact?.name || "",
        emergencyContactPhone: manager.emergency_contact?.phone || "",
        emergencyContactRelation: manager.emergency_contact?.relationship || "",
        notes: manager.notes || "",
      })
    } catch (error) {
      console.error('Error loading branch manager data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to load branch manager data',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      setIsLoadingBranches(true)
      
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl('branches'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch branches (${response.status})`)
      }

      const data = await response.json()
      setBranches(data.branches || data || [])
    } catch (error) {
      console.error('Error loading branches:', error)
      toast({
        title: "Error",
        description: "Failed to load branches",
        variant: "destructive",
      })
    } finally {
      setIsLoadingBranches(false)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Personal Information validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    }

    if (!formData.branchId) {
      newErrors.branchId = "Branch assignment is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const payload: any = {
        personal_info: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth
        },
        contact_info: {
          email: formData.email,
          phone: formData.phone,
          address: {
            street: formData.address,
            area: formData.area,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zipCode,
            country: formData.country
          }
        },
        professional_info: {
          designation: formData.designation,
          education_qualification: formData.qualifications,
          professional_experience: formData.experience,
          certifications: formData.certifications ? formData.certifications.split(',').map(cert => cert.trim()) : []
        },
        branch_id: formData.branchId,
        emergency_contact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: formData.emergencyContactRelation
        },
        notes: formData.notes
      }

      // Only include password if it's provided
      if (formData.password.trim()) {
        payload.password = formData.password
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${managerId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to update branch manager (${response.status})`)
      }

      const result = await response.json()
      console.log("Branch manager updated successfully:", result)

      setShowSuccessPopup(true)
      
      toast({
        title: "Success",
        description: "Branch manager updated successfully",
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`${basePath}/branch-managers/${managerId}`)
      }, 1500)

    } catch (error) {
      console.error('Error updating branch manager:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update branch manager',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendCredentials = async () => {
    try {
      setIsSendingEmail(true)
      
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${managerId}/send-credentials`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to send credentials (${response.status})`)
      }

      toast({
        title: "Success",
        description: "Credentials sent successfully to branch manager's email",
      })
    } catch (error) {
      console.error('Error sending credentials:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send credentials',
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA]">
        <main className="w-full p-4 lg:px-8">
          <div className="w-full max-w-none">
            <div className="animate-pulse space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="bg-white rounded-lg p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      
      <main className="w-full py-6 px-4 lg:px-8 xl:px-10">
        <DashboardFormPageHeader
          title="Edit Branch Manager"
          subtitle="Update manager profile and branch assignment"
          backLabel="Back to Manager Details"
          onBack={() => router.push(`${basePath}/branch-managers/${managerId}`)}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={User} title="Personal Information" tone="violet" />
            </CardHeader>
            <CardContent className={cardContentClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className={errors.firstName ? "border-red-500" : ""}
                      placeholder="Enter first name"
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className={errors.lastName ? "border-red-500" : ""}
                      placeholder="Enter last name"
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-600">{errors.lastName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={errors.email ? "border-red-500" : ""}
                      placeholder="Enter email address"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={errors.phone ? "border-red-500" : ""}
                      placeholder="Enter phone number"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <PasswordInput
                      id="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                    <p className="text-xs text-gray-500">Leave blank to keep current password</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Address Information */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={MapPin} title="Address Information" tone="blue" />
            </CardHeader>
            <CardContent className={cardContentClass}>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Enter address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="area">Area</Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => handleInputChange('area', e.target.value)}
                      placeholder="Enter area"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Enter state"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="Enter zip code"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Professional Information */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={Building} title="Professional Information" tone="amber" />
            </CardHeader>
            <CardContent className={cardContentClass}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience (Years)</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      value={formData.experience}
                      onChange={(e) => handleInputChange('experience', e.target.value)}
                      placeholder="Enter years of experience"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchId">Branch Assignment *</Label>
                    <Select 
                      value={formData.branchId} 
                      onValueChange={(value) => handleInputChange('branchId', value)}
                      disabled={isLoadingBranches}
                    >
                      <SelectTrigger className={errors.branchId ? "border-red-500" : ""}>
                        <SelectValue placeholder={isLoadingBranches ? "Loading branches..." : "Select branch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name ?? branch.name ?? 'Unnamed Branch'} - {branch.branch?.address?.city ?? branch.location ?? branch.address?.city ?? 'Location not specified'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.branchId && (
                      <p className="text-xs text-red-600">{errors.branchId}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => handleInputChange('qualifications', e.target.value)}
                    placeholder="Enter qualifications"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Textarea
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    placeholder="Enter certifications (comma separated)"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

          {/* Emergency Contact */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={Phone} title="Emergency Contact" tone="rose" />
            </CardHeader>
            <CardContent className={cardContentClass}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      placeholder="Enter contact name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      placeholder="Enter contact phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactRelation">Relationship</Label>
                    <Input
                      id="emergencyContactRelation"
                      value={formData.emergencyContactRelation}
                      onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                      placeholder="Enter relationship"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Additional Information */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={MapPin} title="Additional Information" tone="emerald" />
            </CardHeader>
            <CardContent className={cardContentClass}>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Enter any additional notes"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

          {/* Submit Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCredentials}
              disabled={isSendingEmail}
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Credentials via Email'
              )}
            </Button>

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`${basePath}/branch-managers/${managerId}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonClass}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Branch Manager'
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Branch Manager Updated Successfully!</h3>
                <p className="text-gray-600 mb-4">The branch manager information has been updated successfully.</p>
                <Button
                  onClick={() => router.push(`${basePath}/branch-managers/${managerId}`)}
                  className={primaryButtonClass}
                >
                  View Manager Details
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
