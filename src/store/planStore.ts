import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';
import { projectService } from '../services/projectService';
import { storageService } from '../services/storageService';
import { SubTask } from '../types';

interface PlanState {
  taskDescription: string;
  timeAllocated: number;
  strictTimeAdherence: boolean;
  energyLevel: string;
  breakdownLevel: string; // Task granularity control
  documentFiles: File[]; // Array of uploaded files
  isLoading: boolean;
  error: string | null;
  currentTip: string;
  plan: SubTask[]; // Enhanced SubTask array
  projectTitle: string; // AI-generated project title
  timeWarning: string | null;
  
  // Project editing state
  isEditingProject: boolean;
  editingProjectId: string | null;
  
  // Upload progress state
  uploadProgress: Record<string, { bytesUploaded: number; bytesTotal: number; percentage: number }>;
  
  // Actions
  setTaskDescription: (description: string) => void;
  setTimeAllocated: (time: number) => void;
  setStrictTimeAdherence: (strict: boolean) => void;
  setEnergyLevel: (level: string) => void;
  setBreakdownLevel: (level: string) => void;
  setDocumentFiles: (files: File[]) => void;
  addDocumentFiles: (files: File[]) => void;
  removeDocumentFile: (fileName: string) => void;
  generatePlan: () => Promise<void>;
  updatePlan: (plan: SubTask[]) => void;
  addPlanTask: (title: string, action: string, details: string) => void;
  deletePlanTask: (id: string) => void;
  updatePlanTask: (id: string, updates: Partial<SubTask>) => void;
  loadExistingProject: (projectId: string, userId: string) => Promise<void>;
  restoreInputsFromPlan: () => void;
  reset: () => void;
}

const initialState = {
  taskDescription: '',
  timeAllocated: 0, // Changed to 0 for optional time
  strictTimeAdherence: false,
  energyLevel: 'medium',
  breakdownLevel: 'small', // Default to small steps
  documentFiles: [], // Initialize as empty array
  isLoading: false,
  error: null,
  currentTip: '',
  plan: [],
  projectTitle: '', // Initialize empty
  timeWarning: null,
  isEditingProject: false,
  editingProjectId: null,
  uploadProgress: {},
};

