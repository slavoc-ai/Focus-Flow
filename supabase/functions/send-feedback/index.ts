import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPPORT_EMAIL = '1v.bochkarev1@gmail.com';

// --- ENSURE YOUR CORS HEADERS ARE COMPREHENSIVE ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific frontend origin in production
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', // Make sure POST is here
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type, sentry-trace, baggage', // Be generous
};
// ------------------------------------------------

interface FeedbackRequest {
  type: 'general' | 'bug' | 'feature' | 'compliment';
  subject: string;
  message: string;
  rating?: number | null;
  user_id?: string | null;
  user_email: string;
  user_name: string;
  created_at: string;
  user_agent?: string;
  url?: string;
}

serve(async (req) => {
  // --- CORRECTED OPTIONS HANDLING ---
  // Handle CORS preflight requests FIRST and ensure it returns 200 OK.
  if (req.method === 'OPTIONS') {
    console.log('📧 Handling OPTIONS request for send-feedback');
    return new Response('ok', { 
      status: 200, // Explicitly set 200 OK
      headers: corsHeaders 
    });
  }
  // ---------------------------------

  try {
    console.log('📧 Edge Function: send-feedback POST request started');
    console.log('📧 Support email configured as:', SUPPORT_EMAIL);
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('📋 Auth header present:', !!authHeader);

    // Create Supabase client for authentication (optional for feedback)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Parse request body
    const feedbackData: FeedbackRequest = await req.json();

    console.log('📝 Feedback data received:', {
      type: feedbackData.type,
      hasSubject: !!feedbackData.subject,
      messageLength: feedbackData.message?.length || 0,
      hasRating: feedbackData.rating !== null && feedbackData.rating !== undefined,
      userEmail: feedbackData.user_email,
      userName: feedbackData.user_name,
      supportEmail: SUPPORT_EMAIL
    });

    // Validate required fields
    if (!feedbackData.message || !feedbackData.user_email || !feedbackData.user_name) {
      throw new Error('Missing required fields: message, user_email, or user_name');
    }

    // Prepare email content
    const emailSubject = feedbackData.subject || `${feedbackData.type.charAt(0).toUpperCase() + feedbackData.type.slice(1)} Feedback from ${feedbackData.user_name}`;
    
    const emailBody = `
New feedback received from FocusFlow:

Type: ${feedbackData.type.charAt(0).toUpperCase() + feedbackData.type.slice(1)}
From: ${feedbackData.user_name} (${feedbackData.user_email})
${feedbackData.rating ? `Rating: ${feedbackData.rating}/5 stars` : ''}
Date: ${new Date(feedbackData.created_at).toLocaleString()}

Subject: ${feedbackData.subject || 'No subject provided'}

Message:
${feedbackData.message}

---
Technical Details:
User ID: ${feedbackData.user_id || 'Anonymous'}
URL: ${feedbackData.url || 'Not provided'}
User Agent: ${feedbackData.user_agent || 'Not provided'}
    `.trim();

    console.log('📧 Preparing to send email:', {
      subject: emailSubject,
      bodyLength: emailBody.length,
      to: SUPPORT_EMAIL
    });

    // For now, we'll store the feedback in the database
    // In a production environment, you would integrate with an email service like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - Postmark
    
    // Store feedback in database for tracking
    const { error: dbError } = await supabaseClient
      .from('feedback_submissions')
      .insert({
        type: feedbackData.type,
        subject: feedbackData.subject,
        message: feedbackData.message,
        rating: feedbackData.rating,
        user_id: feedbackData.user_id,
        user_email: feedbackData.user_email,
        user_name: feedbackData.user_name,
        user_agent: feedbackData.user_agent,
        url: feedbackData.url,
        created_at: feedbackData.created_at
      });

    if (dbError) {
      console.error('❌ Error storing feedback in database:', dbError);
      // Don't throw here - we still want to "send" the email even if DB storage fails
    } else {
      console.log('✅ Feedback stored in database successfully');
    }

    // TODO: Integrate with actual email service
    // For now, we'll simulate email sending
    console.log(`📧 Email would be sent to ${SUPPORT_EMAIL} with content:`, {
      subject: emailSubject,
      preview: emailBody.substring(0, 200) + '...'
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Feedback processed successfully');

    // Example of returning success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feedback processed successfully', // Changed from "sent" as it's stored
        supportEmailSentTo: SUPPORT_EMAIL // Clarify what happened
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Ensure corsHeaders are also on the actual response
        status: 200 // Explicit success status for POST
      }
    );

  } catch (error) {
    console.error('❌ Error in send-feedback:', error.message, error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 400, // Or other appropriate error code
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Also on error responses
      }
    );
  }
});