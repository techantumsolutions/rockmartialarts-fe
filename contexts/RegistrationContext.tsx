"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export type FamilyStudentLine = {
  id: string
  firstName: string
  lastName: string
  dob: string
  gender: string
  relationship: string
  branch_id: string
  branch_name: string
  category_id: string
  category_name: string
  course_id: string
  course_name: string
  duration: string
  duration_name: string
  duration_months: number
  batch_ref: string
  batch_display_label: string
  course_price: number
  amount: number
}

export function emptyFamilyStudent(partial?: Partial<FamilyStudentLine>): FamilyStudentLine {
  return {
    id: partial?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    firstName: '',
    lastName: '',
    dob: '',
    gender: '',
    relationship: 'self',
    branch_id: '',
    branch_name: '',
    category_id: '',
    category_name: '',
    course_id: '',
    course_name: '',
    duration: '',
    duration_name: '',
    duration_months: 0,
    batch_ref: '',
    batch_display_label: '',
    course_price: 0,
    amount: 0,
    ...partial,
  }
}

interface RegistrationData {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  mobile: string
  gender: string
  dob: string
  
  // Course Information (IDs)
  category_id: string
  course_id: string
  duration: string
  /** Branch course_schedule batch (batch_ref from public API / payment-info) */
  batch_ref: string
  /** Human-readable batch label for payment summary (optional) */
  batch_display_label: string

  // Course Display Info
  course_name: string
  category_name: string
  course_price: number
  course_currency: string
  duration_name: string
  duration_months: number
  
  // Branch Information (IDs)
  location_id: string
  branch_id: string
  
  // Branch Display Info
  branch_name: string
  selected_location: string
  
  // Payment Information
  paymentMethod: string
  paymentId: string
  paymentStatus: string
  orderId: string
  amount: number
  cardNumber: string
  expiryDate: string
  cvv: string
  nameOnCard: string
  
  // Additional fields
  password?: string
  biometric_id?: string
  branch_details?: {
    name: string
    address: { area?: string; city: string; state: string }
  } | null

  /** JWT from POST /api/reg-checkout/verify-otp (phone verified before Pay Now). */
  phoneVerificationToken?: string

  /** single = existing 1-student flow; family = extra students step + summed checkout */
  accountType: 'single' | 'family'
  familyStudents: FamilyStudentLine[]
}

interface RegistrationContextType {
  registrationData: RegistrationData
  /** False until localStorage has been read on the client (avoid treating empty token as missing during hydration). */
  registrationStorageReady: boolean
  updateRegistrationData: (data: Partial<RegistrationData>) => void
  clearRegistrationData: () => void
  getApiPayload: () => any
  getEnrollmentData: () => {
    course_id: string
    branch_id: string
    category_id: string
    duration: string
  } | null
}

const defaultRegistrationData: RegistrationData = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  gender: '',
  dob: '',
  category_id: '',
  course_id: '',
  duration: '',
  batch_ref: '',
  batch_display_label: '',
  course_name: '',
  category_name: '',
  course_price: 0,
  course_currency: 'INR',
  duration_name: '',
  duration_months: 0,
  location_id: '',
  branch_id: '',
  branch_name: '',
  selected_location: '',
  paymentMethod: '',
  paymentId: '',
  paymentStatus: '',
  orderId: '',
  amount: 0,
  cardNumber: '',
  expiryDate: '',
  cvv: '',
  nameOnCard: '',
  phoneVerificationToken: '',
  accountType: 'single',
  familyStudents: [],
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined)

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registrationData, setRegistrationData] = useState<RegistrationData>(defaultRegistrationData)
  const [registrationStorageReady, setRegistrationStorageReady] = useState(false)

  // Load data from localStorage on mount (must complete before payment page treats missing token as redirect)
  useEffect(() => {
    try {
      const savedData = localStorage.getItem("registrationData")
      if (savedData) {
        setRegistrationData({ ...defaultRegistrationData, ...JSON.parse(savedData) })
      }
    } catch (error) {
      console.error("Error parsing saved registration data:", error)
    } finally {
      setRegistrationStorageReady(true)
    }
  }, [])

  const updateRegistrationData = (data: Partial<RegistrationData>) => {
    setRegistrationData((prev) => {
      const updatedData = { ...prev, ...data }
      try {
        localStorage.setItem("registrationData", JSON.stringify(updatedData))
      } catch (e) {
        console.error("Error saving registration data:", e)
      }
      return updatedData
    })
  }

  const clearRegistrationData = () => {
    setRegistrationData(defaultRegistrationData)
    localStorage.removeItem("registrationData")
  }

  const getApiPayload = () => {
    // Separate user data from course enrollment data
    return {
      email: registrationData.email,
      password: registrationData.password || undefined,
      phone: registrationData.mobile,
      first_name: registrationData.firstName,
      last_name: registrationData.lastName,
      full_name: `${registrationData.firstName} ${registrationData.lastName}`,
      role: "student",
      biometric_id: registrationData.biometric_id || undefined,
      is_active: true,
      date_of_birth: registrationData.dob || undefined,
      gender: registrationData.gender || undefined,
      // DEPRECATED: Keep for backward compatibility during migration
      course: registrationData.category_id && registrationData.course_id && registrationData.duration ? {
        category_id: String(registrationData.category_id),
        course_id: String(registrationData.course_id),
        duration: String(registrationData.duration)
      } : undefined,
      branch: registrationData.location_id && registrationData.branch_id ? {
        location_id: String(registrationData.location_id),
        branch_id: String(registrationData.branch_id)
      } : undefined
    }
  }

  // Get enrollment data separately for payment processing
  const getEnrollmentData = () => {
    if (!registrationData.category_id || !registrationData.course_id || !registrationData.branch_id) {
      return null
    }

    return {
      course_id: String(registrationData.course_id),
      branch_id: String(registrationData.branch_id),
      category_id: String(registrationData.category_id),
      duration: String(registrationData.duration)
    }
  }

  return (
    <RegistrationContext.Provider value={{
      registrationData,
      registrationStorageReady,
      updateRegistrationData,
      clearRegistrationData,
      getApiPayload,
      getEnrollmentData
    }}>
      {children}
    </RegistrationContext.Provider>
  )
}

export const useRegistration = () => {
  const context = useContext(RegistrationContext)
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider')
  }
  return context
}
