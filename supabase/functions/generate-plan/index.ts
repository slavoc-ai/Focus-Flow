import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// LLM Configuration - Using stable Gemini model with increased token limits
const LLM_CONFIG = {
  MODEL_NAME: 'gemini-2.5-pro-preview-06-05',
  TEMPERATURE: 0.7,
  TOP_K: 40,
  TOP_P: 0.95,
  MAX_OUTPUT_TOKENS: 16384
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

/**
 * Get the effective MIME type for Gemini API compatibility
 * Converts text/markdown to text/plain as per Gemini API requirements
 */
function getEffectiveMimeType(originalMimeType: string, fileName: string): string {
  let effectiveMimeType = originalMimeType || 'application/octet-stream';
  
  if (originalMimeType === 'text/markdown' || fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown')) {
    console.log(`[MIME] Treating markdown file ${fileName} as text/plain for Gemini API compatibility.`);
    effectiveMimeType = 'text/plain';
  }
  
  return effectiveMimeType;
}

/**
 * Server-side validation for supported file types
 */
function validateFileType(mimeType: string, fileName: string): boolean {
  const serverAllowedMimeTypes = [
    'application/pdf',
    'text/plain', // MD will be treated as this
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/wav',
    'video/mp4'
  ];

  let effectiveMimeType = getEffectiveMimeType(mimeType, fileName);
  return serverAllowedMimeTypes.includes(effectiveMimeType);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 Edge Function started - enhanced generate-plan with official Gemini API support');
    console.log('🔧 LLM Configuration:', {
      model: LLM_CONFIG.MODEL_NAME,
      temperature: LLM_CONFIG.TEMPERATURE,
      topK: LLM_CONFIG.TOP_K,
      topP: LLM_CONFIG.TOP_P,
      maxTokens: LLM_CONFIG.MAX_OUTPUT_TOKENS
    });
    console.log('📋 Request method:', req.method);
    console.log('📋 Request URL:', req.url);
    console.log('📋 Content-Type:', req.headers.get('Content-Type'));

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('📋 Auth header present:', !!authHeader);

    let user = null;
    let isAnonymous = false;

    if (!authHeader) {
      console.log('⚠️ No authorization header - request will be rejected');
      throw new Error('No authorization header provided');
    }

    // Create Supabase client for authentication
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get the current user
    const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();

    console.log('👤 User authentication:', {
      hasUser: !!authUser,
      userId: authUser?.id?.substring(0, 8) + '...' || 'none',
      isAnonymous: authUser?.is_anonymous || false,
      userError: userError?.message
    });

    if (userError || !authUser) {
      console.error('❌ Authentication failed:', userError?.message);
      throw new Error('Invalid user token');
    }

    user = authUser;
    isAnonymous = authUser.is_anonymous || false;

    // Parse FormData instead of JSON
    let formData: FormData;
    try {
      formData = await req.formData();
      console.log('✅ Successfully parsed FormData');
    } catch (parseError) {
      console.error('❌ Failed to parse FormData:', parseError.message);
      throw new Error(`Invalid FormData: ${parseError.message}`);
    }

    // Extract text fields from FormData
    const taskDescription = formData.get('taskDescription') as string;
    const timeAllocatedRaw = formData.get('timeAllocated') as string;
    const timeAllocated = timeAllocatedRaw ? parseInt(timeAllocatedRaw) : null;
    const strictTimeAdherence = formData.get('strictTimeAdherence') === 'true' && !!timeAllocated;
    const energyLevel = formData.get('energyLevel') as string;
    const breakdownLevel = (formData.get('breakdownLevel') as string) || 'small';

    // Extract files and document paths
    const documentFiles = formData.getAll('documentFiles') as File[];
    const documentPaths = formData.getAll('documentPaths') as string[];

    console.log('📝 Enhanced request data received:', {
      hasTaskDescription: !!taskDescription,
      taskDescriptionLength: taskDescription?.length,
      timeAllocated: timeAllocated || 'unlimited',
      strictTimeAdherence,
      energyLevel,
      breakdownLevel,
      documentFilesCount: documentFiles.length,
      documentPathsCount: documentPaths.length,
      documentFileNames: documentFiles.map(f => f.name),
      uploadMethod: documentPaths.length > 0 ? 'premium-storage' : 'standard-formdata'
    });

    // Validate required fields
    if (!taskDescription || !energyLevel) {
      const missingFields = [];
      if (!taskDescription) missingFields.push('taskDescription');
      if (!energyLevel) missingFields.push('energyLevel');

      console.error('❌ Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Try to get user's API key from profile (only for authenticated users)
    let apiKey = Deno.env.get('GEMINI_API_KEY'); // Default FocusFlow key
    let usingUserKey = false;

    console.log('🔑 Default API key available:', !!apiKey);
    console.log('🔑 Default API key length:', apiKey?.length || 0);

    // Only try to fetch user API key for authenticated (non-anonymous) users
    if (!isAnonymous) {
      try {
        console.log('🔍 Fetching user API key for authenticated user...');
        
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('encrypted_llm_api_key, llm_provider')
          .eq('id', user.id)
          .single();

        console.log('👤 Profile lookup:', {
          hasProfile: !!profile,
          hasUserApiKey: !!profile?.encrypted_llm_api_key,
          llmProvider: profile?.llm_provider,
          profileError: profileError?.message
        });

        // If user has their own API key, decrypt and use it
        if (profile?.encrypted_llm_api_key && profile?.llm_provider === 'gemini') {
          try {
            // Decrypt the key (simple base64 decode for demo)
            apiKey = atob(profile.encrypted_llm_api_key);
            usingUserKey = true;
            console.log('🔑 Using user API key');
          } catch (decryptError) {
            console.warn('⚠️ Failed to decrypt user API key:', decryptError.message);
            console.log('🔑 Falling back to default API key');
          }
        }
      } catch (error) {
        console.log('⚠️ Profile lookup failed, using default key:', error.message);
      }
    } else {
      console.log('🔧 Anonymous user - using default API key only');
    }

    if (!apiKey) {
      console.error('❌ No API key available (neither default nor user)');
      throw new Error('No API key available for Gemini API. Please set up your Gemini API key following the instructions in GEMINI_API_SETUP.md');
    }

    // Phase 2: Process documents (either from FormData or Storage)
    let fileDataParts: { file_data: { mime_type: string; file_uri: string } }[] = [];

    if (documentPaths.length > 0) {
      // NEW: Premium workflow - download from Storage and upload to Gemini
      console.log('💎 Processing premium documents from Storage...');
      
      // Create service role client for Storage access
      const serviceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      for (const path of documentPaths) {
        console.log(`📥 Downloading file from Storage: ${path}`);
        
        try {
          // Download file from Storage
          const { data: fileData, error: downloadError } = await serviceClient.storage
            .from('premium-uploads')
            .download(path);

          if (downloadError) {
            console.error(`❌ Failed to download ${path}:`, downloadError);
            throw new Error(`Failed to download file from storage: ${downloadError.message}`);
          }

          if (!fileData) {
            throw new Error(`No file data received for ${path}`);
          }

          // Convert to ArrayBuffer
          const fileBuffer = await fileData.arrayBuffer();
          const fileName = path.split('/').pop() || 'document';
          
          // Get effective MIME type (handles markdown conversion)
          const originalMimeType = fileData.type || 'application/octet-stream';
          const effectiveMimeType = getEffectiveMimeType(originalMimeType, fileName);
          
          // Validate file type
          if (!validateFileType(originalMimeType, fileName)) {
            throw new Error(`Unsupported file type: ${originalMimeType} for file ${fileName}`);
          }
          
          console.log(`📤 Uploading ${fileName} to Gemini File API...`, {
            originalMimeType,
            effectiveMimeType,
            size: fileBuffer.byteLength
          });

          // Upload to Gemini File API with effective MIME type
          const uploadResponse = await fetch(
            `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': effectiveMimeType, // Use effective MIME type
              },
              body: fileBuffer
            }
          );

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`❌ Gemini upload failed for ${fileName}:`, errorText);
            throw new Error(`Failed to upload file to Gemini: ${uploadResponse.status} ${uploadResponse.statusText}`);
          }

          const uploadData = await uploadResponse.json();
          console.log(`✅ Successfully uploaded ${fileName} to Gemini. URI: ${uploadData.file?.uri}`);

          if (!uploadData.file?.uri) {
            throw new Error(`Invalid Gemini upload response for ${fileName}`);
          }

          fileDataParts.push({
            file_data: {
              mime_type: uploadData.file.mimeType || effectiveMimeType,
              file_uri: uploadData.file.uri,
            },
          });

        } catch (error) {
          console.error(`❌ Error processing premium file ${path}:`, error);
          throw new Error(`Failed to process premium file: ${error.message}`);
        }
      }
      
      console.log('✅ All premium files processed successfully');
      
    } else if (documentFiles.length > 0) {
      // Standard workflow - direct upload to Gemini
      console.log('📤 Processing standard documents via direct upload...');

      for (const file of documentFiles) {
        console.log(`📤 Uploading ${file.name} directly to Gemini...`);
        
        // Get effective MIME type (handles markdown conversion)
        const effectiveMimeType = getEffectiveMimeType(file.type, file.name);
        
        // Validate file type
        if (!validateFileType(file.type, file.name)) {
          throw new Error(`Unsupported file type: ${file.type} for file ${file.name}`);
        }
        
        console.log(`🔧 MIME type handling for ${file.name}:`, {
          originalType: file.type,
          effectiveType: effectiveMimeType
        });
        
        const fileBuffer = await file.arrayBuffer();

        const uploadResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': effectiveMimeType, // Use effective MIME type
            },
            body: fileBuffer
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`❌ Upload failed for ${file.name}:`, errorText);
          throw new Error(`Failed to upload file '${file.name}': ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        const uploadData = await uploadResponse.json();
        console.log(`✅ Successfully uploaded ${file.name}. URI: ${uploadData.file?.uri}`);

        if (!uploadData.file?.uri) {
          throw new Error(`Invalid upload response for ${file.name}`);
        }

        fileDataParts.push({
          file_data: {
            mime_type: uploadData.file.mimeType || effectiveMimeType,
            file_uri: uploadData.file.uri,
          },
        });
      }
      
      console.log('✅ All standard files uploaded successfully');
    }

    // Phase 3: Construct enhanced system prompt with dynamic instruction blocks
    
    // 1. Build dynamic instruction blocks based on user input
    let granularityInstruction = '';
    switch (breakdownLevel) {
        case 'small':
            granularityInstruction = 'Each sub-task should be small and actionable, taking roughly 10-15 minutes.';
            break;
        case 'micro':
            granularityInstruction = 'Each sub-task must be a tiny micro-action, taking only 1-3 minutes. Be extremely detailed.';
            break;
        default: // 'focused'
            granularityInstruction = 'Each sub-task should be a focused block of work, taking roughly 20-30 minutes.';
            break;
    }

    let energyInstruction = '';
    switch (energyLevel) {
        case 'low':
            energyInstruction = 'The user has LOW energy. The plan must start with the easiest, most preparatory tasks to build momentum. Defer complex tasks.';
            break;
        case 'high':
            energyInstruction = 'The user has HIGH energy. The plan should prioritize the most challenging, creative, or important tasks first.';
            break;
        default: // 'medium'
            energyInstruction = 'The user has MEDIUM energy. The plan should be balanced.';
            break;
    }

    let timeInstruction = '';
    if (timeAllocated) {
        if (strictTimeAdherence) {
            timeInstruction = `The plan MUST strictly fit within the total ${timeAllocated} minutes. If not possible, plan only the most critical parts and include a 'time_warning'.`;
        } else {
            timeInstruction = `Use the total ${timeAllocated} minutes as a soft guideline for the plan's total duration.`;
        }
    } else {
        timeInstruction = 'There is no total time limit. Create the most logical and complete plan required to achieve the goal.';
    }

    const fileNamesForPrompt = [...documentFiles.map(f => f.name), ...documentPaths.map(p => p.split('/').pop() || 'document')].join(', ');

    // 2. Assemble the final, detailed system prompt
    const systemPrompt = `You are an expert productivity coach. Your task is to create a detailed, actionable plan based on the user's goal and provided documents.

**User Request:**
- **Main Goal:** "${taskDescription}"
${fileNamesForPrompt ? `- **Analyze Documents:** ${fileNamesForPrompt}` : ''}

**User Preferences & Constraints:**
- **Task Granularity:** ${granularityInstruction}
- **Energy Level Strategy:** ${energyInstruction}
- **Time Constraint:** ${timeInstruction}

**Output Instructions:**
You MUST respond with a valid JSON object ONLY. Do not include any markdown, comments, or explanatory text outside the JSON structure.

The JSON object must have these exact top-level keys:
1.  **"project_title"**: A short, descriptive title for the overall project (5-10 words max). This title should be clear, professional, and summarize the goal.
2.  **"sub_tasks"**: An array of sub-task objects.
3.  **"time_warning"**: An optional string for time warnings (or null if not needed).

Each object inside the "sub_tasks" array MUST have the following four keys:
- **"title"**: (string) A short, bold, scannable headline for the task.
- **"action"**: (string) An immediate, verb-first call to action.
- **"details"**: (string) The longer explanation with examples and context.
- **"estimated_minutes_per_sub_task"**: (integer) The estimated time in minutes for the sub-task.

Example of the complete and required JSON output structure:
{
  "project_title": "Q3 Marketing Campaign Strategy",
  "time_warning": null,
  "sub_tasks": [
    {
      "title": "Initial Brainstorm & Research",
      "action": "Open a blank document and start a mind map.",
      "details": "Spend 15 minutes writing down every idea related to the campaign theme. Simultaneously, research competitor campaigns from the last year.",
      "estimated_minutes_per_sub_task": 25
    }
  ]
}
`;

    // The parts of the final request to Gemini
    const promptParts = [
      { text: systemPrompt },
      ...fileDataParts, // Spread the array of file data objects
    ];

    console.log('📤 Making enhanced request to Gemini API...');
    console.log('📤 Using model:', LLM_CONFIG.MODEL_NAME);
    console.log('📤 Prompt parts count:', promptParts.length);
    console.log('📤 Files referenced:', fileDataParts.length);
    console.log('📤 Breakdown level:', breakdownLevel);
    console.log('📤 User type:', isAnonymous ? 'anonymous' : 'authenticated');
    console.log('📤 Using API key:', usingUserKey ? 'user' : 'default');
    console.log('📤 Upload method:', documentPaths.length > 0 ? 'premium-storage' : 'standard-formdata');
    console.log('📤 Supported file types enforced:', 'PDF, TXT, MD→TXT, PNG, JPG, WEBP, MP3, WAV, MP4');

    // Execute the generateContent API call
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${LLM_CONFIG.MODEL_NAME}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: promptParts
            }
          ],
          generationConfig: {
            temperature: LLM_CONFIG.TEMPERATURE,
            topK: LLM_CONFIG.TOP_K,
            topP: LLM_CONFIG.TOP_P,
            maxOutputTokens: LLM_CONFIG.MAX_OUTPUT_TOKENS
          }
        })
      }
    );

    console.log('📥 Gemini API response status:', geminiResponse.status);
    console.log('📥 Gemini API response ok:', geminiResponse.ok);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error response:', errorText);
      console.error('❌ Gemini API status:', geminiResponse.status);
      console.error('❌ Gemini API status text:', geminiResponse.statusText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('📥 Gemini API response structure:', {
      hasCandidates: !!geminiData.candidates,
      candidatesLength: geminiData.candidates?.length,
      hasFirstCandidate: !!geminiData.candidates?.[0],
      hasContent: !!geminiData.candidates?.[0]?.content,
      hasParts: !!geminiData.candidates?.[0]?.content?.parts,
      hasText: !!geminiData.candidates?.[0]?.content?.parts?.[0]?.text,
      finishReason: geminiData.candidates?.[0]?.finishReason,
      usageMetadata: geminiData.usageMetadata
    });

    // Handle response validation (same as before)
    if (!geminiData.candidates || !geminiData.candidates[0]) {
      console.error('❌ No candidates in Gemini response:', JSON.stringify(geminiData, null, 2));
      throw new Error('No candidates returned from Gemini API');
    }

    const candidate = geminiData.candidates[0];
    
    // Check for finish reason issues
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('⚠️ Response was truncated due to max tokens limit');
      throw new Error('Response was truncated. Please try with a shorter task description or reduce the time allocation.');
    }
    
    if (candidate.finishReason === 'SAFETY') {
      console.warn('⚠️ Response blocked due to safety filters');
      throw new Error('Request was blocked by safety filters. Please rephrase your task description.');
    }

    // Check if we have the expected content structure
    if (!candidate.content?.parts?.[0]?.text) {
      console.error('❌ Invalid Gemini response structure:', JSON.stringify(geminiData, null, 2));
      
      if (candidate.content?.role === 'model' && !candidate.content.parts) {
        throw new Error('Gemini API returned an incomplete response. This might be due to content filtering or token limits. Please try rephrasing your task or reducing the complexity.');
      }
      
      throw new Error('Invalid response structure from Gemini API');
    }

    // Parse the JSON response from Gemini
    const responseText = candidate.content.parts[0].text;
    console.log('📄 Raw Gemini response text:', responseText.substring(0, 500) + '...');

    let parsedResponse;

    try {
      // Clean the response text (remove markdown code blocks if present)
      const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🧹 Cleaned response text:', cleanedText.substring(0, 500) + '...');

      parsedResponse = JSON.parse(cleanedText);
      console.log('✅ Successfully parsed enhanced JSON response');
    } catch (parseError) {
      console.error('❌ Failed to parse Gemini response as JSON:', parseError.message);
      console.error('❌ Raw response text:', responseText);
      
      // Fallback: Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted and parsed JSON from response');
        } catch (fallbackError) {
          throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
        }
      } else {
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
    }

    // Validate the enhanced response structure
    if (!parsedResponse.sub_tasks || !Array.isArray(parsedResponse.sub_tasks)) {
      console.error('❌ Invalid response structure - missing or invalid sub_tasks:', parsedResponse);
      throw new Error('Invalid response structure from AI - missing sub_tasks array');
    }

    // Validate that each sub-task has the required enhanced structure
    for (let i = 0; i < parsedResponse.sub_tasks.length; i++) {
      const task = parsedResponse.sub_tasks[i];
      if (!task.title || !task.action || !task.details) {
        console.warn(`⚠️ Sub-task ${i + 1} missing enhanced fields, using fallbacks:`, task);
        // Provide fallbacks for backward compatibility
        task.title = task.title || `Task ${i + 1}`;
        task.action = task.action || task.sub_task_description || 'Complete this task';
        task.details = task.details || task.sub_task_description || 'No details provided';
      }
    }

    console.log('✅ Enhanced plan generated successfully with official Gemini API support:', {
      model: LLM_CONFIG.MODEL_NAME,
      projectTitle: parsedResponse.project_title,
      subTasksCount: parsedResponse.sub_tasks.length,
      hasTimeWarning: !!parsedResponse.time_warning,
      breakdownLevel: breakdownLevel,
      usingUserKey,
      userType: isAnonymous ? 'anonymous' : 'authenticated',
      userId: user.id.substring(0, 8) + '...',
      finishReason: candidate.finishReason,
      tokensUsed: geminiData.usageMetadata?.totalTokenCount,
      documentsProcessed: documentFiles.length + documentPaths.length,
      uploadMethod: documentPaths.length > 0 ? 'premium-storage' : 'standard-formdata',
      fileUrisUsed: fileDataParts.map(f => f.file_data.file_uri),
      supportedTypesEnforced: true
    });

    // Return the enhanced plan
    return new Response(JSON.stringify({
      success: true,
      plan: parsedResponse.sub_tasks,
      projectTitle: parsedResponse.project_title, // NEW: AI-generated project title
      timeWarning: parsedResponse.time_warning || null,
      usingUserKey,
      userType: isAnonymous ? 'anonymous' : 'authenticated',
      modelUsed: LLM_CONFIG.MODEL_NAME,
      documentsProcessed: documentFiles.length + documentPaths.length,
      breakdownLevel: breakdownLevel, // NEW: Include breakdown level in response
      uploadMethod: documentPaths.length > 0 ? 'premium-storage' : 'standard-formdata',
      supportedTypesEnforced: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error in enhanced generate-plan function:', error.message);
    console.error('❌ Error stack:', error.stack);

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'An unexpected error occurred',
      details: error.stack || 'No stack trace available'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});