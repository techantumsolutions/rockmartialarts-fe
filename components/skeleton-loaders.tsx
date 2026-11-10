import React from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Generic skeleton component
export const SkeletonBox = ({ 
  width = "100%", 
  height = "20px", 
  className = "" 
}: { 
  width?: string
  height?: string
  className?: string 
}) => (
  <Skeleton 
    className={`bg-gray-200 animate-pulse rounded ${className}`} 
    style={{ width, height }} 
  />
)

// Report category card skeleton
export const ReportCategorySkeleton = () => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <div className="flex items-center space-x-3">
        <SkeletonBox width="24px" height="24px" className="rounded-full" />
        <SkeletonBox width="60%" height="20px" />
      </div>
    </CardHeader>
    <CardContent className="flex-1 flex flex-col">
      <div className="space-y-2 mb-4 flex-1">
        <SkeletonBox width="100%" height="16px" />
        <SkeletonBox width="80%" height="16px" />
        <SkeletonBox width="60%" height="16px" />
      </div>
      <div className="flex items-center justify-between mt-auto">
        <SkeletonBox width="40%" height="14px" />
        <SkeletonBox width="80px" height="32px" className="rounded-md" />
      </div>
    </CardContent>
  </Card>
)

// Grid of category skeletons
export const ReportCategoriesGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {Array.from({ length: count }, (_, index) => (
      <ReportCategorySkeleton key={index} />
    ))}
  </div>
)

// Individual report item skeleton
export const ReportItemSkeleton = () => (
  <Card className="cursor-pointer hover:shadow-lg transition-all duration-200">
    <CardContent className="p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <SkeletonBox width="20px" height="20px" className="rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <SkeletonBox width="90%" height="16px" />
          <SkeletonBox width="60%" height="12px" className="mt-1" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Grid of report item skeletons
export const ReportItemsGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
    {Array.from({ length: count }, (_, index) => (
      <ReportItemSkeleton key={index} />
    ))}
  </div>
)

// Filter section skeleton
export const FilterSectionSkeleton = () => (
  <Card className="mb-6">
    <CardHeader>
      <SkeletonBox width="150px" height="20px" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index}>
            <SkeletonBox width="60px" height="14px" className="mb-1" />
            <SkeletonBox width="100%" height="40px" className="rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <SkeletonBox width="100px" height="40px" className="rounded-md" />
      </div>
    </CardContent>
  </Card>
)

// Page header skeleton
export const PageHeaderSkeleton = () => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <SkeletonBox width="200px" height="32px" className="mb-2" />
      <SkeletonBox width="300px" height="20px" />
    </div>
    <div className="flex space-x-2">
      <SkeletonBox width="80px" height="40px" className="rounded-md" />
      <SkeletonBox width="120px" height="40px" className="rounded-md" />
    </div>
  </div>
)

// Search bar skeleton
export const SearchBarSkeleton = () => (
  <div className="mb-6">
    <div className="relative max-w-md">
      <SkeletonBox width="100%" height="40px" className="rounded-md" />
    </div>
  </div>
)

// Complete page skeleton for reports dashboard
export const ReportsPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Dashboard header would be here */}
    <main className="w-full p-4 lg:px-8 mx-auto">
      <PageHeaderSkeleton />
      <SearchBarSkeleton />
      <ReportCategoriesGridSkeleton />
    </main>
  </div>
)

// Complete page skeleton for category page
export const CategoryPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Dashboard header would be here */}
    <main className="w-full p-4 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <SkeletonBox width="120px" height="40px" className="rounded-md" />
          <div>
            <SkeletonBox width="200px" height="32px" className="mb-2" />
            <SkeletonBox width="300px" height="20px" />
          </div>
        </div>
        <div className="flex space-x-2">
          <SkeletonBox width="80px" height="40px" className="rounded-md" />
          <SkeletonBox width="120px" height="40px" className="rounded-md" />
        </div>
      </div>
      
      <SearchBarSkeleton />
      <ReportItemsGridSkeleton />
      <FilterSectionSkeleton />
    </main>
  </div>
)

// Loading overlay for specific sections
export const LoadingOverlay = ({ 
  message = "Loading...", 
  className = "" 
}: { 
  message?: string
  className?: string 
}) => (
  <div className={`absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 ${className}`}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  </div>
)

// Inline loading spinner
export const InlineLoader = ({ 
  size = "sm", 
  message = "", 
  className = "" 
}: { 
  size?: "sm" | "md" | "lg"
  message?: string
  className?: string 
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  )
}

// Shimmer effect for better loading animation
export const ShimmerEffect = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`} 
       style={{
         animation: 'shimmer 1.5s ease-in-out infinite',
         backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
       }}>
    <style jsx>{`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  </div>
)

// Progressive loading component
export const ProgressiveLoader = ({ 
  steps = ["Loading data...", "Processing...", "Almost done..."],
  currentStep = 0,
  className = ""
}: {
  steps?: string[]
  currentStep?: number
  className?: string
}) => (
  <div className={`text-center ${className}`}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
    <p className="text-sm text-gray-600 mb-2">
      {steps[Math.min(currentStep, steps.length - 1)]}
    </p>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="h-2 rounded-full transition-all duration-300"
        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
      ></div>
    </div>
  </div>
)
