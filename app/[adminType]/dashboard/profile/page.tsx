"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Phone, Calendar, Shield, Edit, Save, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { SuperAdminAuth } from "@/lib/auth"
import { fetchAssignedBranches } from "@/lib/activeBranch"

interface BranchManagerProfile {
  id: string
  full_name: string
  email: string
  phone?: string
  branch_name?: string
  branch_names?: string[]
  branch_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface FormErrors {
  [key: string]: string
}

export default function BranchManagerProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<BranchManagerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    // Allow both branch admin and super admin
    const isBranchManager = BranchManagerAuth.isAuthenticated()
    const isSuperAdmin = SuperAdminAuth.isAuthenticated()
    if (!isBranchManager && !isSuperAdmin) {
      router.push("/superadmin/login")
      return
    }

    // Load profile data
    const loadProfile = async () => {
      try {
        setLoading(true)

        const token = isBranchManager ? BranchManagerAuth.getToken() : SuperAdminAuth.getToken()
        if (!token) {
          router.push(isBranchManager ? "/branch-manager/login" : "/superadmin/login")
          return
        }

        const response = await fetch(isBranchManager ? getBackendApiUrl('branch-managers/me') : getBackendApiUrl('superadmin/me'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          const data = result.branch_manager || result.data || result
          if (data) {
            let branchNames: string[] = []
            if (isBranchManager) {
              try {
                const assigned = await fetchAssignedBranches(token)
                branchNames = assigned.map((branch) => branch.name).filter(Boolean)
              } catch {
                branchNames = []
              }
            }
            const profileData: BranchManagerProfile = {
              id: data.id,
              full_name: data.full_name || "User",
              email: data.email || "",
              phone: data.phone || "",
              branch_names: branchNames,
              branch_name: branchNames.join(", "),
              branch_id: branchNames.length ? "" : data.branch_id || "",
              is_active: data.is_active !== undefined ? data.is_active : true,
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString()
            }

            setProfile(profileData)
            setFormData({
              full_name: profileData.full_name,
              email: profileData.email,
              phone: profileData.phone || "",
            })
          }
        } else if (response.status === 401) {
          router.push(isBranchManager ? "/branch-manager/login" : "/superadmin/login")
        } else {
          throw new Error("Failed to load profile")
        }

      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router, toast])

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = "Please enter a valid phone number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        router.push("/superadmin/login")
        return
      }

      const response = await fetch(getBackendApiUrl('superadmin/me'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Handle both possible response structures from backend
        const updatedData = result.data || result.branch_manager
        if (updatedData) {
          const profileData: BranchManagerProfile = {
            id: updatedData.id,
            full_name: updatedData.full_name || "Branch Manager",
            email: updatedData.email || "",
            phone: updatedData.phone || "",
            branch_names: profile?.branch_names || [],
            branch_name: profile?.branch_name || "",
            branch_id: profile?.branch_id || "",
            is_active: updatedData.is_active !== undefined ? updatedData.is_active : true,
            created_at: updatedData.created_at || new Date().toISOString(),
            updated_at: updatedData.updated_at || new Date().toISOString()
          }

          setProfile(profileData)
          setIsEditing(false)

          toast({
            title: "Success",
            description: result.message || "Profile updated successfully",
            variant: "default"
          })
        }
      } else if (response.status === 401) {
        router.push("/superadmin/login")
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.detail || "Failed to update profile",
          variant: "destructive"
        })
      }

    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone || "",
      })
    }
    setErrors({})
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 overflow-x-hidden p-4 lg:px-8 lg:py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 max-w-xs" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
            <div className="bg-white rounded-lg p-6 space-y-4 min-w-0 overflow-hidden">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
            <div className="lg:col-span-2 bg-white rounded-lg p-6 space-y-4 min-w-0 overflow-hidden">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="w-full min-w-0 overflow-x-hidden p-4 lg:px-8 lg:py-6">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load profile data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden p-4 lg:px-8 lg:py-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start mb-6 lg:items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium text-gray-600">Profile Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account information and preferences</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        {/* Profile Overview */}
        <div className="lg:col-span-1 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Profile Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 min-w-0 overflow-hidden">
              <div className="flex flex-col items-center text-center min-w-0">
                <Avatar className="w-20 h-20 mb-4 shrink-0">
                  <AvatarImage src="" alt={profile.full_name} />
                  <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                    {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-gray-900 break-words w-full">{profile.full_name}</h3>
                <p className="text-sm text-gray-500 break-all w-full">{profile.email}</p>
                    <Badge variant={profile.is_active ? "default" : "secondary"} className="mt-2">
                      {profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-3 min-w-0">
                    <div className="flex items-start space-x-3 min-w-0">
                      <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">Role</p>
                        <p className="text-xs text-gray-500 break-words">Branch Manager</p>
                      </div>
                    </div>

                    {(profile.branch_names?.length || profile.branch_name) ? (
                      <div className="flex items-start space-x-3 min-w-0">
                        <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">Branch</p>
                          <div className="text-xs text-gray-500 break-words">
                            {(profile.branch_names?.length ? profile.branch_names : [profile.branch_name]).map((name, index) => (
                              <p key={`${name}-${index}`} className="break-words">{name}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-start space-x-3 min-w-0">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">Member Since</p>
                        <p className="text-xs text-gray-500 break-words">{formatDate(profile.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details */}
            <div className="lg:col-span-2 min-w-0">
              <Card className="min-w-0 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 min-w-0 overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                        Full Name *
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => handleInputChange('full_name', e.target.value)}
                            className={errors.full_name ? "border-red-500" : ""}
                            placeholder="Enter your full name"
                          />
                          {errors.full_name && (
                            <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start space-x-2 min-w-0">
                          <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="text-gray-900 break-words min-w-0">{profile.full_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email Address *
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className={errors.email ? "border-red-500" : ""}
                            placeholder="Enter your email address"
                          />
                          {errors.email && (
                            <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start space-x-2 min-w-0">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="text-gray-900 break-all min-w-0">{profile.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                        Phone Number
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className={errors.phone ? "border-red-500" : ""}
                            placeholder="Enter your phone number"
                          />
                          {errors.phone && (
                            <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start space-x-2 min-w-0">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="text-gray-900 break-words min-w-0">{profile.phone || "Not provided"}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label className="text-sm font-medium text-gray-700">
                        Branch Assignment
                      </Label>
                      <div className="flex items-start space-x-2 min-w-0">
                        <Shield className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-900 break-words min-w-0">
                          {profile.branch_names?.length
                            ? profile.branch_names.map((name, index) => (
                                <span key={`${name}-${index}`} className="block break-words">{name}</span>
                              ))
                            : profile.branch_name || "Not assigned"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-sm font-medium text-gray-700">Account Created</Label>
                      <div className="flex items-start space-x-2 min-w-0">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-900 break-words min-w-0">{formatDate(profile.created_at)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 min-w-0">
                      <Label className="text-sm font-medium text-gray-700">Last Updated</Label>
                      <div className="flex items-start space-x-2 min-w-0">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-gray-900 break-words min-w-0">{formatDate(profile.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
    </div>
  )
}
