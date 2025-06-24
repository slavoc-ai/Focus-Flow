import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// LLM Configuration for plan refinement
const LLM_CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash-lite-previw-06-17',
  TEMPERATURE: 0.3, // Lower temperature for more consistent modifications
  TOP_K: 40,
  TOP_P: 0.95,
  MAX_OUTPUT_TOKENS: 8192
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

interface RefineRequest {
  userCommand: string;
  currentPlan: {
    project_title: string;
    sub_tasks: Array<{
      id: string;
      title: string;
      action: string;
      details: string;
      estimated_minutes_per_sub_task?: number;
    }>;
  };
  documentContext?: string;
}

interface Modification {
  operation: 'update' | 'add' | 'delete' | 'reorder';
  taskId?: string;
  changes?: Record<string, any>;
  afterTaskId?: string;
  newTask?: {
    id: string;
    title: string;
    action: string;
    details: string;
    estimated_minutes_per_sub_task?: number;
  };
  newOrder?: string[]; // For reorder operations
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🤖 Co-pilot Edge Function started - refine-plan');
    console.log('🔧 LLM Configuration:', {
      model: LLM_CONFIG.MODEL_NAME,
      temperature: LLM_CONFIG.TEMPERATURE
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', 
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get the current user
    const { data: { user: authUser }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !authUser) {
      console.error('❌ Authentication failed:', userError?.message);
      throw new Error('Invalid user token');
    }

    console.log('👤 User authenticated:', {
      userId: authUser.id.substring(0, 8) + '...',
      isAnonymous: authUser.is_anonymous || false
    });

    // Parse request body
    const requestData: RefineRequest = await req.json();
    const { userCommand, currentPlan, documentContext } = requestData;

    console.log('🎯 Co-pilot refinement request:', {
      hasCommand: !!userCommand,
      commandLength: userCommand?.length || 0,
      currentTasksCount: currentPlan?.sub_tasks?.length || 0,
      hasDocumentContext: !!documentContext,
      projectTitle: currentPlan?.project_title
    });

    // Validate required fields
    if (!userCommand || !currentPlan || !currentPlan.sub_tasks) {
      throw new Error('Missing required fields: userCommand, currentPlan, or sub_tasks');
    }

    // Get API key (user's or default)
    let apiKey = Deno.env.get('GEMINI_API_KEY');
    let usingUserKey = false;

    // Try to get user's API key for authenticated users
    if (!authUser.is_anonymous) {
      try {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('encrypted_llm_api_key, llm_provider')
          .eq('id', authUser.id)
          .single();

        if (profile?.encrypted_llm_api_key && profile?.llm_provider === 'gemini') {
          try {
            apiKey = atob(profile.encrypted_llm_api_key);
            usingUserKey = true;
            console.log('🔑 Using user API key for Co-pilot');
          } catch (decryptError) {
            console.warn('⚠️ Failed to decrypt user API key, using default');
          }
        }
      } catch (error) {
        console.log('⚠️ Profile lookup failed, using default key');
      }
    }

    if (!apiKey) {
      throw new Error('No API key available for Gemini API');
    }

    // Construct the Co-pilot system prompt
    const systemPrompt = `You are the FocusFlow Co-pilot, an intelligent plan refinement engine. Your job is to interpret user commands and generate precise modifications to their current project plan.

**Current Project Plan:**
Title: "${currentPlan.project_title}"
Tasks: ${JSON.stringify(currentPlan.sub_tasks, null, 2)}

**User Command:** "${userCommand}"

${documentContext ? `**Document Context:** ${documentContext.substring(0, 1000)}...` : ''}

**Your Task:**
Analyze the user's command and generate a JSON response with modifications. You MUST respond with ONLY a valid JSON object containing:

1. "modifications": An array of modification objects
2. "newProjectTitle": (optional) If the user wants to rename the project
3. "explanation": A brief explanation of what changes you're making

**Valid Modification Operations:**

1. **UPDATE**: Modify existing task fields
   {
     "operation": "update",
     "taskId": "existing-task-id",
     "changes": {
       "title": "New title",
       "action": "New action",
       "details": "New details",
       "estimated_minutes_per_sub_task": 15
     }
   }

2. **ADD**: Insert a new task
   {
     "operation": "add",
     "afterTaskId": "task-id-to-insert-after", // or null for beginning
     "newTask": {
       "id": "temp-new-" + Date.now(),
       "title": "New Task Title",
       "action": "Immediate action to take",
       "details": "Detailed explanation",
       "estimated_minutes_per_sub_task": 10
     }
   }

3. **DELETE**: Remove a task
   {
     "operation": "delete",
     "taskId": "task-id-to-remove"
   }

4. **REORDER**: Change task order
   {
     "operation": "reorder",
     "newOrder": ["task-id-1", "task-id-2", "task-id-3"]
   }

**Guidelines:**
- Be precise and only modify what the user specifically requests
- Maintain the enhanced task structure (title, action, details)
- Keep estimated times realistic (5-30 minutes typically)
- If splitting tasks, ensure each part is actionable
- If merging tasks, combine content logically
- For time adjustments, scale proportionally
- For reordering, consider user's energy level and task dependencies

**Example Commands & Responses:**

Command: "Make all tasks 10 minutes"
Response: Multiple "update" operations changing estimated_minutes_per_sub_task to 10

Command: "Add a final review step"
Response: One "add" operation with a review task at the end

Command: "Remove anything about graphics"
Response: "delete" operations for tasks containing graphics-related content

Command: "Move research to the beginning"
Response: One "reorder" operation with research task first

Respond with ONLY the JSON object, no additional text or markdown.`;

    console.log('📤 Making Co-pilot request to Gemini API...');

    // Make request to Gemini API
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
              parts: [
                { text: systemPrompt }
              ]
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

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('📥 Co-pilot response received:', {
      hasCandidates: !!geminiData.candidates,
      finishReason: geminiData.candidates?.[0]?.finishReason
    });

    // Validate response
    if (!geminiData.candidates || !geminiData.candidates[0]) {
      throw new Error('No candidates returned from Gemini API');
    }

    const candidate = geminiData.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Request was blocked by safety filters. Please rephrase your command.');
    }

    if (!candidate.content?.parts?.[0]?.text) {
      throw new Error('Invalid response structure from Gemini API');
    }

    // Parse the JSON response
    const responseText = candidate.content.parts[0].text;
    console.log('📄 Raw Co-pilot response:', responseText.substring(0, 300) + '...');

    let parsedResponse;
    try {
      const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Failed to parse Co-pilot response:', parseError.message);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Validate response structure
    if (!parsedResponse.modifications || !Array.isArray(parsedResponse.modifications)) {
      throw new Error('Invalid response structure - missing modifications array');
    }

    // Validate each modification
    for (const mod of parsedResponse.modifications) {
      if (!mod.operation || !['update', 'add', 'delete', 'reorder'].includes(mod.operation)) {
        throw new Error(`Invalid modification operation: ${mod.operation}`);
      }
    }

    console.log('✅ Co-pilot refinement successful:', {
      modificationsCount: parsedResponse.modifications.length,
      hasNewTitle: !!parsedResponse.newProjectTitle,
      usingUserKey,
      userCommand: userCommand.substring(0, 50) + '...'
    });

    return new Response(JSON.stringify({
      success: true,
      modifications: parsedResponse.modifications,
      newProjectTitle: parsedResponse.newProjectTitle || null,
      explanation: parsedResponse.explanation || 'Plan refined successfully',
      usingUserKey,
      modelUsed: LLM_CONFIG.MODEL_NAME
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error in Co-pilot refine-plan function:', error.message);
    
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