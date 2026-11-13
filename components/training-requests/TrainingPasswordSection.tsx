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
}

export function TrainingPasswordSection({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false,
  required = true,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordsMatch = !confirmPassword || password === confirmPassword
  const isTooShort = password.length > 0 && password.length < 6

  return (
    <div className="space-y-4 pt-3 pb-2 border-t border-border/60">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-[#FFB70F]" />
        <span>Create Account Password for Tracking</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Set up a password so you can log in to your training dashboard to track status, view assigned coaches, and submit future requests.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="training_password" className="text-sm font-medium text-foreground">
            Password {required && <span className="text-[#FFB70F]">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="training_password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              disabled={disabled}
              className={`pr-10 border-input bg-background/50 focus-visible:ring-[#FFB70F] ${
                isTooShort ? "border-amber-500" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isTooShort && (
            <p className="text-xs text-amber-600 font-medium">
              Password must be at least 6 characters
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="training_confirm_password" className="text-sm font-medium text-foreground">
            Confirm Password {required && <span className="text-[#FFB70F]">*</span>}
          </Label>
          <div className="relative">
            <Input
              id="training_confirm_password"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              disabled={disabled}
              className={`pr-10 border-input bg-background/50 focus-visible:ring-[#FFB70F] ${
                !passwordsMatch ? "border-red-500" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!passwordsMatch && (
            <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
          )}
        </div>
      </div>
    </div>
  )
}

