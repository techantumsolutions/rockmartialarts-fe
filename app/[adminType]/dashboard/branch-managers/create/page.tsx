"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, User, MapPin, Phone, Building, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { dropdownAPI } from "@/lib/dropdownAPI"

// Interface definitions for API data
interface Branch {
  id: string
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
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function CreateBranchManagerPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [createdManagerId, setCreatedManagerId] = useState<string | null>(null)

  // API data state
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    gender: "",
    dateOfBirth: "",
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
    branch: "",

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",

    // Additional Information
    notes: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Available options
  // Dropdown options state
  const [designations, setDesignations] = useState<any[]>([
    { value: "Branch Manager", label: "Branch Manager" },
    { value: "Assistant Branch Manager", label: "Assistant Branch Manager" },
    { value: "Senior Branch Manager", label: "Senior Branch Manager" },
    { value: "Regional Manager", label: "Regional Manager" },
    { value: "Operations Manager", label: "Operations Manager" }
  ])
  const [genders, setGenders] = useState<any[]>([{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }])
  const [countries, setCountries] = useState<any[]>([{ value: "India", label: "India" }, { value: "USA", label: "USA" }, { value: "UK", label: "UK" }])
  const [experienceRanges, setExperienceRanges] = useState<any[]>([])
  const [emergencyRelations, setEmergencyRelations] = useState<any[]>([])

  // Branch admin cannot create branch managers — redirect to dashboard
  useEffect(() => {
    if (BranchManagerAuth.isAuthenticated()) {
      router.replace("/dashboard")
    }
  }, [router])

  // Load dropdown data from master data
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const token = TokenManager.getToken()
        
        // Fetch designations
        const designationsRes = await dropdownAPI.getCategoryOptions("designations", token || undefined)
        if (designationsRes?.length > 0) {
          const activeDesignations = designationsRes
            .filter((opt: any) => opt.is_active)
            
          setDesignations(activeDesignations)
        }

        // Fetch genders
        const gendersRes = await dropdownAPI.getCategoryOptions("genders", token || undefined)
        if (gendersRes?.length > 0) {
          const activeGenders = gendersRes
            .filter((opt: any) => opt.is_active)
            
          setGenders(activeGenders)
        }

        // Fetch countries
        const countriesRes = await dropdownAPI.getCategoryOptions("countries", token || undefined)
        if (countriesRes?.length > 0) {
          const activeCountries = countriesRes
            .filter((opt: any) => opt.is_active)
            
          setCountries(activeCountries)
        }

        // Fetch experience ranges
        const experienceRes = await dropdownAPI.getCategoryOptions("experience_ranges", token || undefined)
        if (experienceRes?.length > 0) {
          const activeExperience = experienceRes
            .filter((opt: any) => opt.is_active)
            
          setExperienceRanges(activeExperience)
        }

