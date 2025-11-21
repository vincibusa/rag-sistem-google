'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  accessToken: string | null
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user || null)
        setAccessToken(session?.access_token || null)
      } catch (err) {
        console.error('Error checking auth:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setAccessToken(session?.access_token || null)
    })

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed'
      setError(message)
      throw err
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (data.session) {
        setUser(data.session.user)
        setAccessToken(data.session.access_token)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const signOut = async () => {
    try {
      setError(null)
      await supabase.auth.signOut()
      setUser(null)
      setAccessToken(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw err
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, accessToken, signUp, signIn, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
