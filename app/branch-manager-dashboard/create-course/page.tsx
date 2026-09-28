"use client"

import React, { useState, useEffect } from "react"
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
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

export default function CreateCoursePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Categories state
  const [categories, setCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [newPrerequisite, setNewPrerequisite] = useState("")
  const [formData, setFormData] = useState({
    courseTitle: "",
    courseCode: "",
    description: "",
    martialArtsStyle: "",
    difficultyLevel: "",
    category: "",
    maxStudents: "",
    minAge: "",
    maxAge: "",
    price: "",
    currency: "INR",
    branchSpecificPricing: false,
    instructor: "",
    equipmentRequired: "",
    syllabus: "",
    certificationOffered: false,
    isActive: true,
    imageUrl: "",
    videoUrl: "",
    videoPosterUrl: "",
    tags: [] as string[]
  })

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && !prerequisites.includes(newPrerequisite.trim())) {
      setPrerequisites([...prerequisites, newPrerequisite.trim()])
      setNewPrerequisite("")
    }
  }

  const removePrerequisite = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index))
  }

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const response = await fetch('/api/backend/categories/public/details?active_only=true')

        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }

        const data = await response.json()
        const validCategories = (data.categories || []).filter((category: any) =>
          category && category.id && category.id.trim() !== ''
        )
        setCategories(validCategories)
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([
          { id: 'default-category-1', name: 'General Martial Arts', course_count: 0 },
          { id: 'default-category-2', name: 'Self Defense', course_count: 0 },
          { id: 'default-category-3', name: 'Fitness & Training', course_count: 0 }
        ])
        toast({
          title: "Error",
          description: "Failed to load categories. Using default options.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Basic validation
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

      // Get branch manager authentication
      const branchManager = BranchManagerAuth.getCurrentUser()
      const token = BranchManagerAuth.getToken()

      if (!token || !branchManager) {
        toast({
          title: "Authentication Error",
          description: "Please login again as branch manager.",
          variant: "destructive"
        })
        router.push('/branch-manager/login')
        return
      }

      // Map form data to backend API format
      const apiData = {
        title: formData.courseTitle,
        code: formData.courseCode,
        description: formData.description,
        martial_art_style_id: formData.martialArtsStyle || "default-style-id",
        difficulty_level: formData.difficultyLevel,
        category_id: formData.category || "default-category-id",
        instructor_id: formData.instructor || branchManager.id,
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
          course_image_url: formData.imageUrl || "",
          promo_video_url: formData.videoUrl || "",
          video_poster_url: formData.videoPosterUrl || ""
        },
        pricing: {
          currency: formData.currency,
          amount: parseFloat(formData.price),
          branch_specific_pricing: formData.branchSpecificPricing
        },
        settings: {
          offers_certification: formData.certificationOffered,
          active: formData.isActive
        }
      }

      console.log('📋 Course data to send:', apiData)

      // Call backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8003'
      const response = await fetch(`${apiUrl}/api/courses`, {
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

      // Show success
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

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push("/branch-manager-dashboard/courses")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Create Course" role="branch_admin" />

      <main className="w-full py-4 lg:py-6 px-19">
        {/* Header with Back Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#4F5077]">Create New Course</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/branch-manager-dashboard/courses")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[#4F5077]">Back to Courses</span>
          </Button>
        </div>

        {/* Create Course Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span className="text-[#4F5077]">Course Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-[#7D8592]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
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
                          onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                          placeholder="e.g., KF-ADV-001"
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
                        placeholder="Provide a detailed description of the course..."
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="martialArtsStyle">Martial Arts Style *</Label>
                        <Select
                          value={formData.martialArtsStyle}
                          onValueChange={(value) => setFormData({ ...formData, martialArtsStyle: value })}
                        >
                          <SelectTrigger className="h-10 px-3 w-full">
                            <SelectValue placeholder="Select martial arts style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="style-kung-fu-uuid">Kung Fu</SelectItem>
                            <SelectItem value="style-karate-uuid">Karate</SelectItem>
                            <SelectItem value="style-taekwondo-uuid">Taekwondo</SelectItem>
                            <SelectItem value="style-boxing-uuid">Boxing</SelectItem>
                            <SelectItem value="style-jiu-jitsu-uuid">Brazilian Jiu-Jitsu</SelectItem>
                            <SelectItem value="style-muay-thai-uuid">Muay Thai</SelectItem>
                            <SelectItem value="style-judo-uuid">Judo</SelectItem>
                            <SelectItem value="style-krav-maga-uuid">Krav Maga</SelectItem>
                            <SelectItem value="style-mixed-martial-arts-uuid">Mixed Martial Arts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                          disabled={isLoadingCategories}
                        >
                          <SelectTrigger className="h-10 px-3 w-full">
                            <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select category"} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxStudents">Max Students</Label>
                        <Input
                          id="maxStudents"
                          type="number"
                          value={formData.maxStudents}
                          onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                          placeholder="20"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="minAge">Minimum Age</Label>
                        <Input
                          id="minAge"
                          type="number"
                          value={formData.minAge}
                          onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                          placeholder="6"
                          min="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxAge">Maximum Age</Label>
                        <Input
                          id="maxAge"
                          type="number"
                          value={formData.maxAge}
                          onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                          placeholder="99"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Student Requirements */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#4F5077]">Student Requirements</h3>

                    <div className="space-y-2">
                      <Label htmlFor="prerequisites">Prerequisites</Label>
                      <div className="flex space-x-2">
                        <Input
                          value={newPrerequisite}
                          onChange={(e) => setNewPrerequisite(e.target.value)}
                          placeholder="Add a prerequisite"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPrerequisite())}
                        />
                        <Button type="button" onClick={addPrerequisite} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {prerequisites.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {prerequisites.map((prereq, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                              <span>{prereq}</span>
                              <button
                                type="button"
                                onClick={() => removePrerequisite(index)}
                                className="ml-1 hover:text-red-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#4F5077]">Course Content</h3>

                    <div className="space-y-2">
                      <Label htmlFor="syllabus">Syllabus</Label>
                      <Textarea
                        id="syllabus"
                        value={formData.syllabus}
                        onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                        placeholder="Describe the course syllabus and learning objectives..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="equipmentRequired">Equipment Required</Label>
                      <Input
                        id="equipmentRequired"
                        value={formData.equipmentRequired}
                        onChange={(e) => setFormData({ ...formData, equipmentRequired: e.target.value })}
                        placeholder="e.g., Gloves, Protective gear, Uniform"
                      />
                    </div>
                  </div>

                  {/* Media & Resources */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#4F5077]">Media & Resources</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl">Course Image URL</Label>
                        <Input
                          id="imageUrl"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          placeholder="https://example.com/course-image.jpg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="videoUrl">Promo Video URL</Label>
                        <Input
                          id="videoUrl"
                          value={formData.videoUrl}
                          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                          placeholder="https://example.com/promo-video.mp4"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="videoPosterUrl">Video Poster / Fallback Image URL</Label>
                        <Input
                          id="videoPosterUrl"
                          value={formData.videoPosterUrl}
                          onChange={(e) => setFormData({ ...formData, videoPosterUrl: e.target.value })}
                          placeholder="Poster image URL"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t">
                    <div className="flex space-x-4">
                      <Button 
                        type="submit" 
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-8"
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
                        onClick={() => router.push("/branch-manager-dashboard/courses")}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
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
                  <Label htmlFor="branchSpecificPricing">Branch Specific Pricing</Label>
                  <Switch
                    id="branchSpecificPricing"
                    checked={formData.branchSpecificPricing}
                    onCheckedChange={(checked) => setFormData({ ...formData, branchSpecificPricing: checked })}
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

            {/* Additional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4F5077]">Course Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-[#7D8592]">
                <div className="space-y-2">
                  <Label htmlFor="instructor">Instructor</Label>
                  <Input
                    id="instructor"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    placeholder="Instructor name or ID"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="certificationOffered">Offers Certification</Label>
                  <Switch
                    id="certificationOffered"
                    checked={formData.certificationOffered}
                    onCheckedChange={(checked) => setFormData({ ...formData, certificationOffered: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[#4F5077]">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#7D8592]">
                <ul className="space-y-2">
                  <li>• Use clear, descriptive course titles</li>
                  <li>• Set appropriate age ranges for safety</li>
                  <li>• Include all necessary equipment in requirements</li>
                  <li>• Add prerequisites to help students prepare</li>
                  <li>• Use high-quality images for better engagement</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Success Popup */}
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
                <Button onClick={handleSuccessOk} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black">
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
