import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface TestKeyRequest {
  apiKey?: string
  provider?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🧪 Edge Function: test-user-llm-key started')
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    // Parse request body to get API key and provider
    const requestBody: TestKeyRequest = await req.json().catch(() => ({}))
    let { apiKey, provider } = requestBody

    // If no API key provided in request, fetch from user profile
    if (!apiKey) {
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('encrypted_llm_api_key, llm_provider')
        .eq('id', user.id)
        .single()

      if (profileError || !profile?.encrypted_llm_api_key) {
        throw new Error('No API key found in profile')
      }

      // Decrypt the stored key (simple base64 decode for demo)
      apiKey = atob(profile.encrypted_llm_api_key)
      provider = profile.llm_provider || 'gemini'
    }

    if (!apiKey || !provider) {
      throw new Error('Missing API key or provider')
    }

    console.log('🧪 Testing API key for provider:', provider)

    // Test the API key based on provider
    let testResult = false
    let errorMessage = ''

    if (provider === 'gemini') {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: 'Test'
                }]
              }],
              generationConfig: {
                maxOutputTokens: 10,
              }
            })
          }
        )

        if (response.ok) {
          testResult = true
          console.log('✅ API key test successful')
        } else {
          const errorData = await response.text()
          console.error('❌ API key test failed:', response.status, errorData)
          errorMessage = `API test failed: ${response.status}`
        }
      } catch (error) {
        console.error('❌ API key test error:', error)
        errorMessage = 'Network error during API test'
      }
    } else {
      errorMessage = `Provider ${provider} not supported for testing`
    }

    return new Response(
      JSON.stringify({
        success: testResult,
        provider,
        message: testResult ? 'API key is valid' : errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Error in test-user-llm-key:', error.message)
    
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