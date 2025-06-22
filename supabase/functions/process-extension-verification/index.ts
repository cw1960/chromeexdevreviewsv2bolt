import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ProcessExtensionVerificationRequest {
  extensionId: string
  status: 'verified' | 'rejected'
  rejection_reason?: string | null
}

// Email templates
const createApprovalEmail = (extensionName: string, userName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Extension Approved</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2196f3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Extension Approved!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Great news! Your extension "${extensionName}" has been approved and is now verified in our system.</p>
      <p>You can now submit it to the review queue to start receiving authentic reviews from our developer community.</p>
      <p><a href="https://chromeexdev.reviews/extensions" class="button">Manage Extensions</a></p>
      <p>Best regards,<br>The ChromeExDev.reviews Team</p>
    </div>
  </div>
</body>
</html>
`

const createRejectionEmail = (extensionName: string, userName: string, reason: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Extension Review Required</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f44336; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { display: inline-block; background: #2196f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    .reason { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Extension Needs Review</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>Your extension "${extensionName}" requires some adjustments before it can be approved.</p>
      <div class="reason">
        <strong>Reason:</strong> ${reason}
      </div>
      <p>Please make the necessary changes and resubmit your extension for review.</p>
      <p><a href="https://chromeexdev.reviews/extensions" class="button">Edit Extension</a></p>
      <p>Best regards,<br>The ChromeExDev.reviews Team</p>
    </div>
  </div>
</body>
</html>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { extensionId, status, rejection_reason }: ProcessExtensionVerificationRequest = await req.json()

    if (!extensionId || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Extension ID and status are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (status === 'rejected' && !rejection_reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rejection reason is required for rejected status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing extension verification for ID: ${extensionId}, Status: ${status}`)

    // Fetch extension and owner details
    const { data: extension, error: fetchExtensionError } = await supabase
      .from('extensions')
      .select(`
        id, name, owner_id, status,
        owner:users(id, name, email)
      `)
      .eq('id', extensionId)
      .single()

    if (fetchExtensionError || !extension) {
      console.error('Error fetching extension or extension not found:', fetchExtensionError)
      return new Response(
        JSON.stringify({ success: false, error: 'Extension not found or could not be fetched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Update extension status
    const { error: updateError } = await supabase
      .from('extensions')
      .update({
        status: status,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        admin_verified: status === 'verified'
      })
      .eq('id', extensionId)

    if (updateError) {
      console.error('Error updating extension status:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Extension ${status === 'verified' ? 'approved' : 'rejected'} successfully.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-extension-verification function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})