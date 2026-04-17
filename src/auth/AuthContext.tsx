import React, { createContext, useState, useCallback } from 'react'

export interface AuthUser {
  email: string
  name: string
  picture: string
}

export interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isLoggedIn: boolean
  setCredential: (token: string, user: AuthUser) => void
  logout: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => sessionStorage.getItem('gAccessToken')
  )
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = sessionStorage.getItem('gUser')
    return raw ? JSON.parse(raw) : null
  })

  const setCredential = useCallback((token: string, u: AuthUser) => {
    sessionStorage.setItem('gAccessToken', token)
    sessionStorage.setItem('gUser', JSON.stringify(u))
    setAccessToken(token)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('gAccessToken')
    sessionStorage.removeItem('gUser')
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      accessToken, user,
      isLoggedIn: !!accessToken,
      setCredential, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
