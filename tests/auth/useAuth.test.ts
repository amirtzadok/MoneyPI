import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../../src/auth/useAuth'
import { AuthProvider } from '../../src/auth/AuthContext'
import React from 'react'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  React.createElement(AuthProvider, null, children)
)

test('initial state: not logged in', () => {
  const { result } = renderHook(() => useAuth(), { wrapper })
  expect(result.current.isLoggedIn).toBe(false)
  expect(result.current.accessToken).toBeNull()
  expect(result.current.user).toBeNull()
})

test('logout clears token and user', () => {
  const { result } = renderHook(() => useAuth(), { wrapper })
  act(() => {
    result.current.logout()
  })
  expect(result.current.isLoggedIn).toBe(false)
  expect(result.current.accessToken).toBeNull()
})
