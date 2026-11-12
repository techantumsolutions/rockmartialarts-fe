import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"

export interface StoreCategory {
  id: string
  name: string
  slug: string
  description?: string
  display_order: number
  is_active: boolean
  product_count?: number
  created_at: string
  updated_at: string
}

export interface StoreCategoryInput {
  name: string
  slug?: string
  description?: string
  display_order?: number
  is_active?: boolean
}

export interface StoreProduct {
  id: string
  title: string
  description: string
  category_id: string
  category_slug?: string
  category_name?: string
  price: number
  offer_percentage: number
  final_price: number
  stock: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreProductInput {
  title: string
  description?: string
  category_id: string
  price: number
  offer_percentage?: number
  stock?: number
  image_url?: string
  is_active?: boolean
}

export interface StoreOrderItem {
  product_id: string
  title: string
  category_name?: string
  price: number
  offer_percentage: number
  final_price: number
  quantity: number
  image_url?: string
}

export interface StoreOrder {
  id: string
  order_number: string
  student_id: string
  student_name: string
  student_email?: string
  student_phone?: string
  branch_id?: string
  branch_name?: string
  items: StoreOrderItem[]
  total_amount: number
  payment_method: string
  payment_status: string
  payment_id?: string
  razorpay_order_id?: string
  razorpay_signature?: string
  fulfillment_status: "pending" | "given_to_student"
  given_to_student: boolean
  given_at?: string
  given_by_admin_name?: string
  created_at: string
  updated_at: string
}

function getAuthHeaders(): HeadersInit {
  const token = TokenManager.getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const storeAPI = {
  // Categories
  async getCategories(activeOnly = false): Promise<StoreCategory[]> {
    const res = await fetch(getBackendApiUrl(`store/categories?active_only=${activeOnly}`), {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to fetch store categories")
    }
    return res.json()
  },

  async createCategory(data: StoreCategoryInput): Promise<StoreCategory> {
    const res = await fetch(getBackendApiUrl("store/categories"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to create category")
    }
    return res.json()
  },

  async updateCategory(id: string, data: Partial<StoreCategoryInput>): Promise<StoreCategory> {
    const res = await fetch(getBackendApiUrl(`store/categories/${id}`), {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to update category")
    }
    return res.json()
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const res = await fetch(getBackendApiUrl(`store/categories/${id}`), {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to delete category")
    }
    return res.json()
  },

  // Products
  async getProducts(params?: {
    category_id?: string
    category_slug?: string
    is_active?: boolean
    search?: string
  }): Promise<StoreProduct[]> {
    const sp = new URLSearchParams()
    if (params?.category_id) sp.append("category_id", params.category_id)
    if (params?.category_slug) sp.append("category_slug", params.category_slug)
    if (params?.is_active !== undefined) sp.append("is_active", String(params.is_active))
    if (params?.search) sp.append("search", params.search)

    const q = sp.toString()
    const res = await fetch(getBackendApiUrl(`store/products${q ? `?${q}` : ""}`), {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to fetch products")
    }
    return res.json()
  },

  async getProduct(id: string): Promise<StoreProduct> {
    const res = await fetch(getBackendApiUrl(`store/products/${id}`), {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to fetch product")
    }
    return res.json()
  },

  async createProduct(data: StoreProductInput): Promise<StoreProduct> {
    const res = await fetch(getBackendApiUrl("store/products"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to create product")
    }
    return res.json()
  },

  async updateProduct(id: string, data: Partial<StoreProductInput>): Promise<StoreProduct> {
    const res = await fetch(getBackendApiUrl(`store/products/${id}`), {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to update product")
    }
    return res.json()
  },

  async toggleProductStatus(id: string, isActive: boolean): Promise<StoreProduct> {
    const res = await fetch(getBackendApiUrl(`store/products/${id}/status`), {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to update product status")
    }
    return res.json()
  },

  async deleteProduct(id: string): Promise<{ message: string }> {
    const res = await fetch(getBackendApiUrl(`store/products/${id}`), {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to delete product")
    }
    return res.json()
  },

  // Orders & Online Payments
  async createPaymentOrder(data: {
    product_id: string
    quantity: number
  }): Promise<{
    order_id: string | null
    amount: number
    currency: string
    key: string
    product_title?: string
    total_amount: number
  }> {
    const res = await fetch(getBackendApiUrl("store/create-payment-order"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to initialize payment gateway order")
    }
    return res.json()
  },

  async createOrder(data: {
    product_id: string
    quantity: number
    payment_method?: string
    payment_id?: string
    razorpay_order_id?: string
    razorpay_signature?: string
    payment_status?: string
  }): Promise<StoreOrder> {
    const res = await fetch(getBackendApiUrl("store/orders"), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to place order")
    }
    return res.json()
  },

  async getMyOrders(): Promise<StoreOrder[]> {
    const res = await fetch(getBackendApiUrl("store/orders/my-orders"), {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to fetch orders")
    }
    return res.json()
  },

  async getAdminOrders(params?: {
    fulfillment_status?: string
    search?: string
  }): Promise<StoreOrder[]> {
    const sp = new URLSearchParams()
    if (params?.fulfillment_status) sp.append("fulfillment_status", params.fulfillment_status)
    if (params?.search) sp.append("search", params.search)

    const q = sp.toString()
    const res = await fetch(getBackendApiUrl(`store/admin/orders${q ? `?${q}` : ""}`), {
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to fetch admin orders")
    }
    return res.json()
  },

  async updateOrderFulfillment(orderId: string, givenToStudent: boolean): Promise<StoreOrder> {
    const res = await fetch(getBackendApiUrl(`store/admin/orders/${orderId}/fulfillment`), {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ given_to_student: givenToStudent }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to update order fulfillment status")
    }
    return res.json()
  },
}

