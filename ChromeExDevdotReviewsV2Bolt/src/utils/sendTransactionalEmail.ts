import { supabase } from '../lib/supabase'

interface EmailParams {
  to: string
  subject: string
  html: string
  type: string
}

export async function sendTransactionalEmail(params: EmailParams) {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params
    })

    if (error) {
      console.error('Error sending email:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

// Email templates
export const createApprovalEmail = (extensionName: string, userName: string) => `
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
      <p><a href="${window.location.origin}/extensions" class="button">Manage Extensions</a></p>
      <p>Best regards,<br>The ChromeExDev.reviews Team</p>
    </div>
  </div>
</body>
</html>
`

export const createRejectionEmail = (extensionName: string, userName: string, reason: string) => `
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
      <p><a href="${window.location.origin}/extensions" class="button">Edit Extension</a></p>
      <p>Best regards,<br>The ChromeExDev.reviews Team</p>
    </div>
  </div>
</body>
</html>
`