        // Fetch emergency relations
        const relationsRes = await dropdownAPI.getCategoryOptions("emergency_relations", token || undefined)
        if (relationsRes?.length > 0) {
          const activeRelations = relationsRes
            .filter((opt: any) => opt.is_active)
            
          setEmergencyRelations(activeRelations)
        }
      } catch (error) {
        console.error("Error loading dropdown options:", error)
        // Continue with default values if API fails
      }
    }

    loadDropdowns()
  }, [])

  // Load data from APIs
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setIsLoadingBranches(true)

        // Get authentication token
        let token = TokenManager.getToken()

        // If no token, try to get one using superadmin credentials for testing
        if (!token) {
          console.log('No token found, attempting to get superadmin token...')
          try {
            const loginResponse = await fetch(getBackendApiUrl('superadmin/login'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: "pittisunilkumar3@gmail.com",
                password: "StrongPassword@123"
              })
            })

            if (loginResponse.ok) {
              const loginData = await loginResponse.json()
              console.log('✅ Got superadmin token for branches')

              // Store the token using TokenManager
              TokenManager.storeAuthData(loginData)
              token = TokenManager.getToken()
            } else {
              console.error('Failed to get superadmin token:', loginResponse.statusText)
              toast({
                title: "Authentication Error",
                description: "Unable to authenticate. Please login manually.",
                variant: "destructive",
              })
              setIsLoadingBranches(false)
              return
            }
          } catch (error) {
            console.error('Error getting superadmin token:', error)
            toast({
              title: "Authentication Error",
              description: "Please login to access branch data.",
              variant: "destructive",
            })
            setIsLoadingBranches(false)
            return
          }
        }

        // Call real backend API
        const response = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Real backend branches data:', data)

          // Set branches data
          setBranches(data.branches || [])
        } else {
          console.error('Failed to load branches:', response.status, response.statusText)
          if (response.status === 401) {
            toast({
              title: "Authentication Error",
              description: "Please login again to access branch data.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Error",
              description: "Failed to load branches. Please try again.",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error('Error loading branches:', error)
        toast({
          title: "Error",
          description: "Failed to load branches. Please check your connection.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingBranches(false)
      }
    }

    loadBranches()
  }, [toast])

  const sendCredentialsEmail = async () => {
    if (!createdManagerId) {
      toast({
        title: "Error",
        description: "No branch manager ID available for sending credentials",
        variant: "destructive",
      })
      return
    }

    setIsSendingEmail(true)
    try {
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${createdManagerId}/send-credentials`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || 'Failed to send credentials email')
      }

      toast({
        title: "Success",
        description: "Login credentials have been sent to the branch manager's email address",
      })
    } catch (error) {
      console.error("Error sending credentials email:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send credentials email",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9"
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.designation) newErrors.designation = "Designation is required"

    setErrors(newErrors)
    return newErrors
  }

  const scrollToFirstError = (newErrors: { [key: string]: string }) => {
    const fieldOrder = [
      "firstName",
      "lastName",
      "email",
      "password",
      "phone",
      "gender",
      "designation",
    ]
    const firstKey = fieldOrder.find((key) => newErrors[key]) || Object.keys(newErrors)[0]
    if (!firstKey) return

    // Wait for error styles to paint, then scroll and stop on the first invalid field
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const el = document.getElementById(firstKey)
        if (!el) return
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        if (typeof (el as HTMLElement).focus === "function") {
          try {
            ;(el as HTMLElement).focus({ preventScroll: true })
          } catch {
            ;(el as HTMLElement).focus()
          }
        }
      }, 50)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      const firstKey =
        ["firstName", "lastName", "email", "password", "phone", "gender", "designation"].find(
          (key) => newErrors[key]
        ) || Object.keys(newErrors)[0]
      toast({
        title: "Validation Error",
        description: newErrors[firstKey] || "Please fill in all required fields.",
        variant: "destructive",
      })
      scrollToFirstError(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare branch manager data according to backend API specification
      const managerData = {
        personal_info: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth
        },
        contact_info: {
          email: formData.email,
          country_code: "+91", // Default for India
          phone: formData.phone,
          password: formData.password
        },
        address_info: {
          address: formData.address,
          area: formData.area || formData.city, // Use area if provided, otherwise city
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country
        },
        professional_info: {
          education_qualification: formData.qualifications,
          professional_experience: formData.experience,
          designation: formData.designation,
          certifications: formData.certifications ? formData.certifications.split(',').map(cert => cert.trim()) : []
        },
        branch_id: formData.branch || null,  // Include branch assignment
        emergency_contact: {
          name: formData.emergencyContactName || null,
          phone: formData.emergencyContactPhone || null,
          relationship: formData.emergencyContactRelation || null
        },
        notes: formData.notes
      }

      console.log("Creating branch manager with data:", managerData)

      // Log branch assignment for debugging
      if (formData.branch) {
        console.log("Branch assignment:", {
          selectedBranch: formData.branch
        })
      }

      // Get authentication token
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Call the backend API
      const response = await fetch(getBackendApiUrl('branch-managers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(managerData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || result.message || `Failed to create branch manager (${response.status})`)
      }

      console.log("Branch manager created successfully:", result)

      // Store the created manager ID for sending credentials
      if (result.branch_manager && result.branch_manager.id) {
        setCreatedManagerId(result.branch_manager.id)
      } else if (result.id) {
        setCreatedManagerId(result.id)
      }

      setShowSuccessPopup(true)

      // Reset form after successful submission (removed auto-redirect to allow email sending)
      // User can manually navigate using the buttons in the success popup

    } catch (error) {
      console.error("Error creating branch manager:", error)
      // You might want to show an error message to the user here
      alert(`Error creating branch manager: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full py-4 px-4 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`${basePath}/branch-managers`)}
              className="flex items-center space-x-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[#4F5077]">Back to Branch Managers</span>
            </Button>
            <div className="w-px h-6 bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Add New Branch Manager</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 ">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">

                <span className="text-[#4F5077]">Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter secure password"
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10)
                      setFormData({ ...formData, phone: digitsOnly })
                    }}
                    placeholder="10-digit mobile number"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger id="gender" className={errors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((gender) => (
                        <SelectItem key={gender.value || gender} value={gender.value || gender.toLowerCase()}>
                          {gender.label || (gender.charAt(0).toUpperCase() + gender.slice(1))}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.value || country} value={country.value || country}>
                          {country.label || country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter complete address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area/Locality</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Enter area or locality"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="ZIP Code"
                  />
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">

                <span className="text-[#4F5077]">Professional Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation *</Label>
                  <Select
                    value={formData.designation}
                    onValueChange={(value) => setFormData({ ...formData, designation: value })}
                  >
                    <SelectTrigger id="designation" className={errors.designation ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((designation) => (
                        <SelectItem key={designation.value || designation} value={designation.value || designation}>
                          {designation.label || designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.designation && <p className="text-red-500 text-sm">{errors.designation}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => setFormData({ ...formData, experience: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceRanges.length > 0 ? (
                        experienceRanges.map((exp) => (
                          <SelectItem key={exp.value || exp} value={exp.value || exp}>
                            {exp.label || exp}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="0-1 years">0-1 years</SelectItem>
                          <SelectItem value="1-3 years">1-3 years</SelectItem>
                          <SelectItem value="3-5 years">3-5 years</SelectItem>
                          <SelectItem value="5-10 years">5-10 years</SelectItem>
                          <SelectItem value="10+ years">10+ years</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    placeholder="Educational qualifications"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Textarea
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    placeholder="Professional certifications"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-[#4F5077]">Assignment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">Assign to Branch</Label>
                  {isLoadingBranches ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading branches...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => setFormData({ ...formData, branch: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            <p>No branches available</p>
                          </div>
                        ) : (
                          branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.branch.name} ({branch.branch.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-[#4F5077]">Emergency Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelation">Relation</Label>
                  <Select
                    value={formData.emergencyContactRelation}
                    onValueChange={(value) => setFormData({ ...formData, emergencyContactRelation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      {emergencyRelations.length > 0 ? (
                        emergencyRelations.map((relation) => (
                          <SelectItem key={relation.value || relation} value={relation.value || relation.toLowerCase()}>
                            {relation.label || relation}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information or special notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 py-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${basePath}/branch-managers`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Branch Manager...</span>
                </div>
              ) : (
                "Create Branch Manager"
              )}
            </Button>
          </div>
        </form>

      </main>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Branch Manager Created Successfully!</h3>
            <p className="text-gray-600 mb-6">The new branch manager has been added to your academy.</p>

            <div className="space-y-3">
              <Button
                onClick={sendCredentialsEmail}
                disabled={isSendingEmail || !createdManagerId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending Email...
                  </>
                ) : (
                  "Send Credentials via Email"
                )}
              </Button>

              <Button
                onClick={() => {
                  setShowSuccessPopup(false)
                  router.push(`${basePath}/branch-managers`)
                }}
                variant="outline"
                className="w-full"
              >
                Continue to Branch Managers List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
