import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReviewSubmissionRequest {
  assignment_id: string
  review_text: string
  rating: number
  chrome_store_proof: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { assignment_id, review_text, rating, chrome_store_proof }: ReviewSubmissionRequest = await req.json()

    // Validate input
    if (!assignment_id || !review_text || !rating || !chrome_store_proof) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (review_text.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Review text must be at least 50 characters' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Rating must be between 1 and 5' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get the assignment details including extension and reviewer info
    const { data: assignment, error: assignmentError } = await supabase
      .from('review_assignments')
      .select(`
        *,
        extension:extensions(id, owner_id, name),
        reviewer:users(id, name)
      `)
      .eq('id', assignment_id)
      .eq('status', 'assigned')
      .single()

    if (assignmentError || !assignment) {
      console.error('Assignment fetch error:', assignmentError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Assignment not found or already processed' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Start a transaction-like process
    console.log('Processing review submission for assignment:', assignment_id)

    // 1. Update the review assignment to 'approved' status
    const { error: updateError } = await supabase
      .from('review_assignments')
      .update({
        review_text,
        rating,
        chrome_store_proof,
        status: 'approved',
        submitted_at: new Date().toISOString()
      })
      .eq('id', assignment_id)

    if (updateError) {
      console.error('Error updating assignment:', updateError)
      throw updateError
    }

    // 2. Award credit to the reviewer
    const { error: creditError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: assignment.reviewer_id,
        amount: 1,
        type: 'earned',
        description: `Review completed for ${assignment.extension.name}`
      })

    if (creditError) {
      console.error('Error awarding credit:', creditError)
      throw creditError
    }

    // 3. Create review relationship to prevent future direct exchanges
    const { error: relationshipError } = await supabase
      .from('review_relationships')
      .insert({
        reviewer_id: assignment.reviewer_id,
        reviewed_owner_id: assignment.extension.owner_id,
        extension_id: assignment.extension_id
      })

    if (relationshipError) {
      // This might fail if the relationship already exists, which is fine
      console.log('Review relationship insert result:', relationshipError)
    }

    // 4. Check if this completes a batch
    const { data: batchAssignments, error: batchError } = await supabase
      .from('review_assignments')
      .select('status')
      .eq('batch_id', assignment.batch_id)

    if (!batchError && batchAssignments) {
      const allApproved = batchAssignments.every(a => a.status === 'approved')
      
      if (allApproved) {
        // Mark the batch as completed
        const { error: batchUpdateError } = await supabase
          .from('assignment_batches')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            credits_earned: batchAssignments.length // 1 credit per assignment
          })
          .eq('id', assignment.batch_id)

        if (batchUpdateError) {
          console.error('Error updating batch status:', batchUpdateError)
        }
      }
    }

    console.log('Review processing completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Review submitted and approved successfully',
        credits_earned: 1
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing review submission:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})