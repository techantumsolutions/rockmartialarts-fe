"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TokenManager } from "@/lib/tokenManager"
import AdminProductsManager from "@/components/store/AdminProductsManager"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"

export default function StoreProductsPage() {
  const params = useParams()
  const router = useRouter()
  const adminType = (params?.adminType as string) || ""
  const [isDenied, setIsDenied] = useState(false)

  useEffect(() => {
    // Check if partner admin
    const user = TokenManager.getUser()
    const isPartner =
      adminType === "partner-admin" ||
      adminType?.startsWith("partner") ||
      user?.role === "partner_super_admin" ||
      Boolean(user?.partner_org_id)

    if (isPartner) {
      setIsDenied(true)
      router.replace(`/${adminType || "partner-admin"}/dashboard`)
    }
  }, [adminType, router])

  if (isDenied) {
    return (
      <div className="p-8 max-w-md mx-auto">
        <Card className="border-red-200 bg-red-50 text-center py-8">
          <CardContent className="space-y-3">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-red-800">Access Restricted</h2>
            <p className="text-sm text-red-600">
              Store Management is exclusively available to Rock Martial Arts Super Admins.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <AdminProductsManager />
}

