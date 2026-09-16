"use client"

import { getBackendApiUrl } from "@/lib/config"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Plus,
  Edit,
  Power,
  Search,
  Filter,
  Tag,
  Eye,
  EyeOff,
  Save,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"

interface Category {
  id: string
  name: string
  code: string
  description?: string
  parent_category_id?: string
  is_active: boolean
  display_order: number
  icon_url?: string
  color_code?: string
  created_at: string
  updated_at: string
  course_count?: number
  subcategories?: Category[]
}

interface CategoryFormData {
  name: string
  code: string
  description: string
  parent_category_id: string
  is_active: boolean
  display_order: string
  icon_url: string
  color_code: string
}

interface FormErrors {
  [key: string]: string
}

export default function CategoriesManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})

  // Sub-category form state
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false)
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    parent_category_id: "",
    name: "",
    code: "",
    description: "",
    is_active: true,
    display_order: "0",
    icon_url: "",
    color_code: ""
  })
  const [subCategoryErrors, setSubCategoryErrors] = useState<FormErrors>({})
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    code: "",
    description: "",
    parent_category_id: "",
    is_active: true,
    display_order: "0",
    icon_url: "",
    color_code: ""
  })

  useEffect(() => {
    // Check authentication
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }

    // Check if user is superadmin
    const user = TokenManager.getUser()
    if (!user || user.role !== "superadmin") {
      router.push("/superadmin/login")
      return
    }

    fetchCategories()
  }, [])

  // Refetch categories when showActiveOnly changes
  useEffect(() => {
    fetchCategories()
  }, [showActiveOnly])

  const fetchCategories = async () => {
    try {
      const token = TokenManager.getToken()
      
      // If no token, redirect to login
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue",
          variant: "destructive"
        })
        router.push("/superadmin/login")
        return
      }
      const response = await fetch(getBackendApiUrl(`categories?active_only=${showActiveOnly}&limit=200`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.categories) {
          setCategories(result.categories)
        }
      } else if (response.status === 401 || response.status === 403) {
        router.push("/superadmin/login")
      } else {
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Generate unique category code based on first 4 letters of name + 2-digit number
  const generateCategoryCode = (name: string): string => {
    if (!name.trim()) return ""
    
    // Get first 4 letters (or fewer if name is shorter), removing non-alphabetic characters
    const prefix = name
      .replace(/[^a-zA-Z]/g, "") // Remove non-alphabetic characters
      .substring(0, 4)
      .toUpperCase()
      .padEnd(4, "X") // Pad with X if less than 4 letters
    
    // Find existing codes with the same prefix
    const existingCodes = categories
      .map(cat => cat.code)
      .filter(code => code.startsWith(prefix))
    
    // Extract numbers from existing codes and find the next available number
    let maxNumber = 0
    existingCodes.forEach(code => {
      const match = code.match(/(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) {
          maxNumber = num
        }
      }
    })
    
    // Generate next number with 2 digits
    const nextNumber = (maxNumber + 1).toString().padStart(2, "0")
    return `${prefix}${nextNumber}`
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate code when name changes (only for new categories, not editing)
      if (field === "name" && typeof value === "string" && !editingCategory) {
        updated.code = generateCategoryCode(value)
      }
      
      return updated
    })
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required"
    }

    if (!formData.code.trim()) {
      newErrors.code = "Category code is required"
    } else if (!/^[A-Z0-9_]+$/.test(formData.code)) {
      newErrors.code = "Category code must contain only uppercase letters, numbers, and underscores"
    }

    if (formData.display_order && !/^\d+$/.test(formData.display_order)) {
      newErrors.display_order = "Display order must be a number"
    }

    if (formData.color_code && !/^#[0-9A-Fa-f]{6}$/.test(formData.color_code)) {
      newErrors.color_code = "Color code must be a valid hex color (e.g., #FF5722)"
    }

    // Check for duplicate code (excluding current category when editing)
    const existingCategory = categories.find(cat => 
      cat.code.toLowerCase() === formData.code.toLowerCase() && 
      cat.id !== editingCategory?.id
    )
    if (existingCategory) {
      newErrors.code = "Category code already exists"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    
    try {
      const token = TokenManager.getToken()
      
      // If no token, redirect to login
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue",
          variant: "destructive"
        })
        router.push("/superadmin/login")
        return
      }
      const apiPayload = {
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        parent_category_id: (formData.parent_category_id && formData.parent_category_id !== "none") ? formData.parent_category_id : undefined,
        is_active: formData.is_active,
        display_order: parseInt(formData.display_order) || 0,
        icon_url: formData.icon_url || undefined,
        color_code: formData.color_code || undefined
      }

      const url = editingCategory
        ? getBackendApiUrl(`categories/${editingCategory.id}`)
        : getBackendApiUrl('categories')
      
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Category ${editingCategory ? 'updated' : 'created'} successfully`,
          variant: "default"
        })
        
        setIsDialogOpen(false)
        resetForm()
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.detail || `Failed to ${editingCategory ? 'update' : 'create'} category`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error saving category:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || "",
      parent_category_id: category.parent_category_id || "none",
      is_active: category.is_active,
      display_order: category.display_order.toString(),
      icon_url: category.icon_url || "",
      color_code: category.color_code || ""
    })
    setIsDialogOpen(true)
  }


  const handleToggleStatus = async (category: Category) => {
    const newStatus = !category.is_active
    const action = newStatus ? "enable" : "disable"
    
    // Check if this is a parent category being disabled
    const isParentCategory = !category.parent_category_id
    const subcategories = isParentCategory ? categories.filter(cat => cat.parent_category_id === category.id) : []
    
    let confirmMessage = `Are you sure you want to ${action} the category "${category.name}"?`
    if (isParentCategory && !newStatus && subcategories.length > 0) {
      confirmMessage += `\n\nThis will also disable all ${subcategories.length} subcategories.`
    }
    
    // If subcategory, check if parent is active
    if (category.parent_category_id && newStatus) {
      const parentCategory = categories.find(cat => cat.id === category.parent_category_id)
      if (parentCategory && !parentCategory.is_active) {
        toast({
          title: "Cannot Enable",
          description: "Parent category must be enabled first before enabling subcategories.",
          variant: "destructive"
        })
        return
      }
    }
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const token = TokenManager.getToken()
      
      // If no token, redirect to login
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue",
          variant: "destructive"
        })
        router.push("/superadmin/login")
        return
      }
      
      // Update the main category
      const response = await fetch(getBackendApiUrl(`categories/${category.id}`), {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ is_active: newStatus })
      })

      if (response.ok) {
        // If disabling a parent category, also disable all subcategories
        if (isParentCategory && !newStatus && subcategories.length > 0) {
          const updatePromises = subcategories.map(subCat => 
            fetch(getBackendApiUrl(`categories/${subCat.id}`), {
              method: "PUT",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ is_active: false })
            })
          )
          
          await Promise.all(updatePromises)
        }
        
        toast({
          title: "Success",
          description: `Category ${action}d successfully${isParentCategory && !newStatus && subcategories.length > 0 ? ' along with its subcategories' : ''}`,
          variant: "default"
        })
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.detail || `Failed to ${action} category`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing category:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} category. Please try again.`,
        variant: "destructive"
      })
    }
  }


  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      parent_category_id: "none",
      is_active: true,
      display_order: "0",
      icon_url: "",
      color_code: ""
    })
    setEditingCategory(null)
    setErrors({})
  }

  const handleNewCategory = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleNewSubCategory = () => {
    setSubCategoryFormData({
      parent_category_id: "",
      name: "",
      code: "",
      description: "",
      is_active: true,
      display_order: "0",
      icon_url: "",
      color_code: ""
    })
    setSubCategoryErrors({})
    setIsSubCategoryDialogOpen(true)
  }

  const handleSubCategoryInputChange = (field: string, value: string | boolean) => {
    setSubCategoryFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate code when name changes using the same format
      if (field === "name" && typeof value === "string") {
        updated.code = generateCategoryCode(value)
      }
      
      return updated
    })
    if (subCategoryErrors[field]) {
      setSubCategoryErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateSubCategoryForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!subCategoryFormData.parent_category_id) {
      newErrors.parent_category_id = "Parent category is required"
    }

    if (!subCategoryFormData.name.trim()) {
      newErrors.name = "Sub-category name is required"
    }

    if (!subCategoryFormData.code.trim()) {
      newErrors.code = "Sub-category code is required"
    } else if (!/^[A-Z0-9_]+$/.test(subCategoryFormData.code)) {
      newErrors.code = "Code must contain only uppercase letters, numbers, and underscores"
    }

    // Check for duplicate code
    const existingCategory = categories.find(cat => 
      cat.code.toLowerCase() === subCategoryFormData.code.toLowerCase()
    )
    if (existingCategory) {
      newErrors.code = "This code already exists"
    }

    setSubCategoryErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubCategorySubmit = async () => {
    if (!validateSubCategoryForm()) return

    setIsSubmitting(true)
    
    try {
      const token = TokenManager.getToken()
      
      // If no token, redirect to login
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue",
          variant: "destructive"
        })
        router.push("/superadmin/login")
        return
      }
      const apiPayload = {
        name: subCategoryFormData.name,
        code: subCategoryFormData.code,
        description: subCategoryFormData.description || undefined,
        parent_category_id: subCategoryFormData.parent_category_id,
        is_active: subCategoryFormData.is_active,
        display_order: parseInt(subCategoryFormData.display_order) || 0,
        icon_url: subCategoryFormData.icon_url || undefined,
        color_code: subCategoryFormData.color_code || undefined
      }

      const response = await fetch(getBackendApiUrl('categories'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sub-category created successfully",
          variant: "default"
        })
        
        setIsSubCategoryDialogOpen(false)
        fetchCategories()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.detail || "Failed to create sub-category",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating sub-category:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get parent categories (categories without parent)
  const parentCategories = categories.filter(cat => !cat.parent_category_id)

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.code.toLowerCase().includes(searchTerm.toLowerCase())
    const isParent = !category.parent_category_id
    return matchesSearch && isParent
  })

  const getSubCategories = (parentId: string) => {
    return categories.filter(cat => cat.parent_category_id === parentId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full p-4 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading categories...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full p-4 lg:px-8">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Categories Management</h1>
              <p className="text-gray-600">Manage course categories and their organization</p>
            </div>

            <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleNewCategory}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "Create New Category"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Category Name *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className={errors.name ? "border-red-500" : ""}
                        placeholder="Enter category name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                        Category Code *
                      </Label>
                      <Input
                        id="code"
                        value={formData.code}
                        readOnly
                        onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                        className={errors.code ? "border-red-500" : ""}
                        placeholder="Auto-generated from category name"
                      />
                      {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Enter category description"
                      rows={3}
                    />
                  </div>

                  <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="hidden" htmlFor="parent_category_id" className="text-sm font-medium text-gray-700">
                        Parent Category
                      </Label>
                      <Select
                        value={formData.parent_category_id}
                        onValueChange={(value) => handleInputChange("parent_category_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Parent (Root Category)</SelectItem>
                          {parentCategories
                            .filter(cat => cat.id !== editingCategory?.id)
                            .map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="display_order" className="text-sm font-medium text-gray-700">
                        Display Order
                      </Label>
                      <Input
                        id="display_order"
                        type="number"
                        value={formData.display_order}
                        onChange={(e) => handleInputChange("display_order", e.target.value)}
                        className={errors.display_order ? "border-red-500" : ""}
                        placeholder="0"
                      />
                      {errors.display_order && (
                        <p className="mt-1 text-sm text-red-600">{errors.display_order}</p>
                      )}
                    </div>
                  </div>

                  <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="hidden" htmlFor="icon_url" className="text-sm font-medium text-gray-700">
                        Icon URL
                      </Label>
                      <Input
                        id="icon_url"
                        value={formData.icon_url}
                        onChange={(e) => handleInputChange("icon_url", e.target.value)}
                        placeholder="https://example.com/icon.png"
                      />
                    </div>

                    <div>
                      <Label className="hidden" htmlFor="color_code" className="text-sm font-medium text-gray-700">
                        Color Code
                      </Label>
                      <Input
                        id="color_code"
                        value={formData.color_code}
                        onChange={(e) => handleInputChange("color_code", e.target.value)}
                        className={errors.color_code ? "border-red-500" : ""}
                        placeholder="#FF5722"
                      />
                      {errors.color_code && (
                        <p className="mt-1 text-sm text-red-600">{errors.color_code}</p>
                      )}
                    </div>
                  </div>

                  <div className="hidden flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => handleInputChange("is_active", e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                      Active Category
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-yellow-400 hover:bg-yellow-500 text-black"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Saving..." : (editingCategory ? "Update" : "Create")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleNewSubCategory}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Sub Category
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Sub-Category</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="parent_category_id">
                        Parent Category <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={subCategoryFormData.parent_category_id}
                        onValueChange={(value) => handleSubCategoryInputChange("parent_category_id", value)}
                      >
                        <SelectTrigger className={subCategoryErrors.parent_category_id ? "border-red-500" : ""}>
                          <SelectValue placeholder="Select parent category" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {subCategoryErrors.parent_category_id && (
                        <p className="text-sm text-red-500 mt-1">{subCategoryErrors.parent_category_id}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="subcat_name">
                        Sub-Category Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="subcat_name"
                        value={subCategoryFormData.name}
                        onChange={(e) => handleSubCategoryInputChange("name", e.target.value)}
                        className={subCategoryErrors.name ? "border-red-500" : ""}
                        placeholder="Enter sub-category name"
                      />
                      {subCategoryErrors.name && (
                        <p className="text-sm text-red-500 mt-1">{subCategoryErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="subcat_code">
                        Sub-Category Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="subcat_code"
                        value={subCategoryFormData.code}
                        readOnly
                        className={`bg-gray-100 ${subCategoryErrors.code ? "border-red-500" : ""}`}
                        placeholder="Auto-generated from name"
                      />
                      {subCategoryErrors.code && (
                        <p className="text-sm text-red-500 mt-1">{subCategoryErrors.code}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="subcat_description">Description</Label>
                      <Textarea
                        id="subcat_description"
                        value={subCategoryFormData.description}
                        onChange={(e) => handleSubCategoryInputChange("description", e.target.value)}
                        rows={3}
                        placeholder="Enter description (optional)"
                      />
                    </div>

                    <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="hidden" htmlFor="subcat_display_order">Display Order</Label>
                        <Input
                          id="subcat_display_order"
                          type="number"
                          value={subCategoryFormData.display_order}
                          onChange={(e) => handleSubCategoryInputChange("display_order", e.target.value)}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label className="hidden" htmlFor="subcat_color_code">Color Code</Label>
                        <Input
                          id="subcat_color_code"
                          value={subCategoryFormData.color_code}
                          onChange={(e) => handleSubCategoryInputChange("color_code", e.target.value)}
                          placeholder="#FF5722"
                        />
                      </div>
                    </div>

                    <div className="hidden">
                      <Label className="hidden" htmlFor="subcat_icon_url">Icon URL</Label>
                      <Input
                        id="subcat_icon_url"
                        value={subCategoryFormData.icon_url}
                        onChange={(e) => handleSubCategoryInputChange("icon_url", e.target.value)}
                        placeholder="https://example.com/icon.png"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSubCategoryDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubCategorySubmit}
                      disabled={isSubmitting}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Creating..." : "Create Sub-Category"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={showActiveOnly ? "default" : "outline"}
                    onClick={() => setShowActiveOnly(!showActiveOnly)}
                    size="sm"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {showActiveOnly ? "Active Only" : "All Categories"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Categories ({filteredCategories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? "No categories match your search criteria." : "Get started by creating your first category."}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleNewCategory}
                      className="bg-yellow-400 hover:bg-yellow-500 text-black"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Category
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Courses</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => {
                        const subCategories = getSubCategories(category.id)
                        return (
                          <React.Fragment key={category.id}>
                            <TableRow>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {subCategories.length > 0 && (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  )}
                                  {category.color_code && (
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: category.color_code }}
                                    />
                                  )}
                                  <span className="font-medium">{category.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className="bg-purple-50 text-purple-700"
                                >
                                  Category
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {category.code}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-gray-600 max-w-xs truncate block">
                                  {category.description || "No description"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={category.is_active ? "default" : "secondary"}
                                  className={category.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                                >
                                  {category.is_active ? (
                                    <>
                                      <Eye className="w-3 h-3 mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      Inactive
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>{category.display_order}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {category.course_count || 0} courses
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(category)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleStatus(category)}
                                    className={category.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                                  >
                                    {category.is_active ? <Power className="w-4 h-4" /> : <Power className="w-4 h-4 text-green-600" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {subCategories.map(subCat => (
                              <TableRow key={subCat.id} className="bg-gray-50">
                                <TableCell>
                                  <div className="flex items-center gap-2 pl-8">
                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                    {subCat.color_code && (
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: subCat.color_code }}
                                      />
                                    )}
                                    <span className="font-normal text-sm">{subCat.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className="bg-blue-50 text-blue-700"
                                  >
                                    Sub-Category
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {subCat.code}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-gray-600 max-w-xs truncate block">
                                    {subCat.description || "No description"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={subCat.is_active ? "default" : "secondary"}
                                    className={subCat.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                                  >
                                    {subCat.is_active ? (
                                      <>
                                        <Eye className="w-3 h-3 mr-1" />
                                        Active
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="w-3 h-3 mr-1" />
                                        Inactive
                                      </>
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell>{subCat.display_order}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {subCat.course_count || 0} courses
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(subCat)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleToggleStatus(subCat)}
                                      className={subCat.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                                    >
                                      {subCat.is_active ? <Power className="w-4 h-4" /> : <Power className="w-4 h-4 text-green-600" />}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
