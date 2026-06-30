import { createElement, ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AdminAuthContext, useAdminContext } from './useAdminContext'
import { AdminAuth, AdminAuthStatus } from './useAdminAuth'

const stubAuth: AdminAuth = {
  token: 'tok',
  status: AdminAuthStatus.idle,
  login: async () => {},
  logout: () => {},
  request: async () => ({}) as never,
}

describe('useAdminContext', () => {
  it('throws when used outside the provider', () => {
    expect(() => renderHook(() => useAdminContext())).toThrow(/within AdminAuthContext/)
  })

  it('returns the provided auth value inside the provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(AdminAuthContext.Provider, { value: stubAuth }, children)
    const { result } = renderHook(() => useAdminContext(), { wrapper })
    expect(result.current.token).toBe('tok')
  })
})
