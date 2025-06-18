import React, { createContext, useContext, useEffect, useState } from 'react'
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
      setTimeout(() => reject(new Error('Query timed out')), timeoutMs)
    )
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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
  }, [])

  const fetchProfile = async (userId: string) => {
    console.log("fetchProfile started for user:", userId)
    
    // First, let's test the connection with a simple query
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('Basic connection test failed:', testError)
        if (testError.message.includes('JWT')) {
          console.error('Authentication token issue detected')
        }
        if (testError.message.includes('policy')) {
          console.error('Row Level Security policy issue detected')
        }
      } else {
        console.log('Basic connection test passed')
      }
    } catch (error) {
      console.error('Connection test threw error:', error)
    }

    // Now attempt to fetch the profile with retries
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Profile fetch attempt ${i + 1}/3`)
        
        const { data, error } = await withTimeout(
          supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
          10000 // Increased timeout to 10 seconds
        )

        if (error) {
          console.error(`Profile fetch failed (attempt ${i + 1}/3):`, {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          })
          
          // If it's an auth error, don't retry
          if (error.message.includes('JWT') || error.message.includes('auth')) {
            console.error('Authentication error detected, stopping retries')
            break
          }
          
          // If it's a policy error, don't retry
          if (error.message.includes('policy') || error.message.includes('RLS')) {
            console.error('RLS policy error detected, stopping retries')
            break
          }
          
          if (i < 2) { // Don't wait after the last attempt
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
          }
        } else {
          console.log("Profile fetch successful:", data ? 'profile found' : 'no profile')
          setProfile(data)
          setLoading(false)
          return
        }
      } catch (error) {
        console.error(`Profile fetch threw error (attempt ${i + 1}/3):`, error)
        if (i < 2) { // Don't wait after the last attempt
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
        }
      }
    }
    
    console.error('All profile fetch attempts failed. This could be due to:')
    console.error('1. Missing or incorrect Supabase environment variables')
    console.error('2. RLS policies preventing access to the users table')
    console.error('3. Network connectivity issues')
    console.error('4. Supabase project configuration issues')
    
    setProfile(null)
    setLoading(false)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

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

    // Give new users 1 initial credit for their first extension submission
    if (data.user) {
      try {
        // Wait a moment for the user profile to be created by the trigger
        await new Promise(resolve => setTimeout(resolve, 2000)) // Increased wait time
        
        // Add initial credit transaction
        const { error: creditError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: data.user.id,
            amount: 1,
            type: 'earned',
            description: 'Welcome bonus - first extension submission'
          })

        if (creditError) {
          console.error('Error adding initial credit:', creditError)
        }
      } catch (creditError) {
        console.error('Error processing initial credit:', creditError)
      }
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