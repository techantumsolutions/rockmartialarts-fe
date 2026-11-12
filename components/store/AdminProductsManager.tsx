"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  Tag,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from "lucide-react"
import {
  storeAPI,
  StoreProduct,
  StoreCategory,
  StoreProductInput,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"

export default function AdminProductsManager() {
  const { toast } = useToast()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Create / Edit modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Form fields
  const [formTitle, setFormTitle] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formCategoryId, setFormCategoryId] = useState("")
  const [formPrice, setFormPrice] = useState<number | "">("")
  const [formOffer, setFormOffer] = useState<number | "">(0)
  const [formStock, setFormStock] = useState<number | "">(10)
  const [formImageUrl, setFormImageUrl] = useState("")
  const [formIsActive, setFormIsActive] = useState(true)

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState<StoreProduct | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [prods, cats] = await Promise.all([
        storeAPI.getProducts({ is_active: undefined }),
        storeAPI.getCategories(false),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load store products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openCreateDialog = () => {
    setEditingProduct(null)
    setFormTitle("")
    setFormDescription("")
    setFormCategoryId(categories[0]?.id || "")
    setFormPrice(1000)
    setFormOffer(0)
    setFormStock(20)
    setFormImageUrl("")
    setFormIsActive(true)
    setIsDialogOpen(true)
  }

  const openEditDialog = (product: StoreProduct) => {
    setEditingProduct(product)
    setFormTitle(product.title)
    setFormDescription(product.description || "")
    setFormCategoryId(product.category_id)
    setFormPrice(product.price)
    setFormOffer(product.offer_percentage || 0)
    setFormStock(product.stock)
    setFormImageUrl(product.image_url || "")
    setFormIsActive(product.is_active)
    setIsDialogOpen(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingImage(true)
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Failed to upload image")
      }
      const data = await res.json()
      const url = data.url || data.file_url || ""
      setFormImageUrl(url)
      toast({
        title: "Image Uploaded",
        description: "Product image has been uploaded successfully.",
      })
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Could not upload image",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" })
      return
    }
    if (!formCategoryId) {
      toast({ title: "Validation Error", description: "Please select a category", variant: "destructive" })
      return
    }
    if (formPrice === "" || Number(formPrice) < 0) {
      toast({ title: "Validation Error", description: "Enter a valid price", variant: "destructive" })
      return
    }

    try {
      setSubmitting(true)
      const payload: StoreProductInput = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        category_id: formCategoryId,
        price: Number(formPrice),
        offer_percentage: Number(formOffer) || 0,
        stock: Number(formStock) || 0,
        image_url: formImageUrl.trim(),
        is_active: formIsActive,
      }

      if (editingProduct) {
        await storeAPI.updateProduct(editingProduct.id, payload)
        toast({ title: "Product Updated", description: "Product has been updated successfully." })
      } else {
        await storeAPI.createProduct(payload)
        toast({ title: "Product Created", description: "New product has been added to store." })
      }

      setIsDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save product",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (product: StoreProduct) => {
    try {
      const nextStatus = !product.is_active
      await storeAPI.toggleProductStatus(product.id, nextStatus)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: nextStatus } : p))
      )
      toast({
        title: nextStatus ? "Product Enabled" : "Product Disabled",
        description: `${product.title} is now ${nextStatus ? "visible" : "hidden"} in the store.`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update product status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return
    try {
      setIsDeleting(true)
      await storeAPI.deleteProduct(productToDelete.id)
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id))
      toast({
        title: "Product Deleted",
        description: `${productToDelete.title} has been removed.`,
      })
      setProductToDelete(null)
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message || "Failed to delete product",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const calculatedSellingPrice = useMemo(() => {
    const p = Number(formPrice) || 0
    const off = Number(formOffer) || 0
    const disc = (p * Math.max(0, Math.min(100, off))) / 100
    return Math.max(0, p - disc)
  }, [formPrice, formOffer])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.category_name || "").toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        selectedCategory === "all" ||
        p.category_id === selectedCategory ||
        p.category_slug === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#FFB70F]" />
            Products Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage martial arts equipment, gear, uniforms, prices, offers, and inventory stock.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black font-semibold shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search products by title or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <div className="w-full md:w-60">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F] mb-3" />
          <p className="text-sm font-medium">Loading store products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border border-dashed border-gray-300 py-16 text-center">
          <div className="max-w-sm mx-auto space-y-3">
            <Package className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="font-semibold text-gray-800 text-lg">No Products Found</h3>
            <p className="text-sm text-gray-500">
              {search || selectedCategory !== "all"
                ? "No products match the selected filters."
                : "No products in the store yet. Click 'Add Product' to create your first item."}
            </p>
            {(!search && selectedCategory === "all") && (
              <Button onClick={openCreateDialog} className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black">
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const hasDiscount = (product.offer_percentage || 0) > 0
            const isOutOfStock = product.stock <= 0
            return (
              <Card
                key={product.id}
                className={`overflow-hidden border transition-all duration-200 hover:shadow-md ${
                  product.is_active ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50/70 opacity-75"
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center p-4 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mb-1 opacity-50" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}

                  {/* Offer Badge */}
                  {hasDiscount && (
                    <span className="absolute top-2 left-2 bg-[#F73322] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                      {product.offer_percentage}% OFF
                    </span>
                  )}

                  {/* Stock Badge */}
                  <span
                    className={`absolute top-2 right-2 text-[11px] font-medium px-2 py-0.5 rounded shadow ${
                      isOutOfStock
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : product.stock < 5
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {isOutOfStock ? "Out of Stock" : `Stock: ${product.stock}`}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {product.category_name || "General"}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base line-clamp-1" title={product.title}>
                      {product.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[32px]">
                      {product.description || "No description provided."}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 pt-1 border-t border-gray-100">
                    <span className="text-lg font-bold text-gray-900">
                      ₹{product.final_price?.toLocaleString("en-IN")}
                    </span>
                    {hasDiscount && (
                      <span className="text-xs text-gray-400 line-through">
                        ₹{product.price?.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => handleToggleStatus(product)}
                      />
                      <span className="text-xs text-gray-600 font-medium">
                        {product.is_active ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(product)}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setProductToDelete(product)}
                        className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Package className="w-5 h-5 text-[#FFB70F]" />
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            {/* Image Preview & Upload */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Product Image</label>
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {formImageUrl ? (
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage}
                        className="pointer-events-none"
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Upload File
                      </Button>
                    </label>
                    <span className="text-xs text-gray-500">or paste an image URL below</span>
                  </div>
                  <Input
                    placeholder="https://... or /assets/img/store/..."
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Product Title *</label>
              <Input
                placeholder="e.g. Karate Uniform, Sparring Gloves, etc."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Category *</label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Description</label>
              <Textarea
                placeholder="Detailed description of specifications, materials, and sizing..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Price & Offer & Stock Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Base Price (₹) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2500"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Offer (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formOffer}
                  onChange={(e) => setFormOffer(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Stock Qty *</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="20"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value === "" ? "" : Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Live Calculated Selling Price Preview */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-sm">
              <span className="text-amber-900 font-medium">Final Selling Price (Student Pays):</span>
              <span className="text-lg font-bold text-amber-950">
                ₹{calculatedSellingPrice.toLocaleString("en-IN")}
                {Number(formOffer) > 0 && (
                  <span className="text-xs text-red-600 font-semibold ml-2">
                    ({formOffer}% Discount Applied)
                  </span>
                )}
              </span>
            </div>

            {/* Status Switch */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
              <div>
                <p className="text-sm font-semibold text-gray-800">Product Status</p>
                <p className="text-xs text-gray-500">Enable or disable product visibility in student store</p>
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
                {editingProduct ? "Update Product" : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
              <AlertCircle className="w-5 h-5" />
              Delete Product
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-gray-900">{productToDelete?.title}</span>?
            This item will be removed from the store catalog.
          </div>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setProductToDelete(null)}
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
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

