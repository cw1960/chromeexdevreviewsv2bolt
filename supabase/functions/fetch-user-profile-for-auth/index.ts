const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FetchUserProfileRequest {
  userId: string
}

// Simplified timeout helper with better error handling
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

Deno.serve(async (req) => {
  const startTime = Date.now()
  console.log('🚀 fetch-user-profile-for-auth function started')
  
  // Handle CORS preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Checking environment variables...')
    // Get environment variables - fail fast if missing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('❌ Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error: Missing environment variables' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('✅ Environment variables check passed')
    // Import Supabase client
    const { createClient } = await import('npm:@supabase/supabase-js@2')

    // Extract and validate JWT quickly
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid Authorization header')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing or invalid Authorization header' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    console.log('🔐 JWT token extracted, length:', jwt.length)

    // Parse request body
    const { userId }: FetchUserProfileRequest = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create clients
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT with shorter timeout
    const { data: { user: authUser }, error: authError } = await withTimeout(
      supabaseAuth.auth.getUser(jwt),
      3000, // Reduced to 3 seconds
      'JWT verification'
    )
    
    if (authError || !authUser) {
      console.log('❌ JWT verification failed:', authError?.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or expired JWT token' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('✅ JWT verified successfully for user ID length:', authUser.id.length)

    // Security check
    if (authUser.id !== userId) {
      console.log('🚫 Security violation: User attempted to fetch different profile')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: You can only fetch your own profile data' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log('🔍 Starting database query for user profile')

    // Fetch user profile with shorter timeout and minimal fields
    const { data: user, error: userError } = await withTimeout(
      supabaseService
        .from('users')
        .select('id, email, name, credit_balance, has_completed_qualification, onboarding_complete, role, subscription_status, exchanges_this_month, last_exchange_reset_date')
        .eq('id', userId)
        .single(),
      3000, // Reduced to 3 seconds
      'Database query'
    )

    if (userError) {
      console.log('❌ User profile fetch error:', userError.message)
      // Handle specific error cases
      if (userError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { user: null },
            message: 'User profile not found'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch user profile',
          details: userError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const totalDuration = Date.now() - startTime
    console.log('✅ User profile fetched successfully in', totalDuration, 'ms')

    return new Response(
      JSON.stringify({ 
        success: true,
        data: { user: user || null },
        performance: {
          totalDuration
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('💥 Error in fetch-user-profile-for-auth function:', {
      message: error.message,
      name: error.name,
      executionTime: totalDuration
    })
    
    // Handle timeout errors specifically
    if (error.message && error.message.includes('timeout')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Request timeout - please try again',
          errorType: 'TimeoutError',
          executionTime: totalDuration
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 408, // Request Timeout
        }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        errorType: error.name || 'UnknownError',
        executionTime: totalDuration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})