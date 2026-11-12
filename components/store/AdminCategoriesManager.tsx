"use client"

import { useEffect, useState } from "react"
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Package,
} from "lucide-react"
import {
  storeAPI,
  StoreCategory,
  StoreCategoryInput,
} from "@/lib/storeAPI"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function AdminCategoriesManager() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [formName, setFormName] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formOrder, setFormOrder] = useState<number | "">(0)
  const [formIsActive, setFormIsActive] = useState(true)

  // Delete
  const [categoryToDelete, setCategoryToDelete] = useState<StoreCategory | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await storeAPI.getCategories(false)
      setCategories(data)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const openCreateDialog = () => {
    setEditingCategory(null)
    setFormName("")
    setFormSlug("")
    setFormDescription("")
    setFormOrder(categories.length + 1)
    setFormIsActive(true)
    setIsDialogOpen(true)
  }

  const openEditDialog = (cat: StoreCategory) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setFormDescription(cat.description || "")
    setFormOrder(cat.display_order || 0)
    setFormIsActive(cat.is_active)
    setIsDialogOpen(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast({ title: "Validation Error", description: "Name is required", variant: "destructive" })
      return
    }

    try {
      setSubmitting(true)
      const payload: StoreCategoryInput = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        description: formDescription.trim(),
        display_order: Number(formOrder) || 0,
        is_active: formIsActive,
      }

      if (editingCategory) {
        await storeAPI.updateCategory(editingCategory.id, payload)
        toast({ title: "Category Updated", description: "Store category updated successfully." })
      } else {
        await storeAPI.createCategory(payload)
        toast({ title: "Category Created", description: "New store category added." })
      }

      setIsDialogOpen(false)
      loadCategories()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save category",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return
    try {
      setIsDeleting(true)
      await storeAPI.deleteCategory(categoryToDelete.id)
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id))
      toast({
        title: "Category Deleted",
        description: `${categoryToDelete.name} has been deleted.`,
      })
      setCategoryToDelete(null)
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete category",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Tags className="w-6 h-6 text-[#FFB70F]" />
            Store Categories
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize products into categories like Uniforms, Sparring Gear, Belts, Weapons, and Accessories.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black font-semibold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F] mb-3" />
          <p className="text-sm font-medium">Loading store categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <Card className="border border-dashed border-gray-300 py-16 text-center">
          <div className="max-w-sm mx-auto space-y-3">
            <Tags className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="font-semibold text-gray-800 text-lg">No Categories Yet</h3>
            <p className="text-sm text-gray-500">
              Create product categories to categorize equipment in the student store.
            </p>
            <Button onClick={openCreateDialog} className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black">
              <Plus className="w-4 h-4 mr-2" /> Add Category
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className={`border transition-all duration-200 hover:shadow-md ${
                cat.is_active ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-75"
              }`}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-lg">{cat.name}</h3>
                      <Badge variant={cat.is_active ? "default" : "secondary"} className="text-[10px]">
                        {cat.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">slug: {cat.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(cat)}
                      className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCategoryToDelete(cat)}
                      className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 min-h-[36px]">
                  {cat.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5 font-medium text-gray-700">
                    <Package className="w-3.5 h-3.5 text-[#FFB70F]" />
                    {cat.product_count || 0} Products
                  </span>
                  <span>Order: {cat.display_order}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Tags className="w-5 h-5 text-[#FFB70F]" />
              {editingCategory ? "Edit Category" : "Add Store Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Category Name *</label>
              <Input
                placeholder="e.g. Uniforms, Sparring Gear, Weapons"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value)
                  if (!editingCategory) {
                    setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
                  }
                }}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Slug</label>
              <Input
                placeholder="e.g. sparring-gear"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <Textarea
                placeholder="Brief summary of items included in this category..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Display Order</label>
              <Input
                type="number"
                min="0"
                value={formOrder}
                onChange={(e) => setFormOrder(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
              <div>
                <p className="text-sm font-semibold text-gray-800">Active Status</p>
                <p className="text-xs text-gray-500">Show this category in the student store</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black font-semibold"
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCategory ? "Update Category" : "Save Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
              <AlertCircle className="w-5 h-5" />
              Delete Category
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600 space-y-2">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-900">{categoryToDelete?.name}</span>?
            </p>
            {categoryToDelete && (categoryToDelete.product_count || 0) > 0 && (
              <p className="text-red-600 text-xs font-medium">
                Note: This category currently has {categoryToDelete.product_count} product(s) assigned to it.
                You must reassign or delete those products first.
              </p>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