export const usePlanStore = create<PlanState>((set, get) => ({
  ...initialState,

  setTaskDescription: (description) => set({ taskDescription: description }),
  
  setTimeAllocated: (time) => set({ timeAllocated: time }),
  
  setStrictTimeAdherence: (strict) => set({ strictTimeAdherence: strict }),
  
  setEnergyLevel: (level) => set({ energyLevel: level }),
  
  setBreakdownLevel: (level) => set({ breakdownLevel: level }),
  
  setDocumentFiles: (files) => set({ documentFiles: files }),
  
  addDocumentFiles: (newFiles) => {
    const { documentFiles } = get();
    // Filter out duplicates based on file name
    const filesToAdd = newFiles.filter(
      (newFile) => !documentFiles.some((existingFile) => existingFile.name === newFile.name)
    );
    set({ documentFiles: [...documentFiles, ...filesToAdd] });
  },
  
  removeDocumentFile: (fileName) => {
    const { documentFiles } = get();
    set({ documentFiles: documentFiles.filter(file => file.name !== fileName) });
  },
  
  generatePlan: async () => {
    const {
      taskDescription,
      timeAllocated,
      strictTimeAdherence,
      energyLevel,
      breakdownLevel,
      documentFiles
    } = get();

    try {
      set({ isLoading: true, error: null, timeWarning: null, uploadProgress: {} });
      
      console.log('🚀 Starting enhanced plan generation with TUS support:', {
        taskDescription: taskDescription.substring(0, 100) + '...',
        timeAllocated: timeAllocated || 'unlimited',
        strictTimeAdherence,
        energyLevel,
        breakdownLevel,
        documentFilesCount: documentFiles.length,
        documentFileNames: documentFiles.map(f => f.name)
      });
      
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error('Authentication error. Please try again.');
      }
      
      console.log('🔐 Current session status:', {
        hasSession: !!session,
        isAnonymous: session?.user?.is_anonymous || false,
        userId: session?.user?.id?.substring(0, 8) + '...' || 'none'
      });

      // --- REAL Premium User Check ---
      let isPremium = false;
      if (session?.user && !session.user.is_anonymous) {
        // Fetch user profile to check subscription status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profile) {
          isPremium = profile.subscription_status === 'premium';
          console.log('👤 User subscription status:', profile.subscription_status);
        }
      }

      // Determine upload strategy
      let useTusUpload = false;
      const MAX_STANDARD_UPLOAD_SIZE_MB = 9.5; // Edge Function limit

      if (isPremium && documentFiles.length > 0) {
        // Premium users can use TUS for any file, or specifically for large ones
        const hasLargeFiles = documentFiles.some(f => f.size > (MAX_STANDARD_UPLOAD_SIZE_MB * 1024 * 1024));
        useTusUpload = hasLargeFiles || documentFiles.length > 5; // Use TUS for large files or many files
        
        console.log('💎 Premium user detected:', {
          hasLargeFiles,
          fileCount: documentFiles.length,
          useTusUpload
        });
      }
      
      // Prepare FormData for the request
      const formData = new FormData();
      
      // Append text fields
      formData.append('taskDescription', taskDescription);
      formData.append('timeAllocated', timeAllocated.toString());
      formData.append('strictTimeAdherence', strictTimeAdherence.toString());
      formData.append('energyLevel', energyLevel);
      formData.append('breakdownLevel', breakdownLevel);

      try {
        if (useTusUpload && documentFiles.length > 0) {
          console.log('🚀 Starting PREMIUM TUS upload workflow...');
          
          // Upload files using TUS and get paths
          const uploadPromises = documentFiles.map(async (file) => {
            console.log(`📤 Uploading ${file.name} via TUS...`);
            
            const result = await storageService.uploadFileWithTus(
              file, 
              session.user.id, 
              (progress) => {
                // Update progress in store for UI feedback
                set(state => ({
                  uploadProgress: {
                    ...state.uploadProgress,
                    [file.name]: progress
                  }
                }));
                console.log(`📊 Upload progress for ${file.name}: ${progress.percentage}%`);
              }
            );
            
            if (!result.success) {
              throw new Error(`Failed to upload ${file.name}: ${result.error}`);
            }
            
            return result.path;
          });
          
          const documentPaths = await Promise.all(uploadPromises);
          console.log('✅ All files uploaded via TUS:', documentPaths);
          
          // Send document paths instead of files
          for (const path of documentPaths) {
            formData.append('documentPaths', path);
          }
          
          // Clear upload progress
          set({ uploadProgress: {} });
          
        } else if (documentFiles.length > 0) {
          console.log('🚀 Starting STANDARD upload workflow...');
          
          // Validate file sizes for standard upload
          for (const file of documentFiles) {
            if (file.size > (MAX_STANDARD_UPLOAD_SIZE_MB * 1024 * 1024)) {
              throw new Error(`File "${file.name}" is too large for standard upload. Premium subscription required for files over ${MAX_STANDARD_UPLOAD_SIZE_MB}MB.`);
            }
          }
          
          // Append files directly to FormData
          for (const file of documentFiles) {
            formData.append('documentFiles', file, file.name);
          }
        }

        console.log('📤 Calling Edge Function with enhanced data:', {
          hasTaskDescription: !!taskDescription,
          taskDescriptionLength: taskDescription?.length,
          timeAllocated: timeAllocated || 'unlimited',
          strictTimeAdherence: strictTimeAdherence,
          energyLevel: energyLevel,
          breakdownLevel: breakdownLevel,
          documentFilesCount: documentFiles.length,
          uploadMethod: useTusUpload ? 'premium-tus' : 'standard-formdata'
        });
        
        // Make request to Edge Function
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            // Don't set Content-Type - let browser set it for FormData
          },
          body: formData
        });

        console.log('📥 Edge function response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Edge function error:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          
          let errorMessage = 'Failed to generate plan';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = `Service error (${response.status}): ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('📥 Edge function response:', { data });

        if (!data.success) {
          console.error('❌ Plan generation failed:', data);
          throw new Error(data.error || 'Plan generation failed');
        }

        if (!data.plan || !Array.isArray(data.plan)) {
          console.error('❌ Invalid plan structure:', data);
          throw new Error('Invalid plan structure received from AI service');
        }

        console.log('✅ Enhanced plan generated successfully:', {
          planLength: data.plan.length,
          hasProjectTitle: !!data.projectTitle,
          hasTimeWarning: !!data.timeWarning,
          usingUserKey: data.usingUserKey,
          sessionType: session?.user?.is_anonymous ? 'anonymous' : 'authenticated',
          userId: session?.user?.id?.substring(0, 8) + '...',
          documentsProcessed: documentFiles.length,
          breakdownLevel: breakdownLevel,
          uploadMethod: useTusUpload ? 'premium-tus' : 'standard-formdata'
        });

        // Transform the AI response into our enhanced SubTask format
        const planItems: SubTask[] = data.plan.map((item: any, index: number) => ({
          id: `task-${index + 1}`,
          title: item.title || `Task ${index + 1}`,
          action: item.action || item.sub_task_description || '',
          details: item.details || item.sub_task_description || '',
          estimated_minutes_per_sub_task: item.estimated_minutes_per_sub_task,
          isCompleted: false,
          // Keep for backward compatibility
          description: item.sub_task_description
        }));
        
        set({ 
          plan: planItems,
          projectTitle: data.projectTitle || '',
          timeWarning: data.timeWarning,
        });

      } catch (uploadError) {
        console.error('❌ Upload/processing error:', uploadError);
        // Clear any upload progress on error
        set({ uploadProgress: {} });
        throw uploadError;
      }
      
    } catch (error) {
      console.error('❌ Plan generation error:', error);
      
      let userFriendlyMessage = 'Failed to generate plan. Please try again.';
      
      if (error instanceof Error) {
        userFriendlyMessage = error.message;
      }
      
      set({ error: userFriendlyMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updatePlan: (plan) => set({ plan }),
  
  addPlanTask: (title, action, details) => {
    const { plan } = get();
    const newTask: SubTask = {
      id: `task-${Date.now()}`,
      title,
      action,
      details,
      isCompleted: false,
      description: details // Keep for backward compatibility
    };
    set({ plan: [...plan, newTask] });
  },
  
  deletePlanTask: (id) => {
    const { plan } = get();
    set({ plan: plan.filter(task => task.id !== id) });
  },
  
  updatePlanTask: (id, updates) => {
    const { plan } = get();
    set({
      plan: plan.map(task => 
        task.id === id ? { ...task, ...updates } : task
      )
    });
  },

  loadExistingProject: async (projectId: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      console.log('📋 Loading existing project for editing:', projectId);
      
      const result = await projectService.getProjectById(projectId, userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load project');
      }
      
      if (!result.project) {
        throw new Error('Project not found');
      }
      
      const project = result.project;
      
      // Transform project data into enhanced SubTask format
      const planItems: SubTask[] = project.sub_tasks?.map((task) => ({
        id: task.id,
        title: task.title || 'Task', // Handle legacy data
        action: task.action || task.description,
        details: task.details || task.description,
        estimated_minutes_per_sub_task: task.estimated_minutes_per_sub_task,
        isCompleted: task.is_completed,
        description: task.description // Keep for backward compatibility
      })) || [];
      
      // Note: For existing projects, we can't restore the original files
      // as they're not stored in the database, only the extracted text
      set({
        taskDescription: project.original_query,
        timeAllocated: project.allocated_time_minutes,
        strictTimeAdherence: project.strict_time_adherence,
        energyLevel: project.energy_level,
        breakdownLevel: 'small', // Default for existing projects
        documentFiles: [], // Can't restore original files
        plan: planItems,
        projectTitle: project.title, // Use existing project title
        isEditingProject: true,
        editingProjectId: projectId,
        timeWarning: null
      });
      
      console.log('✅ Project loaded successfully for editing:', {
        projectId,
        title: project.title,
        tasksCount: planItems.length
      });
      
    } catch (error) {
      console.error('❌ Error loading project for editing:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load project',
        isEditingProject: false,
        editingProjectId: null
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  restoreInputsFromPlan: () => {
    // This function preserves the current input values when returning to home
    // The inputs are already stored in the state, so no action needed
    console.log('📋 Restoring input fields from current plan state');
  },
  
  reset: () => set({ 
    ...initialState 
  }),
}));