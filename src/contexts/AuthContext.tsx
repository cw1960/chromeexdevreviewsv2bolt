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
  updateCookiePreferences: (preference: 'accepted' | 'declined') => Promise<void>
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
    console.log("🔍 Starting profile fetch for user:", userId)
    
    // If there's already a profile fetch in progress for this user, return that promise
    if (profileFetchPromiseRef.current) {
      console.log("⏳ Profile fetch already in progress, waiting for existing promise...")
      return profileFetchPromiseRef.current
    }

    // Set loading to true at the start of the fetch process
    setLoading(true)
    
    const fetchProfileWithRetry = async (attempt: number = 1): Promise<void> => {
      const maxAttempts = 2 // Reduced attempts
      const baseDelay = 500 // Reduced delay
      
      try {
        console.log(`📡 Profile fetch attempt ${attempt}/${maxAttempts} for user:`, userId)
        console.log(`⏰ Starting direct database query at:`, new Date().toISOString())
        
        // CRITICAL FIX: Use Edge Function instead of direct database query to avoid RLS overhead
        const { data, error } = await withTimeout(
          supabase.functions.invoke('fetch-user-profile-for-auth', {
            body: { userId: userId }
          }),
          5000 // 5 second timeout for Edge Function
        )

        console.log(`⏰ Database query completed at:`, new Date().toISOString())

        if (error) {
          console.error(`❌ Edge Function error (attempt ${attempt}):`, {
            message: error.message,
            code: error.code || 'EDGE_FUNCTION_ERROR'
          })
          
          // For other errors, only retry if it's a retryable error
          const isRetryableError = error.message?.includes('timeout') || 
                                 error.message?.includes('network') ||
                                 error.message?.includes('connection') ||
                                 error.message?.includes('fetch')
          
          if (attempt < maxAttempts && isRetryableError) {
            const delay = baseDelay * attempt
            console.log(`⏳ Retrying profile fetch in ${delay}ms... (attempt ${attempt + 1}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return fetchProfileWithRetry(attempt + 1)
          } else {
            // Don't set profile to null on non-retryable errors
            console.error('💥 Non-retryable error or max retries reached - keeping existing profile state')
            return
          }
        }

        // Handle Edge Function response
        if (!data?.success) {
          const errorMsg = data?.error || 'Unknown error from Edge Function'
          console.error(`❌ Edge Function returned error: ${errorMsg}`)
          
          // If user not found, this is expected for new users
          if (errorMsg.includes('not found') || errorMsg.includes('PGRST116')) {
            console.log('ℹ️ User profile not found - this is expected for new users')
            setProfile(null)
            return
          }
          throw new Error(errorMsg)
        }

        // CRITICAL FIX: Extract the user profile from the nested data structure
        const profileData = data.data?.user || null
        console.log("✅ Profile fetch successful:", profileData ? 'profile found' : 'no profile found')
        
        if (profileData) {
          console.log("📋 Profile data:", {
            id: profileData.id,
            email: profileData.email,
            name: profileData.name,
            credit_balance: profileData.credit_balance,
            has_completed_qualification: profileData.has_completed_qualification,
            onboarding_complete: profileData.onboarding_complete,
            cookie_preferences: profileData.cookie_preferences,
            cookie_consent_timestamp: profileData.cookie_consent_timestamp
          })
        }
        
        // Update profile state with fetched data
        setProfile(profileData)
        
      } catch (error) {
        console.error(`💥 Profile fetch threw error (attempt ${attempt}):`, {
          name: error?.name,
          message: error?.message,
        })
        
        // Check if it's a timeout error
        if (error?.message?.includes('timed out')) {
          console.error('⏰ Profile fetch timeout detected')
        }
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * attempt
          console.log(`⏳ Retrying profile fetch in ${delay}ms... (attempt ${attempt + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return fetchProfileWithRetry(attempt + 1)
        } else {
          // Don't set profile to null on errors - keep existing state
          console.error('💥 Max retries reached - keeping existing profile state')
          return
        }
      }
    }

    // Create and store the promise
    const fetchPromise = fetchProfileWithRetry().finally(() => {
      // Clear the promise reference and set loading to false when done
      profileFetchPromiseRef.current = null
      setLoading(false)
      console.log("🏁 Profile fetch process completed")
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
          // Only clear profile when user is actually signed out
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

  const updateCookiePreferences = async (preference: 'accepted' | 'declined') => {
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('users')
      .update({ 
        cookie_preferences: preference,
        cookie_consent_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id)

    if (error) {
      console.error('Update cookie preferences error:', error)
      throw error
    }

    // Refresh profile to get updated data
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
        refreshProfile,
        updateCookiePreferences
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