import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AssignReviewsRequest {
  max_assignments?: number
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

    const { max_assignments = 10 }: AssignReviewsRequest = await req.json().catch(() => ({}))

    console.log('Starting review assignment process...')

    // 1. Get extensions that need review assignments (FIFO order)
    const { data: extensionsNeedingReview, error: extensionsError } = await supabase
      .from('extensions')
      .select('*')
      .eq('status', 'pending_verification')
      .order('submitted_to_queue_at', { ascending: true }) // FIFO: First in, first out
      .limit(max_assignments)

    if (extensionsError) {
      console.error('Error fetching extensions:', extensionsError)
      throw extensionsError
    }

    if (!extensionsNeedingReview || extensionsNeedingReview.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No extensions currently need review assignments',
          assignments_created: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`Found ${extensionsNeedingReview.length} extensions needing review`)

    let totalAssignmentsCreated = 0

    // Process each extension
    for (const extension of extensionsNeedingReview) {
      try {
        console.log(`Processing extension: ${extension.name} (ID: ${extension.id})`)

        // 2. Find qualified reviewers for this extension
        const { data: qualifiedReviewers, error: reviewersError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('has_completed_qualification', true)
          .neq('id', extension.owner_id) // Can't review own extension

        if (reviewersError) {
          console.error('Error fetching reviewers:', reviewersError)
          continue
        }

        if (!qualifiedReviewers || qualifiedReviewers.length === 0) {
          console.log('No qualified reviewers available')
          continue
        }

        // 3. Filter out reviewers who have already reviewed extensions from this owner
        const { data: existingRelationships, error: relationshipsError } = await supabase
          .from('review_relationships')
          .select('reviewer_id')
          .eq('reviewed_owner_id', extension.owner_id)

        if (relationshipsError) {
          console.error('Error fetching review relationships:', relationshipsError)
          continue
        }

        const excludedReviewerIds = existingRelationships?.map(r => r.reviewer_id) || []
        const availableReviewers = qualifiedReviewers.filter(
          reviewer => !excludedReviewerIds.includes(reviewer.id)
        )

        if (availableReviewers.length === 0) {
          console.log(`No available reviewers for extension ${extension.name} (all have reviewed this owner before)`)
          continue
        }

        // 4. Filter out reviewers who already have active assignments
        const { data: activeAssignments, error: activeError } = await supabase
          .from('review_assignments')
          .select('reviewer_id')
          .eq('status', 'assigned')

        if (activeError) {
          console.error('Error fetching active assignments:', activeError)
          continue
        }

        const busyReviewerIds = activeAssignments?.map(a => a.reviewer_id) || []
        const freeReviewers = availableReviewers.filter(
          reviewer => !busyReviewerIds.includes(reviewer.id)
        )

        if (freeReviewers.length === 0) {
          console.log(`No free reviewers available for extension ${extension.name}`)
          continue
        }

        // 5. Randomly select a reviewer from available free reviewers
        const selectedReviewer = freeReviewers[Math.floor(Math.random() * freeReviewers.length)]
        console.log(`Selected reviewer: ${selectedReviewer.name} for extension: ${extension.name}`)

        // 6. Create assignment batch
        const { data: batch, error: batchError } = await supabase
          .from('assignment_batches')
          .insert({
            reviewer_id: selectedReviewer.id,
            assignment_type: 'single',
            status: 'active'
          })
          .select()
          .single()

        if (batchError) {
          console.error('Error creating assignment batch:', batchError)
          continue
        }

        // 7. Generate unique assignment number
        const { data: assignmentCount, error: countError } = await supabase
          .from('review_assignments')
          .select('assignment_number')
          .order('assignment_number', { ascending: false })
          .limit(1)

        if (countError) {
          console.error('Error getting assignment count:', countError)
          continue
        }

        const nextAssignmentNumber = (assignmentCount?.[0]?.assignment_number || 0) + 1

        // 8. Create review assignment
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 7) // 7 days to complete

        const { data: assignment, error: assignmentError } = await supabase
          .from('review_assignments')
          .insert({
            batch_id: batch.id,
            extension_id: extension.id,
            reviewer_id: selectedReviewer.id,
            assignment_number: nextAssignmentNumber,
            due_at: dueDate.toISOString(),
            status: 'assigned'
          })
          .select()
          .single()

        if (assignmentError) {
          console.error('Error creating review assignment:', assignmentError)
          // Clean up the batch if assignment creation failed
          await supabase
            .from('assignment_batches')
            .delete()
            .eq('id', batch.id)
          continue
        }

        // 9. Update extension status to 'assigned'
        const { error: extensionUpdateError } = await supabase
          .from('extensions')
          .update({ status: 'assigned' })
          .eq('id', extension.id)

        if (extensionUpdateError) {
          console.error('Error updating extension status:', extensionUpdateError)
          // Clean up assignment and batch if extension update failed
          await supabase
            .from('review_assignments')
            .delete()
            .eq('id', assignment.id)
          await supabase
            .from('assignment_batches')
            .delete()
            .eq('id', batch.id)
          continue
        }

        console.log(`Successfully created assignment #${nextAssignmentNumber} for extension ${extension.name}`)
        totalAssignmentsCreated++

      } catch (error) {
        console.error(`Error processing extension ${extension.name}:`, error)
        continue
      }
    }

    console.log(`Review assignment process completed. Created ${totalAssignmentsCreated} assignments.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully created ${totalAssignmentsCreated} review assignments`,
        assignments_created: totalAssignmentsCreated,
        extensions_processed: extensionsNeedingReview.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in assign-reviews function:', error)
    
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