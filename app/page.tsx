'use client'

import { Dashboard } from '@/components/layout/Dashboard'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function Home() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
