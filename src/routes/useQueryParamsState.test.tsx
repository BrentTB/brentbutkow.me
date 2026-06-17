import { describe, it, expect } from 'vitest'
import { ReactNode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useQueryParamsState } from './useQueryParamsState'

const DEFAULTS = { location: 'us', category: '', group: 'category' }

const wrapperFor =
  (entry: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  )

// Pair the hook with the live location so tests can assert the actual query string written.
const useProbe = () => ({ ...useQueryParamsState(DEFAULTS), search: useLocation().search })

describe('useQueryParamsState', () => {
  it('returns defaults when no params are present', () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperFor('/') })
    expect(result.current.values).toEqual(DEFAULTS)
  })

  it('reads values from the URL, falling back to defaults for absent params', () => {
    const { result } = renderHook(useProbe, {
      wrapper: wrapperFor('/?location=uk&category=allergen'),
    })
    expect(result.current.values).toEqual({
      location: 'uk',
      category: 'allergen',
      group: 'category',
    })
  })

  it('patch writes active params and omits values at their default', () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperFor('/') })
    act(() => result.current.patch({ location: 'uk', category: 'allergen' }))
    expect(result.current.values).toMatchObject({ location: 'uk', category: 'allergen' })
    const params = new URLSearchParams(result.current.search)
    expect(params.get('location')).toBe('uk')
    expect(params.get('category')).toBe('allergen')
    expect(params.has('group')).toBe(false) // unchanged default is never written
  })

  it('patch back to default or empty removes the param', () => {
    const { result } = renderHook(useProbe, {
      wrapper: wrapperFor('/?location=uk&category=allergen'),
    })
    act(() => result.current.patch({ location: 'us', category: '' }))
    expect(result.current.values).toEqual(DEFAULTS)
    expect(result.current.search).toBe('')
  })

  it('reset clears managed params but preserves unrelated ones', () => {
    const { result } = renderHook(useProbe, {
      wrapper: wrapperFor('/?location=uk&category=allergen&tab=feed'),
    })
    act(() => result.current.reset())
    const params = new URLSearchParams(result.current.search)
    expect(params.has('location')).toBe(false)
    expect(params.has('category')).toBe(false)
    expect(params.get('tab')).toBe('feed')
    expect(result.current.values).toEqual(DEFAULTS)
  })

  it('patch preserves unrelated existing params', () => {
    const { result } = renderHook(useProbe, { wrapper: wrapperFor('/?tab=feed') })
    act(() => result.current.patch({ location: 'uk' }))
    const params = new URLSearchParams(result.current.search)
    expect(params.get('tab')).toBe('feed')
    expect(params.get('location')).toBe('uk')
  })
})
