"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { type User, type UserRole, users } from "@/src/data/mock"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback((email: string, role: UserRole) => {
    // Find existing user or create mock user
    const existingUser = users.find((u) => u.email === email)
    if (existingUser) {
      setUser({ ...existingUser, role })
    } else {
      setUser({
        email,
        name: role === "productor" ? "Productor Demo" : "Comprador Demo",
        role,
      })
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
