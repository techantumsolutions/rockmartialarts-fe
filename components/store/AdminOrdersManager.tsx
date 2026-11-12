"use client"

import { useEffect, useState, useMemo } from "react"
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Mail,
  Building,
  AlertCircle,
  Loader2,
  Package,
  Calendar,
} from "lucide-react"
import { storeAPI, StoreOrder } from "@/lib/storeAPI"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function AdminOrdersManager() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Confirmation modal state for updating status
  const [orderToUpdate, setOrderToUpdate] = useState<{
    order: StoreOrder
    targetStatus: boolean
  } | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await storeAPI.getAdminOrders({
        fulfillment_status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      })
      setOrders(data)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load store orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadOrders()
  }

  const handleOpenConfirm = (order: StoreOrder, targetStatus: boolean) => {
    setOrderToUpdate({ order, targetStatus })
  }

  const handleConfirmStatusChange = async () => {
    if (!orderToUpdate) return

    try {
      setUpdating(true)
      const { order, targetStatus } = orderToUpdate
      const updated = await storeAPI.updateOrderFulfillment(order.id, targetStatus)

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? updated : o))
      )

      toast({
        title: targetStatus ? "Product Given to Student" : "Order Marked as Pending",
        description: targetStatus
          ? `Order #${order.order_number} marked as handed over to ${order.student_name}.`
          : `Order #${order.order_number} marked as pending handover.`,
      })
      setOrderToUpdate(null)
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update fulfillment status",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#FFB70F]" />
            Store Orders & Handover
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track student gear purchases, view student information, and update "Given to Student" handover status.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by order #, student name, email, phone, or product title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Handover</SelectItem>
                  <SelectItem value="given">Given to Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline" className="shrink-0 w-full md:w-auto">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F] mb-3" />
          <p className="text-sm font-medium">Loading store orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card className="border border-dashed border-gray-300 py-16 text-center">
          <div className="max-w-sm mx-auto space-y-3">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto" />
            <h3 className="font-semibold text-gray-800 text-lg">No Orders Found</h3>
            <p className="text-sm text-gray-500">
              {search || statusFilter !== "all"
                ? "No orders match your filter criteria."
                : "No student purchases have been made yet."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isGiven = order.given_to_student
            const firstItem = order.items?.[0]
            const orderDate = order.created_at
              ? new Date(order.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A"

            return (
              <Card
                key={order.id}
                className={`border transition-all duration-200 hover:shadow-sm ${
                  isGiven ? "border-gray-200 bg-white" : "border-amber-200/80 bg-amber-50/20"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    {/* Order ID & Date */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {order.order_number}
                        </span>
                        <Badge
                          variant={isGiven ? "default" : "secondary"}
                          className={`text-xs font-semibold ${
                            isGiven
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {isGiven ? (
                            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1 inline" />
                          )}
                          {isGiven ? "Given to Student" : "Pending Handover"}
                        </Badge>

                        <Badge variant="outline" className="text-xs uppercase text-gray-600">
                          {order.payment_method} • {order.payment_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Placed on {orderDate}
                      </p>
                    </div>

                    {/* Action Button to update handover status */}
                    <div className="shrink-0 flex items-center gap-3">
                      {isGiven ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-700 font-medium">
                            Handed over {order.given_at ? `on ${new Date(order.given_at).toLocaleDateString()}` : ""}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenConfirm(order, false)}
                            className="text-xs text-gray-600 hover:text-red-600"
                          >
                            Mark Pending
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenConfirm(order, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Mark as Given to Student
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Body: Product Info + Student Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4">
                    {/* Product Details (Cols 1-7) */}
                    <div className="md:col-span-7 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Purchased Items ({order.items?.length || 0})
                      </p>
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                        >
                          <div className="w-14 h-14 bg-white rounded border flex items-center justify-center p-1 shrink-0 overflow-hidden">
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
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {item.title}
                            </h4>
                            <p className="text-xs text-gray-500">
                              Category: {item.category_name || "General"}
                            </p>
                            <p className="text-xs font-medium text-gray-700 mt-0.5">
                              Qty: {item.quantity} × ₹{item.final_price?.toLocaleString("en-IN")}
                              {item.offer_percentage > 0 && (
                                <span className="text-[10px] text-red-600 ml-1.5 font-bold">
                                  ({item.offer_percentage}% off)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-gray-900 text-sm">
                              ₹{(item.final_price * item.quantity).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center text-sm font-bold text-gray-900 px-1 pt-1">
                        <span>Total Paid:</span>
                        <span className="text-base text-[#FFB70F]">
                          ₹{order.total_amount?.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Student Information (Cols 8-12) */}
                    <div className="md:col-span-5 bg-gray-50/80 rounded-lg p-3.5 border border-gray-100 space-y-2.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        Student Information
                      </p>
                      <div className="space-y-1.5 text-xs text-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">
                            {order.student_name}
                          </span>
                        </div>
                        {order.student_email && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{order.student_email}</span>
                          </div>
                        )}
                        {order.student_phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{order.student_phone}</span>
                          </div>
                        )}
                        {order.branch_name && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>Branch: {order.branch_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirmation Popup Dialog */}
      <Dialog
        open={!!orderToUpdate}
        onOpenChange={(open) => !open && setOrderToUpdate(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              {orderToUpdate?.targetStatus ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Confirm Handover to Student
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Mark Handover as Pending
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {orderToUpdate && (
            <div className="py-2 space-y-3 text-sm text-gray-600">
              {orderToUpdate.targetStatus ? (
                <>
                  <p>
                    Are you sure you want to mark this gear as{" "}
                    <span className="font-semibold text-emerald-700">
                      Given to Student
                    </span>
                    ?
                  </p>
                  <div className="p-3 bg-gray-50 rounded-lg border text-xs space-y-1">
                    <p>
                      <strong className="text-gray-800">Student:</strong>{" "}
                      {orderToUpdate.order.student_name}
                    </p>
                    <p>
                      <strong className="text-gray-800">Item:</strong>{" "}
                      {orderToUpdate.order.items?.[0]?.title} (Qty:{" "}
                      {orderToUpdate.order.items?.[0]?.quantity})
                    </p>
                    <p>
                      <strong className="text-gray-800">Order #:</strong>{" "}
                      {orderToUpdate.order.order_number}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    This confirms the product has been physically handed over to the student at the branch.
                  </p>
                </>
              ) : (
                <p>
                  Are you sure you want to revert order{" "}
                  <span className="font-semibold text-gray-900">
                    #{orderToUpdate.order.order_number}
                  </span>{" "}
                  back to <span className="font-semibold text-amber-700">Pending Handover</span>?
                </p>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setOrderToUpdate(null)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              disabled={updating}
              className={
                orderToUpdate?.targetStatus
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  : "bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              }
            >
              {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {orderToUpdate?.targetStatus ? "Yes, Mark as Given" : "Yes, Mark as Pending"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

