"use client"

import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface TabItem {
  label: string
  value: string
  active: boolean
  onClick: () => void
}

interface TableCardProps {
  title: string
  tabs?: TabItem[]
  filters?: React.ReactNode
  children: React.ReactNode
  pagination?: React.ReactNode
}

export default function TableCard({ title, tabs, filters, children, pagination }: TableCardProps) {
  return (
    <Card className="lg:col-span-2 shadow-md rounded-2xl min-w-0 overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        {tabs && tabs.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:gap-4">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                className={`min-h-[44px] sm:min-h-[40px] ${tab.active ? "rounded-md px-4 " : "rounded-md px-4 bg-gray-100 text-gray-700"}`}
                onClick={tab.onClick}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="font-semibold text-base sm:text-lg text-[#4F5077]">{title}</h3>
            {filters}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {filters && tabs && <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">{filters}</div>}
        {children}
        {pagination}
      </CardContent>
    </Card>
  )
}
