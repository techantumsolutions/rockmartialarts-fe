import { Suspense } from 'react'
import BranchManagerResetPasswordForm from './BranchManagerResetPasswordForm'

export default function BranchManagerResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-100">Loading...</div>}>
      <BranchManagerResetPasswordForm />
    </Suspense>
  )
}

