import { Suspense } from "react"
import BranchManagerResetPasswordForm from "./BranchManagerResetPasswordForm"

export default function BranchManagerResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BranchManagerResetPasswordForm />
    </Suspense>
  )
}
