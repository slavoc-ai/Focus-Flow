import { supabase } from '../lib/supabaseClient';

export interface Modification {
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
  newOrder?: string[];
}

export interface RefineResponse {
  success: boolean;
  modifications: Modification[];
  newProjectTitle?: string;
  explanation?: string;
  usingUserKey?: boolean;
  modelUsed?: string;
  error?: string;
}

export interface CurrentPlan {
  project_title: string;
  sub_tasks: Array<{
    id: string;
    title: string;
    action: string;
    details: string;
    estimated_minutes_per_sub_task?: number;
  }>;
}

class PlanService {
  /**
   * Refine a plan using AI Co-pilot
   */
  async refinePlanWithAI(
    userCommand: string,
    currentPlan: CurrentPlan,
    documentContext?: string
  ): Promise<RefineResponse> {
    try {
      console.log('🤖 Calling Co-pilot refine-plan Edge Function:', {
        command: userCommand.substring(0, 50) + '...',
        tasksCount: currentPlan.sub_tasks.length,
        hasDocumentContext: !!documentContext
      });

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Authentication error. Please try again.');
      }

      if (!session?.access_token) {
        throw new Error('No active session. Please sign in.');
      }

      // Prepare request payload
      const requestPayload = {
        userCommand,
        currentPlan,
        documentContext
      };

      console.log('📤 Sending Co-pilot request...');

      // Make request to Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refine-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📥 Co-pilot response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Co-pilot error response:', errorText);
        
        let errorMessage = 'Failed to refine plan';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Service error (${response.status}): ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('📥 Co-pilot response data:', {
        success: data.success,
        modificationsCount: data.modifications?.length || 0,
        hasNewTitle: !!data.newProjectTitle,
        hasExplanation: !!data.explanation
      });

      if (!data.success) {
        throw new Error(data.error || 'Plan refinement failed');
      }

      if (!data.modifications || !Array.isArray(data.modifications)) {
        throw new Error('Invalid response structure from Co-pilot');
      }

      console.log('✅ Co-pilot refinement successful:', {
        modificationsCount: data.modifications.length,
        operations: data.modifications.map((m: Modification) => m.operation),
        usingUserKey: data.usingUserKey,
        modelUsed: data.modelUsed
      });

      return {
        success: true,
        modifications: data.modifications,
        newProjectTitle: data.newProjectTitle,
        explanation: data.explanation,
        usingUserKey: data.usingUserKey,
        modelUsed: data.modelUsed
      };

    } catch (error) {
      console.error('❌ Error in refinePlanWithAI:', error);
      
      return {
        success: false,
        modifications: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export const planService = new PlanService();