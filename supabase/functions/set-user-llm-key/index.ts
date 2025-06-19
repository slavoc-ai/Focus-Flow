import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface SetKeyRequest {
  apiKey: string
  provider: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔑 Edge Function: set-user-llm-key started')
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with service role for profile updates
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    console.log('👤 User authenticated:', user.id)

    // Parse request body
    const { apiKey, provider }: SetKeyRequest = await req.json()

    if (!apiKey || !provider) {
      throw new Error('Missing apiKey or provider')
    }

    console.log('🔑 Received API key for provider:', provider)

    // For MVP, we'll use a simple encryption method
    // In production, you should use proper encryption like pg_sodium or Supabase Vault
    const encryptedKey = btoa(apiKey) // Simple base64 encoding for demo
    
    // Store the encrypted key in the user's profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        encrypted_llm_api_key: encryptedKey,
        llm_provider: provider,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      throw new Error(`Failed to save API key: ${updateError.message}`)
    }

    console.log('✅ API key saved successfully for user:', user.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'API key saved successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error in set-user-llm-key:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})