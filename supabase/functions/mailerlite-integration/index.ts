import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface MailerLiteRequest {
  user_email: string
  event_type: string
  custom_data?: Record<string, any>
  subject?: string
  html_content?: string
}

interface MailerLiteSubscriber {
  email: string
  fields?: Record<string, string | number>
  groups?: string[]
}

serve(async (req) => {
  console.log('🚀 mailerlite-integration function started')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Checking environment variables...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mailerLiteApiKey = Deno.env.get('MAILERLITE_API_KEY')

    if (!mailerLiteApiKey) {
      console.error('MailerLite API key not found in environment variables')
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(key => key.includes('MAILER')))
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'MailerLite API key not configured' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Environment variables check passed')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { 
      user_email, 
      event_type, 
      custom_data = {}, 
      subject, 
      html_content 
    }: MailerLiteRequest = await req.json()

    if (!user_email || !event_type) {
      console.error('❌ Missing required fields:', { user_email: !!user_email, event_type: !!event_type })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User email and event type are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`📧 Processing MailerLite event: ${event_type} for email ending in ...${user_email.slice(-10)}`)

    // Prepare subscriber data with custom fields
    const subscriberData: MailerLiteSubscriber = {
      email: user_email,
      fields: {
        event_type: event_type,
        last_event_date: new Date().toISOString(),
        ...custom_data
      }
    }

    // Map event types to MailerLite groups
    const eventGroupMapping: Record<string, string> = {
      'user_signed_up': 'new_signups',
      'review_completed': 'review_completed',
      'review_assigned': 'review_assigned',
      'credit_earned': 'credit_earned',
      'subscription_upgraded': 'premium_users',
      'qualification_completed': 'qualified_reviewers'
    }

    // Add subscriber to appropriate group based on event type
    const groupName = eventGroupMapping[event_type]
    if (groupName) {
      subscriberData.groups = [groupName]
    }

    // Create or update subscriber in MailerLite
    console.log('📡 Making request to MailerLite API...')
    const mailerLiteResponse = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mailerLiteApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(subscriberData)
    })

    console.log('📨 MailerLite API response:', {
      status: mailerLiteResponse.status,
      statusText: mailerLiteResponse.statusText,
      ok: mailerLiteResponse.ok
    })
    const mailerLiteResult = await mailerLiteResponse.json()
    console.log('📋 MailerLite API result:', JSON.stringify(mailerLiteResult, null, 2))
    const success = mailerLiteResponse.ok

    // Log the email attempt in our database
    await supabase
      .from('email_logs')
      .insert({
        to_email: user_email,
        type: event_type,
        status: success ? 'sent' : 'failed',
        subject: subject || `Event: ${event_type}`,
        body: html_content || JSON.stringify(custom_data),
        error_message: success ? null : JSON.stringify(mailerLiteResult),
      })

    if (!success) {
      console.error('❌ MailerLite API error:', {
        status: mailerLiteResponse.status,
        statusText: mailerLiteResponse.statusText,
        result: mailerLiteResult
      })
      
      // If subscriber already exists, try to update instead
      if (mailerLiteResult.message && mailerLiteResult.message.includes('already exists')) {
        console.log('Subscriber exists, attempting to update...')
        
        // Get subscriber ID first
        const getSubscriberResponse = await fetch(`https://connect.mailerlite.com/api/subscribers/${user_email}`, {
          headers: {
            'Authorization': `Bearer ${mailerLiteApiKey}`,
            'Accept': 'application/json'
          }
        })

        if (getSubscriberResponse.ok) {
          console.log('📋 Found existing subscriber, updating...')
          const subscriberInfo = await getSubscriberResponse.json()
          
          // Update subscriber
          const updateResponse = await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriberInfo.data.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${mailerLiteApiKey}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              fields: subscriberData.fields
            })
          })

          if (updateResponse.ok) {
            console.log('✅ Subscriber updated successfully')
            
            // If we have a group to add them to, do that separately
            if (groupName) {
              await addSubscriberToGroup(mailerLiteApiKey, subscriberInfo.data.id, groupName)
            }

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Subscriber updated successfully',
                mailerlite_response: await updateResponse.json()
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              }
            )
          }
        }
      } else {
        console.error('❌ MailerLite API error details:', {
          message: mailerLiteResult.message,
          errors: mailerLiteResult.errors
        })
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process MailerLite request',
          details: mailerLiteResult
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('✅ MailerLite request processed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'MailerLite event processed successfully',
        mailerlite_response: mailerLiteResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in mailerlite-integration function:', {
      message: error.message,
      name: error.name,
      stack: error.stack
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

// Helper function to add subscriber to a group
async function addSubscriberToGroup(apiKey: string, subscriberId: string, groupName: string) {
  try {
    console.log(`🏷️ Adding subscriber to group: ${groupName}`)
    // First, get or create the group
    const groupsResponse = await fetch('https://connect.mailerlite.com/api/groups', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })

    if (groupsResponse.ok) {
      const groupsData = await groupsResponse.json()
      let targetGroup = groupsData.data.find((group: any) => group.name === groupName)

      // Create group if it doesn't exist
      if (!targetGroup) {
        const createGroupResponse = await fetch('https://connect.mailerlite.com/api/groups', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ name: groupName })
        })

        if (createGroupResponse.ok) {
          targetGroup = await createGroupResponse.json()
          targetGroup = targetGroup.data
          console.log(`✅ Created new group: ${groupName}`)
        }
      }

      // Add subscriber to group
      if (targetGroup) {
        await fetch(`https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${targetGroup.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        })
        console.log(`✅ Added subscriber to group: ${groupName}`)
      }
    }
  } catch (error) {
    console.error('❌ Error adding subscriber to group:', error.message)
  }
}