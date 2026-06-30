import { createContext, useContext } from 'react'
import { AdminAuth } from './useAdminAuth'

// Page-scoped: only the authenticated dashboard tree is wrapped in the provider.
export const AdminAuthContext = createContext<AdminAuth | null>(null)

export function useAdminContext(): AdminAuth {
  const ctx = useContext(AdminAuthContext)
  if (ctx === null) throw new Error('useAdminContext must be used within AdminAuthContext')
  return ctx
}
