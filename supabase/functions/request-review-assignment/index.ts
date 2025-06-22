import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestAssignmentRequest {
  user_id: string
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

    const { user_id }: RequestAssignmentRequest = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User ID is required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Processing assignment request for user:', user_id)

    // 1. Verify user is qualified and doesn't have too many active assignments
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, has_completed_qualification')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    if (!user.has_completed_qualification) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User must complete qualification before requesting assignments' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 2. Check if user already has active assignments (limit to 2 active assignments)
    const { data: activeAssignments, error: activeError } = await supabase
      .from('review_assignments')
      .select('id')
      .eq('reviewer_id', user_id)
      .eq('status', 'assigned')

    if (activeError) {
      console.error('Error checking active assignments:', activeError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check active assignments' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (activeAssignments && activeAssignments.length >= 1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You already have an active assignment. Please complete your current review before requesting another.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // 3. Find available extensions for review (FIFO order)
    const { data: availableExtensions, error: extensionsError } = await supabase
      .from('extensions')
      .select('*')
      .eq('status', 'pending_verification')
      .neq('owner_id', user_id) // Can't review own extension
      .order('submitted_to_queue_at', { ascending: true }) // FIFO: First in, first out

    if (extensionsError) {
      console.error('Error fetching available extensions:', extensionsError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch available extensions' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!availableExtensions || availableExtensions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No extensions are currently available for review. Please check back later.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // 4. Filter out extensions from owners the user has already reviewed
    const { data: existingRelationships, error: relationshipsError } = await supabase
      .from('review_relationships')
      .select('reviewed_owner_id')
      .eq('reviewer_id', user_id)

    if (relationshipsError) {
      console.error('Error fetching review relationships:', relationshipsError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to check review relationships' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const excludedOwnerIds = existingRelationships?.map(r => r.reviewed_owner_id) || []
    const eligibleExtensions = availableExtensions.filter(
      ext => !excludedOwnerIds.includes(ext.owner_id)
    )

    if (eligibleExtensions.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No new extensions available for review. You have already reviewed extensions from all available developers.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // 5. Select the first eligible extension (FIFO)
    const selectedExtension = eligibleExtensions[0]
    console.log(`Selected extension: ${selectedExtension.name} for user: ${user.name}`)

    // 6. Create assignment batch
    const { data: batch, error: batchError } = await supabase
      .from('assignment_batches')
      .insert({
        reviewer_id: user_id,
        assignment_type: 'single',
        status: 'active'
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating assignment batch:', batchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create assignment batch' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // 7. Generate unique assignment number
    const { data: assignmentCount, error: countError } = await supabase
      .from('review_assignments')
      .select('assignment_number')
      .order('assignment_number', { ascending: false })
      .limit(1)

    if (countError) {
      console.error('Error getting assignment count:', countError)
      // Clean up the batch
      await supabase
        .from('assignment_batches')
        .delete()
        .eq('id', batch.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate assignment number' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const nextAssignmentNumber = (assignmentCount?.[0]?.assignment_number || 0) + 1

    // 8. Create review assignment
    const dueDate = new Date()
    dueDate.setHours(dueDate.getHours() + 48) // 48 hours to complete

    const { data: assignment, error: assignmentError } = await supabase
      .from('review_assignments')
      .insert({
        batch_id: batch.id,
        extension_id: selectedExtension.id,
        reviewer_id: user_id,
        assignment_number: nextAssignmentNumber,
        due_at: dueDate.toISOString(),
        status: 'assigned'
      })
      .select()
      .single()

    if (assignmentError) {
      console.error('Error creating review assignment:', assignmentError)
      // Clean up the batch
      await supabase
        .from('assignment_batches')
        .delete()
        .eq('id', batch.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create review assignment' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // 9. Update extension status to 'assigned'
    const { error: extensionUpdateError } = await supabase
      .from('extensions')
      .update({ status: 'assigned' })
      .eq('id', selectedExtension.id)

    if (extensionUpdateError) {
      console.error('Error updating extension status:', extensionUpdateError)
      // Clean up assignment and batch
      await supabase
        .from('review_assignments')
        .delete()
        .eq('id', assignment.id)
      await supabase
        .from('assignment_batches')
        .delete()
        .eq('id', batch.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update extension status' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log(`Successfully created assignment #${nextAssignmentNumber} for extension ${selectedExtension.name}`)

    // Trigger MailerLite event for review assignment
    try {
      console.log('📧 Triggering MailerLite review assignment event...')
      const { error: mailerLiteError } = await supabase.functions.invoke('mailerlite-integration', {
        body: {
          user_email: user.email,
          event_type: 'review_assigned',
          custom_data: {
            extension_name: selectedExtension.name,
            assignment_number: nextAssignmentNumber,
            due_date: dueDate.toISOString(),
            assignment_date: new Date().toISOString()
          }
        }
      })
      
      if (mailerLiteError) {
        console.error('❌ MailerLite error:', mailerLiteError)
      } else {
        console.log('✅ MailerLite review assignment event triggered')
      }
    } catch (mailerLiteError) {
      console.error('❌ Failed to trigger MailerLite assignment event:', mailerLiteError)
      // Don't fail the assignment process if MailerLite fails
    }

    // Trigger MailerLite event for review assignment
    try {
      await supabase.functions.invoke('mailerlite-integration', {
        body: {
          user_email: user.email,
          event_type: 'review_assigned',
          custom_data: {
            extension_name: selectedExtension.name,
            assignment_number: nextAssignmentNumber,
            due_date: dueDate.toISOString(),
            assignment_date: new Date().toISOString()
          }
        }
      })
      console.log('✅ MailerLite review assignment event triggered')
    } catch (mailerLiteError) {
      console.error('Failed to trigger MailerLite assignment event:', mailerLiteError)
      // Don't fail the assignment process if MailerLite fails
    }
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Assignment created successfully! You have been assigned to review "${selectedExtension.name}".`,
        assignment: {
          id: assignment.id,
          assignment_number: nextAssignmentNumber,
          extension_name: selectedExtension.name,
          due_date: dueDate.toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in request-review-assignment function:', {
      message: error.message,
      name: error.name
    })
    
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