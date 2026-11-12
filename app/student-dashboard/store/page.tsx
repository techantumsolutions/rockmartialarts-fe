"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ShoppingBag,
  Search,
  Tag,
  CheckCircle2,
  Clock,
  Package,
  Loader2,
  ShieldAlert,
  ArrowRight,
  User,
  CreditCard,
  Minus,
  Plus,
  Download,
} from "lucide-react"
import {
  storeAPI,
  StoreProduct,
  StoreCategory,
  StoreOrder,
} from "@/lib/storeAPI"
import { TokenManager } from "@/lib/tokenManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { loadRazorpayScript } from "@/lib/razorpay"
import { generateStoreReceipt } from "@/lib/generateStoreReceipt"

export default function StudentStorePage() {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [activeTab, setActiveTab] = useState<"browse" | "purchased">("browse")
  const [isPartnerStudent, setIsPartnerStudent] = useState<boolean | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [purchasedOrders, setPurchasedOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Filtering
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Purchase Modal
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null)
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const [buyQuantity, setBuyQuantity] = useState(1)
  const [purchasing, setPurchasing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<StoreOrder | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null)

  // Current logged in user info
  const user = useMemo(() => TokenManager.getUser(), [])

  // Partner student guard
  useEffect(() => {
    const org = user?.partner_org_id
    if (org && String(org).trim() !== "") {
      setIsPartnerStudent(true)
    } else {
      setIsPartnerStudent(false)
    }
  }, [user])

  // Load catalog & categories
  const loadCatalog = async () => {
    try {
      setLoading(true)
      const [prods, cats] = await Promise.all([
        storeAPI.getProducts({ is_active: true }),
        storeAPI.getCategories(true),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load store gear",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load student purchased orders
  const loadMyOrders = async () => {
    try {
      setOrdersLoading(true)
      const data = await storeAPI.getMyOrders()
      setPurchasedOrders(data)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load purchased products",
        variant: "destructive",
      })
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (isPartnerStudent === false) {
      loadCatalog()
      loadMyOrders()
    }
  }, [isPartnerStudent])

  const openBuyModal = (product: StoreProduct) => {
    setSelectedProduct(product)
    setBuyQuantity(1)
    setBuyModalOpen(true)
    setOrderSuccess(null)
  }

  const handleQuantityChange = (delta: number) => {
    if (!selectedProduct) return
    const maxStock = selectedProduct.stock || 1
    setBuyQuantity((prev) => {
      const next = prev + delta
      if (next < 1) return 1
      if (next > maxStock) return maxStock
      return next
    })
  }

  // DIRECT ONLINE PAY VIA RAZORPAY - ORDER IS CREATED ONLY AFTER SUCCESSFUL PAYMENT
  const handlePurchaseSubmit = async () => {
    if (!selectedProduct) return
    const productToBuy = selectedProduct
    const quantityToBuy = buyQuantity

    if (quantityToBuy > productToBuy.stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${productToBuy.stock} items available.`,
        variant: "destructive",
      })
      return
    }

    try {
      setPurchasing(true)

      // Close the Radix buy modal first to unlock document.body pointer-events and focus traps
      setBuyModalOpen(false)
      if (typeof document !== "undefined") {
        document.body.style.pointerEvents = "auto"
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || ""
      const loaded = await loadRazorpayScript()

      if (!loaded || typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Unable to load Razorpay payment gateway. Please check your internet connection.")
      }

      // Initialize server payment order for Razorpay order_id (activates netbanking & test simulator)
      let paymentOrder: { order_id: string | null; amount: number; currency: string; key: string } | null = null
      try {
        paymentOrder = await storeAPI.createPaymentOrder({
          product_id: productToBuy.id,
          quantity: quantityToBuy,
        })
      } catch (orderErr: any) {
        console.warn("Could not create server payment order, falling back to direct amount:", orderErr)
      }

      const fallbackPaise = Math.round(productToBuy.final_price * quantityToBuy * 100)
      const amountPaise = paymentOrder?.amount || fallbackPaise
      const keyId = paymentOrder?.key || razorpayKey

      const rzpOptions: any = {
        key: keyId,
        amount: amountPaise,
        currency: paymentOrder?.currency || "INR",
        name: "Rock Martial Arts",
        description: `${productToBuy.title} (Qty: ${quantityToBuy})`,
        prefill: {
          name: user?.full_name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#FFB70F" },
        handler: async (response: any) => {
          try {
            // ORDER CREATED ONLY AFTER SUCCESSFUL PAYMENT
            const order = await storeAPI.createOrder({
              product_id: productToBuy.id,
              quantity: quantityToBuy,
              payment_method: "razorpay",
              payment_id: response.razorpay_payment_id || "",
              razorpay_order_id: response.razorpay_order_id || paymentOrder?.order_id || "",
              razorpay_signature: response.razorpay_signature || "",
              payment_status: "paid",
            })
            setOrderSuccess(order)
            setSelectedProduct(null)
            loadCatalog()
            loadMyOrders()
            toast({
              title: "Payment Successful!",
              description: `Order #${order.order_number} confirmed. You can now download your receipt.`,
            })
          } catch (e: any) {
            toast({
              title: "Order Failed",
              description: e.message || "Payment succeeded but failed to register order.",
              variant: "destructive",
            })
          } finally {
            setPurchasing(false)
          }
        },
        modal: {
          ondismiss: () => {
            setPurchasing(false)
            setBuyModalOpen(true) // reopen purchase modal so user can retry or adjust
            toast({
              title: "Payment Cancelled",
              description: "The payment window was closed. No order was created.",
            })
          },
        },
      }

      if (paymentOrder?.order_id) {
        rzpOptions.order_id = paymentOrder.order_id
      }

      const rzp = new window.Razorpay(rzpOptions)

      rzp.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response)
        setPurchasing(false)
        setBuyModalOpen(true)
        toast({
          title: "Payment Failed",
          description: response?.error?.description || "Payment could not be completed. Please try again.",
          variant: "destructive",
        })
      })

      // Brief delay to allow Radix cleanup of modal pointer lock before launching Razorpay
      setTimeout(() => {
        if (typeof document !== "undefined") {
          document.body.style.pointerEvents = "auto"
        }
        rzp.open()
      }, 60)
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "Could not launch Razorpay",
        variant: "destructive",
      })
      setPurchasing(false)
      setBuyModalOpen(true)
    }
  }

  const handleDownloadReceipt = async (order: StoreOrder) => {
    try {
      setDownloadingOrderId(order.id)
      await generateStoreReceipt(order)
      toast({
        title: "Receipt Downloaded",
        description: `Receipt for order #${order.order_number} has been saved.`,
      })
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Failed to generate receipt PDF",
        variant: "destructive",
      })
    } finally {
      setDownloadingOrderId(null)
    }
  }

  // Filter products
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

  // Block partner students
  if (isPartnerStudent) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12">
        <Card className="border-red-200 bg-red-50 text-center py-10 px-6 shadow-sm">
          <CardContent className="space-y-4">
            <ShieldAlert className="w-14 h-14 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-900">Access Restricted</h2>
            <p className="text-sm text-red-700 leading-relaxed">
              The Martial Arts Gear Store is exclusively available to Rock Martial Arts academy students.
            </p>
            <Button
              onClick={() => router.replace("/student-dashboard")}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Global style to guarantee Razorpay checkout frame and container receive all pointer and click events */}
      <style jsx global>{`
        .razorpay-container {
          pointer-events: auto !important;
          z-index: 2147483647 !important;
        }
        .razorpay-container iframe,
        .razorpay-checkout-frame {
          pointer-events: auto !important;
        }
      `}</style>

      {/* Top Banner / Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white p-6 sm:p-8 shadow-md">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-[#FFB70F] bg-[#FFB70F]/10 px-3 py-1 rounded-full border border-[#FFB70F]/30 inline-block">
            Official Equipment & Gear
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Rock Martial Arts <span className="text-[#FFB70F]">Store</span>
          </h1>
          <p className="text-gray-300 text-sm sm:text-base">
            Premium uniforms, sparring armor, gloves, training weapons, and authentic belts hand-picked by masters.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
          <ShoppingBag className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Tabs: Browse Gear vs Purchased Products */}
      <div className="flex border-b border-gray-200 gap-8">
        <button
          onClick={() => setActiveTab("browse")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "browse"
              ? "text-black border-b-2 border-[#FFB70F]"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Browse Gear
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold ml-1">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("purchased")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "purchased"
              ? "text-black border-b-2 border-[#FFB70F]"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Package className="w-4 h-4" />
          Purchased Products
          {purchasedOrders.length > 0 && (
            <span className="text-xs bg-[#FFB70F] text-black px-2 py-0.5 rounded-full font-bold ml-1">
              {purchasedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BROWSE GEAR */}
      {/* ========================================================================= */}
      {activeTab === "browse" && (
        <div className="space-y-6">
          {/* Search & Category Pills */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search martial arts gear, uniforms, weapons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-gray-200"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === "all"
                    ? "bg-[#FFB70F] text-black shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                All Gear
              </button>
              {categories.map((c) => {
                const isSelected = selectedCategory === c.id || selectedCategory === c.slug
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      isSelected
                        ? "bg-[#FFB70F] text-black shadow-sm"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F] mb-3" />
              <p className="text-sm font-medium">Loading martial arts gear...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="border border-dashed border-gray-300 py-16 text-center">
              <div className="max-w-sm mx-auto space-y-3">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto" />
                <h3 className="font-semibold text-gray-800 text-lg">No Products Found</h3>
                <p className="text-sm text-gray-500">
                  {search || selectedCategory !== "all"
                    ? "Try adjusting your search terms or category selection."
                    : "Store items are currently being stocked."}
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const hasOffer = (product.offer_percentage || 0) > 0
                const isOut = product.stock <= 0

                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden border border-gray-200 bg-white transition-all duration-200 hover:shadow-lg hover:border-[#FFB70F]/50 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative aspect-square bg-gray-50 flex items-center justify-center p-4 overflow-hidden border-b border-gray-100">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <Package className="w-16 h-16 text-gray-300" />
                        )}

                        {/* Offer Badge */}
                        {hasOffer && (
                          <span className="absolute top-2 left-2 bg-[#F73322] text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
                            {product.offer_percentage}% OFF
                          </span>
                        )}

                        {/* Stock status badge */}
                        <span
                          className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded shadow ${
                            isOut
                              ? "bg-red-100 text-red-700"
                              : product.stock < 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isOut ? "Out of Stock" : "In Stock"}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Tag className="w-3 h-3 text-[#FFB70F]" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            {product.category_name || "Gear"}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base line-clamp-1 group-hover:text-black">
                          {product.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px]">
                          {product.description || "Authentic Rock Martial Arts training gear."}
                        </p>
                      </div>
                    </div>

                    {/* Price and Action */}
                    <div className="p-4 pt-0 space-y-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-gray-900">
                          ₹{product.final_price?.toLocaleString("en-IN")}
                        </span>
                        {hasOffer && (
                          <span className="text-xs text-gray-400 line-through">
                            ₹{product.price?.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <Button
                        onClick={() => openBuyModal(product)}
                        disabled={isOut}
                        className={`w-full font-bold text-sm shadow-sm ${
                          isOut
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-[#FFB70F] hover:bg-[#e5a40e] text-black"
                        }`}
                      >
                        {isOut ? "Out of Stock" : "Buy Now"}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PURCHASED PRODUCTS (MY ORDERS) */}
      {/* ========================================================================= */}
      {activeTab === "purchased" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Purchased Gear</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Check handover status and download receipts for your purchased gear.
              </p>
            </div>
          </div>

          {ordersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F] mb-3" />
              <p className="text-sm font-medium">Loading your purchased gear...</p>
            </div>
          ) : purchasedOrders.length === 0 ? (
            <Card className="border border-dashed border-gray-300 py-16 text-center">
              <div className="max-w-sm mx-auto space-y-3">
                <Package className="w-12 h-12 text-gray-400 mx-auto" />
                <h3 className="font-semibold text-gray-800 text-lg">No Purchased Products Yet</h3>
                <p className="text-sm text-gray-500">
                  You haven't ordered any martial arts gear yet. Visit the Browse Gear tab to buy uniforms, weapons, or protective gear.
                </p>
                <Button
                  onClick={() => setActiveTab("browse")}
                  className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black font-semibold mt-2"
                >
                  Browse Store
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {purchasedOrders.map((order) => {
                const isGiven = order.given_to_student
                const orderDate = order.created_at
                  ? new Date(order.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "N/A"
                const isDownloadingThis = downloadingOrderId === order.id

                return (
                  <Card key={order.id} className="border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gray-700">
                              Order #{order.order_number}
                            </span>
                            <span className="text-xs text-gray-400">• {orderDate}</span>
                          </div>
                        </div>

                        {/* Handover Status Badge & Download Receipt Button */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadReceipt(order)}
                            disabled={isDownloadingThis}
                            className="text-xs h-7 px-2.5 flex items-center gap-1 border-gray-300 hover:bg-gray-50 text-gray-700"
                            title="Download Receipt PDF"
                          >
                            {isDownloadingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-gray-600" />
                            )}
                            Receipt
                          </Button>

                          {isGiven ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Given to Student
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs px-3 py-1">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              Ready for Pickup at Branch
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="pt-4 space-y-3">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-lg border flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.title}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-gray-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm truncate">
                                {item.title}
                              </h4>
                              <p className="text-xs text-gray-500">
                                Category: {item.category_name || "General Gear"}
                              </p>
                              <p className="text-xs text-gray-700 mt-0.5">
                                Qty: <span className="font-semibold">{item.quantity}</span> • Unit Price: ₹{item.final_price?.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-sm font-bold text-gray-900">
                                ₹{(item.final_price * item.quantity).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
                        <span>
                          {order.branch_name ? `Assigned Branch: ${order.branch_name}` : ""}
                        </span>
                        {isGiven && order.given_at && (
                          <span className="text-emerald-700 font-medium">
                            Handed over on {new Date(order.given_at).toLocaleDateString("en-IN")}
                          </span>
                        )}
                        {!isGiven && (
                          <span className="text-amber-800 font-medium">
                            Please collect your item from your training branch instructor.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT ONLINE PURCHASE VIA RAZORPAY MODAL (BUY PRODUCT CONFIRMATION) */}
      {/* ========================================================================= */}
      <Dialog
        open={buyModalOpen && !!selectedProduct}
        onOpenChange={(open) => {
          setBuyModalOpen(open)
          if (!open) {
            setSelectedProduct(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {selectedProduct && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#FFB70F]" />
                  Purchase Martial Arts Gear
                </DialogTitle>
              </DialogHeader>

              {/* Product Preview Card */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-16 h-16 bg-white rounded-lg border flex items-center justify-center p-1 shrink-0 overflow-hidden">
                  {selectedProduct.image_url ? (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-sm truncate">
                    {selectedProduct.title}
                  </h4>
                  <p className="text-xs text-gray-500">{selectedProduct.category_name || "Martial Arts Gear"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-gray-900">
                      ₹{selectedProduct.final_price?.toLocaleString("en-IN")}
                    </span>
                    {selectedProduct.offer_percentage > 0 && (
                      <span className="text-xs text-red-600 font-semibold">
                        ({selectedProduct.offer_percentage}% OFF)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between p-3 border rounded-xl">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Quantity</label>
                  <p className="text-xs text-gray-500">Available in stock: {selectedProduct.stock}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={buyQuantity <= 1 || purchasing}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-6 text-center font-bold text-base">{buyQuantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuantityChange(1)}
                    disabled={buyQuantity >= selectedProduct.stock || purchasing}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Bound Student Details */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  Bound Student Details (Buyer)
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div>
                    <span className="text-gray-500">Student:</span>{" "}
                    <strong className="text-gray-900">{user?.full_name || "Enrolled Student"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{" "}
                    <strong className="text-gray-900">{user?.phone || "N/A"}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Email:</span>{" "}
                    <strong className="text-gray-900">{user?.email || "N/A"}</strong>
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 italic pt-1 border-t border-amber-200/50">
                  * Gear will be handed over to you directly at your training branch upon showing receipt.
                </p>
              </div>

              {/* Direct Online Payment Badge (No cash option) */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/20 text-black flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-gray-800" />
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-gray-900">Direct Online Payment (Razorpay)</p>
                  <p className="text-gray-500">Instant confirmation via UPI, Cards, NetBanking, and Wallets</p>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3.5 bg-gray-900 text-white rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">Total Payable:</span>
                <span className="text-xl font-bold text-[#FFB70F]">
                  ₹{(selectedProduct.final_price * buyQuantity).toLocaleString("en-IN")}
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBuyModalOpen(false)
                    setSelectedProduct(null)
                  }}
                  disabled={purchasing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchaseSubmit}
                  disabled={purchasing}
                  className="bg-[#FFB70F] hover:bg-[#e5a40e] text-black font-semibold"
                >
                  {purchasing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Pay ₹{(selectedProduct.final_price * buyQuantity).toLocaleString("en-IN")} via Razorpay
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ORDER SUCCESS DIALOG (CONFIRMATION & DOWNLOAD RECEIPT) */}
      {/* ========================================================================= */}
      <Dialog
        open={!!orderSuccess}
        onOpenChange={(open) => {
          if (!open) {
            setOrderSuccess(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          {orderSuccess && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-gray-900">Payment & Order Confirmed!</h3>
                <p className="text-sm text-gray-500">
                  Order ID: <span className="font-mono font-bold text-black">{orderSuccess.order_number}</span>
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border text-left text-xs space-y-2 text-gray-700 max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span>Product:</span>
                  <strong className="text-gray-900">{orderSuccess.items?.[0]?.title}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <strong className="text-gray-900">{orderSuccess.items?.[0]?.quantity}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <strong className="text-gray-900">₹{orderSuccess.total_amount?.toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Payment ID:</span>
                  <span className="font-mono text-gray-800">{orderSuccess.payment_id || "Razorpay"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Student Name:</span>
                  <strong className="text-gray-900">{orderSuccess.student_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Handover Status:</span>
                  <span className="font-semibold text-amber-700">Ready for pickup at branch</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Your order is bound to your student profile. Show your receipt or order ID at your branch to collect your gear.
              </p>

              {/* Action Buttons: Download Receipt & View Orders */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={async () => {
                    try {
                      setDownloadingReceipt(true)
                      await generateStoreReceipt(orderSuccess)
                      toast({
                        title: "Receipt Downloaded",
                        description: "Your official receipt has been saved.",
                      })
                    } catch (e: any) {
                      toast({
                        title: "Download Failed",
                        description: e.message || "Could not generate receipt PDF",
                        variant: "destructive",
                      })
                    } finally {
                      setDownloadingReceipt(false)
                    }
                  }}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {downloadingReceipt ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Receipt
                </Button>

                <Button
                  onClick={() => {
                    setOrderSuccess(null)
                    setActiveTab("purchased")
                  }}
                  variant="outline"
                  className="w-full sm:w-auto border-gray-300 font-semibold"
                >
                  View Purchased Gear <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
