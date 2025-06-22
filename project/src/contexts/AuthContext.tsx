import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use useRef to store the ongoing profile fetch promise
  const profileFetchPromiseRef = useRef<Promise<void> | null>(null)

  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    console.log("🔍 Starting DIRECT database profile fetch for user:", userId)
    
    // If there's already a profile fetch in progress for this user, return that promise
    if (profileFetchPromiseRef.current) {
      console.log("⏳ Profile fetch already in progress, waiting for existing promise...")
      return profileFetchPromiseRef.current
    }

    // Set loading to true at the start of the fetch process
    setLoading(true)
    
    const fetchProfileDirect = async (attempt: number = 1): Promise<void> => {
      const maxAttempts = 2
      const baseDelay = 500 // Reduced delay
      
      try {
        console.log(`📡 Direct database query attempt ${attempt}/${maxAttempts} for user:`, userId)
        console.log(`⏰ Starting direct Supabase query at:`, new Date().toISOString())
        
        // DIRECT DATABASE ACCESS - NO EDGE FUNCTION
        const { data: user, error } = await withTimeout(
          supabase
            .from('users')
            .select('id, email, name, credit_balance, has_completed_qualification, onboarding_complete, role, subscription_status, exchanges_this_month, last_exchange_reset_date, created_at')
            .eq('id', userId)
            .single(),
          3000 // Fast 3-second timeout
        )

        console.log(`⏰ Direct Supabase query completed at:`, new Date().toISOString())

        if (error) {
          console.error(`❌ Direct database error (attempt ${attempt}):`, {
            code: error.code,
            message: error.message,
            details: error.details
          })
          
          // Handle specific error cases
          if (error.code === 'PGRST116') {
            console.log('ℹ️ User profile not found (PGRST116) - this is expected for new users')
            setProfile(null)
            return
          }
          
          // Retry on network/timeout errors
          const isRetryableError = error.message?.includes('timeout') || 
                                 error.message?.includes('network') ||
                                 error.message?.includes('fetch') ||
                                 error.code === 'PGRST301' // Connection error
          
          if (attempt < maxAttempts && isRetryableError) {
            const delay = baseDelay * attempt
            console.log(`⏳ Retrying direct database query in ${delay}ms due to ${error.message}`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchProfileDirect(attempt + 1)
          } else {
            console.error('💥 Max retries reached for direct database query')
            setProfile(null)
            return
          }
        }

        console.log("✅ Direct database profile fetch successful:", user ? 'profile found' : 'no profile found')
        
        if (user) {
          console.log("📋 Profile data:", {
            id: user.id,
            email: user.email,
            name: user.name,
            credit_balance: user.credit_balance,
            has_completed_qualification: user.has_completed_qualification,
            onboarding_complete: user.onboarding_complete
          })
        }
        
        setProfile(user)
        
      } catch (error) {
        console.error(`💥 Direct database query threw error (attempt ${attempt}):`, {
          name: error?.name,
          message: error?.message,
        })
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * attempt
          console.log(`⏳ Retrying direct database query in ${delay}ms... (attempt ${attempt + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return fetchProfileDirect(attempt + 1)
        } else {
          console.error('💥 Max retries reached for direct database query')
          setProfile(null)
        }
      }
    }

    // Create and store the promise
    const fetchPromise = fetchProfileDirect().finally(() => {
      // Clear the promise reference and set loading to false when done
      profileFetchPromiseRef.current = null
      setLoading(false)
      console.log("🏁 Direct database profile fetch process completed")
    })
    
    profileFetchPromiseRef.current = fetchPromise
    return fetchPromise
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error)
        setLoading(false)
        return
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }).catch((error) => {
      console.error('Error in getSession:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })
    if (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      console.error('Update profile error:', error)
      throw error
    }

    // Refresh profile
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}