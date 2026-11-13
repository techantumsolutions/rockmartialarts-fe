"use client"

import React, { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  password: string
  confirmPassword: string
  onPasswordChange: (val: string) => void
  onConfirmPasswordChange: (val: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
  fieldClass?: string
}

export function TrainingPasswordSection({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false,
  required = true,
  className = "",
  fieldClass = "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]",
}: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordsMatch = !confirmPassword || password === confirmPassword
  const isTooShort = password.length > 0 && password.length < 6

  return (
    <div className={`space-y-4 pt-4 pb-2 border-t border-gray-800 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFB70F]">
        <Lock className="h-4 w-4" />
        <span>Create Account Password for Tracking</span>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Set up a password so you can log in to your training dashboard to track status, view assigned coaches, and submit future requests.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="training_password" className="text-gray-300 text-sm font-medium">
            Password {required && <span className="text-[#FFB70F]">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="training_password"
              type={showPassword ? "text" : "password"}
              placeholder="Create account password (min. 6 characters)"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              disabled={disabled}
              className={`h-10 pr-10 ${fieldClass} ${
                isTooShort ? "border-amber-500 focus-visible:ring-amber-500" : ""
              }`}
              style={{
                color: "#ffffff",
                backgroundColor: "rgba(3, 7, 18, 0.6)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isTooShort && (
            <p className="text-xs text-amber-400 font-medium">
              Password must be at least 6 characters
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="training_confirm_password" className="text-gray-300 text-sm font-medium">
            Confirm Password {required && <span className="text-[#FFB70F]">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="training_confirm_password"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter password to confirm"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              disabled={disabled}
              className={`h-10 pr-10 ${fieldClass} ${
                !passwordsMatch ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
              style={{
                color: "#ffffff",
                backgroundColor: "rgba(3, 7, 18, 0.6)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="text-xs text-red-400 font-medium">Passwords do not match</p>
          )}
        </div>
      </div>
    </div>
  )
}
