"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, Plus, X, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import DashboardHeader from "@/components/dashboard-header"
import { TokenManager } from "@/lib/tokenManager"

export default function CreateCoursePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State
  const [categories, setCategories] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [newPrerequisite, setNewPrerequisite] = useState("")
  const [subCategories, setSubCategories] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [branchPrices, setBranchPrices] = useState<any[]>([])
  const [formData, setFormData] = useState({
    courseTitle: "",
    courseCode: "",
    description: "",
    category: "",
    subCategory: "",
    difficultyLevel: "",
    maxStudents: "",
    minAge: "",
    maxAge: "",
    price: "",
    currency: "INR",
    branchSpecificPricing: false,
    equipmentRequired: "",
    syllabus: "",
    certificationOffered: false,
    isActive: true,
    imageUrl: "",
    videoUrl: "",
    tags: [] as string[]
  })

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8003'


  // Fetch categories on mount
  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const token = TokenManager.getToken()
        const response = await fetch(`${apiBaseUrl}/api/categories?active_only=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }

        const data = await response.json()
        const validCategories = (data.categories || []).filter((category: any) =>
          category && category.id && category.id.trim() !== ''
        )
        
        // Store all categories for subcategory filtering
        setAllCategories(validCategories)
        
        // Store only parent categories for the dropdown
        const parentCategories = validCategories.filter((cat: any) => !cat.parent_category_id)
        const uniqueParents = Array.from(new Map(parentCategories.map((cat: any) => [cat.id, cat])).values())
        setCategories(uniqueParents)
      } catch (error) {
        console.error('Error fetching categories:', error)
        const defaults = [
          { id: 'default-category-1', name: 'General Martial Arts', course_count: 0 },
          { id: 'default-category-2', name: 'Self Defense', course_count: 0 },
          { id: 'default-category-3', name: 'Fitness & Training', course_count: 0 }
        ]
        setCategories(defaults)
        setAllCategories(defaults)
        toast({
          title: "Warning",
          description: "Failed to load categories. Using default options.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [apiBaseUrl, toast])
  // Fetch subcategories when category changes
  useEffect(() => {
    if (!formData.category) {
      setSubCategories([])
      return
    }

    // Filter from allCategories instead of making another API call
    const subs = allCategories.filter((cat: any) => 
      cat.parent_category_id === formData.category
    )
    setSubCategories(subs)
  }, [formData.category, allCategories])


  // Auto-generate course code from title
  useEffect(() => {
    if (formData.courseTitle) {
      const generatedCode = formData.courseTitle
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
      setFormData(prev => ({ ...prev, courseCode: generatedCode }))
    }
  }, [formData.courseTitle])

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true)
      try {
        const token = TokenManager.getToken()
        const res = await fetch(`${apiBaseUrl}/api/branches?active_only=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (res.ok) {
          const data = await res.json()
          setBranches(data.branches || data || [])
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err)
      } finally {
        setLoadingBranches(false)
      }
    }

    fetchBranches()
  }, [apiBaseUrl])

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && !prerequisites.includes(newPrerequisite.trim())) {
      setPrerequisites([...prerequisites, newPrerequisite.trim()])
      setNewPrerequisite("")
    }
  }

  const removePrerequisite = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.courseTitle || !formData.courseCode || !formData.description) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        })
        return
      }

      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast({
          title: "Validation Error", 
          description: "Please enter a valid price.",
          variant: "destructive"
        })
        return
      }

      const apiData = {
        title: formData.courseTitle,
        code: formData.courseCode,
        description: formData.description,
        difficulty_level: formData.difficultyLevel,
        category_id: formData.subCategory || formData.category,
        student_requirements: {
          max_students: parseInt(formData.maxStudents) || 20,
          min_age: parseInt(formData.minAge) || 6,
          max_age: parseInt(formData.maxAge) || 99,
          prerequisites: prerequisites
        },
        course_content: {
          syllabus: formData.syllabus || "",
          equipment_required: formData.equipmentRequired ? formData.equipmentRequired.split(',').map(item => item.trim()) : []
        },
        media_resources: {
          course_image_url: (formData as any).courseImageUrl || "",
          promo_video_url: (formData as any).promoVideoUrl || ""
        },
        pricing: {
          currency: formData.currency,
          amount: parseFloat(formData.price),
          branch_specific_pricing: formData.branchSpecificPricing,
          branch_prices: branchPrices.map(bp => ({ branch_id: bp.branch_id, amount: parseFloat(bp.price) || 0, currency: bp.currency })),
        },
        settings: {
          offers_certification: (formData as any).offersCertification || true,
          active: true
        },
        curriculum: {
          modules: modules.map(m => ({
            title: m.title,
            description: m.description,
            duration: parseFloat(m.duration) || 0,
            status: m.status,
            resource_url: m.resourceUrl,
            resource_type: m.resourceType
          }))
        }
      }

      const token = TokenManager.getToken()

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "No authentication token available. Please login again.",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(`${apiBaseUrl}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || result.message || `Failed to create course (${response.status})`)
      }

      toast({
        title: "Success!",
        description: `Course created successfully with ID: ${result.course_id || 'Generated'}`,
      })

      setShowSuccessPopup(true)

    } catch (error) {
      console.error('Error creating course:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create course. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // File upload handler for module resources
  const handleModuleResourceUpload = async (index: number, file: File) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = TokenManager.getToken()
      const response = await fetch(`${apiBaseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      const uploadedUrl = data.file_url || data.url

      // Update module with uploaded URL
      const newModules = [...modules]
      newModules[index].resourceUrl = uploadedUrl
      
      // Auto-detect resource type from file
      if (file.type.startsWith('image/')) {
        newModules[index].resourceType = 'image'
      } else if (file.type === 'application/pdf') {
        newModules[index].resourceType = 'pdf'
      } else if (file.type.startsWith('video/')) {
        newModules[index].resourceType = 'video'
      }
      
      setModules(newModules)

      toast({
        title: "Success",
        description: "File uploaded successfully",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push("/dashboard/courses")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Create Course" />

      <main className="w-full mt-[100px] py-4 lg:py-6 px-19">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#4F5077]">Create New Course</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/courses")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[#4F5077]">Back to Courses</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span className="text-[#4F5077]">Course Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-[#7D8592]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="courseTitle">Course Title *</Label>
                        <Input
                          id="courseTitle"
                          value={formData.courseTitle}
                          onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                          placeholder="e.g., Advanced Kung Fu Training"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="courseCode">Course Code *</Label>
                        <Input
                          id="courseCode"
                          value={formData.courseCode}
                          readOnly
                          className="bg-gray-100"
                          placeholder="Auto-generated from title"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Course Description *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Provide a detailed description of the course, what students will learn, and benefits..."
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => {
                            setFormData({ ...formData, category: value, subCategory: "" })
                            setSubCategories([])
                          }}
                        >
                          <SelectTrigger className="h-10 px-3 w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subCategory">Sub Category</Label>
                        <Select
                          value={formData.subCategory}
                          onValueChange={(value) => setFormData({ ...formData, subCategory: value })}
                          disabled={!formData.category || subCategories.length === 0}
                        >
                          <SelectTrigger className="h-10 px-3 w-full">
                            <SelectValue placeholder={subCategories.length === 0 ? "No subcategories" : "Select subcategory"} />
                          </SelectTrigger>
                          <SelectContent>
                            {subCategories.map((subCat) => (
                              <SelectItem key={subCat.id} value={subCat.id}>{subCat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="difficultyLevel">Difficulty Level *</Label>
                        <Select
                          value={formData.difficultyLevel}
                          onValueChange={(value) => setFormData({ ...formData, difficultyLevel: value })}
                        >
                          <SelectTrigger className="h-10 px-3 w-full">
                            <SelectValue placeholder="Select difficulty level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                            <SelectItem value="Expert">Expert</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </div>

                  <div className="space-y-4 text-[#7d8592]">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span className="text-[#4F5077]">Student Requirements</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#7D8592]">
                      <div className="space-y-2">
                        <Label htmlFor="maxStudents">Maximum Students</Label>
                        <Input
                          id="maxStudents"
                          type="number"
                          value={formData.maxStudents}
                          onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                          placeholder="20"
                          min="1"
                          max="100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minAge">Minimum Age</Label>
                        <Input
                          id="minAge"
                          type="number"
                          value={formData.minAge}
                          onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                          placeholder="6"
                          min="3"
                          max="100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxAge">Maximum Age</Label>
                        <Input
                          id="maxAge"
                          type="number"
                          value={formData.maxAge}
                          onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                          placeholder="65"
                          min="3"
                          max="100"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#4F5077]">Prerequisites</Label>
                      <div className="flex space-x-2 text-[#7D8592]">
                        <Input
                          value={newPrerequisite}
                          onChange={(e) => setNewPrerequisite(e.target.value)}
                          placeholder="Add a prerequisite (e.g., Basic fitness level)"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
                        />
                        <Button type="button" onClick={addPrerequisite} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-[#7d8592]">
                        {prerequisites.map((prereq, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                            <span>{prereq}</span>
                            <button
                              type="button"
                              onClick={() => removePrerequisite(index)}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#4F5077]">Course Content</h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2 text-[#7d8592]">
                        <Label htmlFor="syllabus">Course Syllabus</Label>
                        <Textarea
                          id="syllabus"
                          value={formData.syllabus}
                          onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                          placeholder="Outline the course curriculum, modules, techniques to be taught..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="equipmentRequired">Equipment Required</Label>
                        <Textarea
                          id="equipmentRequired"
                          value={formData.equipmentRequired}
                          onChange={(e) => setFormData({ ...formData, equipmentRequired: e.target.value })}
                          placeholder="List any equipment students need to bring or purchase..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#4F5077]">Media & Resources</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl">Course Image URL</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="imageUrl"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            placeholder="https://example.com/course-image.jpg"
                          />
                          <Button type="button" variant="outline" size="sm">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="videoUrl">Promotional Video URL</Label>
                        <Input
                          id="videoUrl"
                          value={formData.videoUrl}
                          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Course Curriculum Section */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[#4F5077]">Course Curriculum</h3>
                    
                    {modules.map((module, index) => (
                      <Card key={index} className="border-2 border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-md text-[#4F5077]">Module {index + 1}</CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newModules = modules.filter((_, i) => i !== index)
                                setModules(newModules)
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`module-title-${index}`}>Module Title</Label>
                            <Input
                              id={`module-title-${index}`}
                              value={module.title || ""}
                              onChange={(e) => {
                                const newModules = [...modules]
                                newModules[index].title = e.target.value
                                setModules(newModules)
                              }}
                              placeholder="Enter module title"
                              className="h-10 px-3"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`module-description-${index}`}>Module Description</Label>
                            <Textarea
                              id={`module-description-${index}`}
                              value={module.description || ""}
                              onChange={(e) => {
                                const newModules = [...modules]
                                newModules[index].description = e.target.value
                                setModules(newModules)
                              }}
                              placeholder="Describe what students will learn in this module"
                              className="min-h-[80px] resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`module-duration-${index}`}>Duration (hours)</Label>
                              <Input
                                id={`module-duration-${index}`}
                                type="number"
                                value={module.duration || ""}
                                onChange={(e) => {
                                  const newModules = [...modules]
                                  newModules[index].duration = e.target.value
                                  setModules(newModules)
                                }}
                                placeholder="e.g., 2"
                                className="h-10 px-3"
                                min="0"
                                step="0.5"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`module-status-${index}`}>Status</Label>
                              <Select
                                value={module.status || "in_progress"}
                                onValueChange={(value) => {
                                  const newModules = [...modules]
                                  newModules[index].status = value
                                  setModules(newModules)
                                }}
                              >
                                <SelectTrigger className="h-10 px-3">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`module-resource-${index}`}>Resource Upload</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`module-resource-${index}`}
                                value={module.resourceUrl || ""}
                                onChange={(e) => {
                                  const newModules = [...modules]
                                  newModules[index].resourceUrl = e.target.value
                                  setModules(newModules)
                                }}
                                placeholder="Resource URL (image, PDF, or video)"
                                className="h-10 px-3 flex-1"
                              />
                              <input
                                type="file"
                                id={`module-file-${index}`}
                                accept="image/*,application/pdf,video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleModuleResourceUpload(index, file)
                                  }
                                }}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 px-4"
                                onClick={() => {
                                  document.getElementById(`module-file-${index}`)?.click()
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              Supported formats: Images (JPG, PNG), PDF, Video (MP4, WebM)
                            </p>
                          </div>

                          {module.resourceUrl && (
                            <div className="space-y-1">
                              <Label className="text-xs text-gray-600">Resource Type</Label>
                              <Select
                                value={module.resourceType || "image"}
                                onValueChange={(value) => {
                                  const newModules = [...modules]
                                  newModules[index].resourceType = value
                                  setModules(newModules)
                                }}
                              >
                                <SelectTrigger className="h-9 px-3">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="image">Image</SelectItem>
                                  <SelectItem value="pdf">PDF</SelectItem>
                                  <SelectItem value="video">Video</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModules([
                          ...modules,
                          {
                            title: "",
                            description: "",
                            duration: "",
                            status: "in_progress",
                            resourceUrl: "",
                            resourceType: "image"
                          }
                        ])
                      }}
                      className="w-full border-dashed border-2 h-12"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Module
                    </Button>
                  </div>

                  <div className="pt-6 border-t">
                    <div className="flex space-x-4">
                      <Button 
                        type="submit" 
                        className=" px-8"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating Course...
                          </>
                        ) : (
                          'Create Course'
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => router.push("/dashboard/courses")}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4F5077]">Pricing & Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-[#7D8592]">
                <div className="space-y-2">
                  <Label htmlFor="price">Course Price *</Label>
                  <div className="flex space-x-2">
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="8500"
                      className="flex-1"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="branchSpecificPricing">Academy-specific pricing</Label>
                  <Switch
                    id="branchSpecificPricing"
                    checked={formData.branchSpecificPricing}
                    onCheckedChange={(checked) => setFormData({ ...formData, branchSpecificPricing: checked })}
                  />
                </div>

                {/* Branch-Specific Pricing Section */}
                {formData.branchSpecificPricing && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-md font-semibold">Branch-Specific Prices</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBranchPrices([...branchPrices, { branch_id: '', price: '', currency: 'INR' }])
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Branch Price
                      </Button>
                    </div>

                    {branchPrices.map((branchPrice, index) => (
                      <Card key={index} className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Branch Price #{index + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newPrices = branchPrices.filter((_, i) => i !== index)
                              setBranchPrices(newPrices)
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <Label>Academy</Label>
                            <Select
                              value={branchPrice.branch_id}
                              onValueChange={(value) => {
                                const newPrices = [...branchPrices]
                                newPrices[index].branch_id = value
                                setBranchPrices(newPrices)
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select branch" />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingAcademies ? (
                                  <SelectItem value="loading" disabled>
                                    Loading academies...
                                  </SelectItem>
                                ) : branches.length > 0 ? (
                                  branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                      {branch.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="none" disabled>
                                    No academies available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Price</Label>
                            <Input
                              type="number"
                              value={branchPrice.price}
                              onChange={(e) => {
                                const newPrices = [...branchPrices]
                                newPrices[index].price = e.target.value
                                setBranchPrices(newPrices)
                              }}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </Card>
                    ))}

                    {branchPrices.length === 0 && (
                      <div className="text-center py-6 text-gray-500 border-2 border-dashed rounded-lg">
                        <p className="text-sm">No branch-specific prices added yet.</p>
                        <p className="text-xs">Click "Add Branch Price" to set prices for specific branches.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="certificationOffered">Offers Certification</Label>
                  <Switch
                    id="certificationOffered"
                    checked={formData.certificationOffered}
                    onCheckedChange={(checked) => setFormData({ ...formData, certificationOffered: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">Course Active</Label>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#4F5077]">Course Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-[#7D8592]">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Max Students:</span>
                    <span className="font-medium">{formData.maxStudents || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Age Range:</span>
                    <span className="font-medium">
                      {formData.minAge || '—'} - {formData.maxAge || '—'} years
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">
                      {formData.currency} {formData.price || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prerequisites:</span>
                    <span className="font-medium">{prerequisites.length} items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Created Successfully!</h3>
              <p className="text-gray-600 mb-6">Your course has been created and added to the system.</p>
              <div className="flex space-x-3">
                <Button onClick={handleSuccessOk} className="flex-1 ">
                  OK
                </Button>
                <Button onClick={handleSuccessOk} variant="outline" className="flex-1 bg-transparent">
                  Back to List
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
