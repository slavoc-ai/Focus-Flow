import { supabase } from '../lib/supabaseClient';
import { User } from '../types';

// Types for project service
export interface ProjectData {
  title: string;
  original_query: string;
  allocated_time_minutes: number;
  energy_level: 'low' | 'medium' | 'high';
  strict_time_adherence: boolean;
  document_name?: string;
  document_text?: string;
}

export interface SubTaskData {
  title?: string; // NEW: Enhanced structure
  action?: string; // NEW: Enhanced structure
  details?: string; // NEW: Enhanced structure
  description?: string; // Keep for backward compatibility
  estimated_minutes_per_sub_task?: number;
  order_index: number;
}

export interface NewSubTaskForCreation {
  title: string;
  action: string;
  details: string;
  description?: string;
  estimated_minutes_per_sub_task?: number;
  is_completed: boolean;
  tempId: string; // Store the temporary ID for mapping
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  original_query: string;
  allocated_time_minutes: number;
  energy_level: 'low' | 'medium' | 'high';
  strict_time_adherence: boolean;
  document_name?: string;
  document_text?: string;
  status: 'planning' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  sub_tasks?: SubTask[];
}

export interface SubTask {
  id: string;
  project_id: string;
  user_id: string;
  title?: string; // NEW: Enhanced structure
  action?: string; // NEW: Enhanced structure
  details?: string; // NEW: Enhanced structure
  description: string; // Keep for backward compatibility
  estimated_minutes_per_sub_task?: number;
  is_completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// NEW: Project filters interface
export interface ProjectFilters {
  status?: 'all' | 'active' | 'planning' | 'in_progress' | 'completed';
  searchTerm?: string;
  sortBy?: 'updated_at_desc' | 'updated_at_asc' | 'created_at_desc' | 'created_at_asc' | 'completed_at_desc' | 'completed_at_asc' | 'title_asc' | 'title_desc';
}

class ProjectService {
  /**
   * Validate and sanitize estimated minutes to ensure it meets database constraints
   */
  private validateEstimatedMinutes(estimatedMinutes?: number): number | null {
    // If no estimate provided, return null (which is allowed by the schema)
    if (estimatedMinutes === undefined || estimatedMinutes === null) {
      return null;
    }
    
    // If estimate is provided but invalid (negative), return null
    if (estimatedMinutes < 0) {
      console.warn(`⚠️ Invalid estimated minutes: ${estimatedMinutes}. Setting to null.`);
      return null;
    }
    
    // Round to nearest integer to ensure clean data
    return Math.round(estimatedMinutes);
  }

  /**
   * Validate and sanitize allocated time minutes to ensure it meets database constraints
   * The database constraint requires allocated_time_minutes > 0, so we need to handle 0 values
   */
  private validateAllocatedTimeMinutes(allocatedTimeMinutes: number): number {
    // If the value is 0 or negative, set it to a default minimum value of 1 minute
    if (allocatedTimeMinutes <= 0) {
      console.warn(`⚠️ Invalid allocated time minutes: ${allocatedTimeMinutes}. Setting to minimum value of 1.`);
      return 1;
    }
    
    // Round to nearest integer to ensure clean data
    return Math.round(allocatedTimeMinutes);
  }

  /**
   * Enhanced method to get projects with comprehensive filtering and sorting
   */
  async getProjectsWithFilters(
    userId: string, 
    filters: ProjectFilters = {}
  ): Promise<{ projects: Project[]; success: boolean; error?: string }> {
    try {
      console.log('📋 Fetching projects with filters:', {
        userId: userId.substring(0, 8) + '...',
        filters
      });

      let query = supabase
        .from('projects')
        .select(`
          *,
          sub_tasks (*)
        `)
        .eq('user_id', userId);

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'active') {
          query = query.in('status', ['planning', 'in_progress']);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      // Apply search filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        query = query.or(`title.ilike.%${searchTerm}%,original_query.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'completed_at_desc':
            // For completion date sorting, we use updated_at for completed projects
            query = query.eq('status', 'completed').order('updated_at', { ascending: false });
            break;
          case 'completed_at_asc':
            query = query.eq('status', 'completed').order('updated_at', { ascending: true });
            break;
          case 'created_at_desc':
            query = query.order('created_at', { ascending: false });
            break;
          case 'created_at_asc':
            query = query.order('created_at', { ascending: true });
            break;
          case 'title_asc':
            query = query.order('title', { ascending: true });
            break;
          case 'title_desc':
            query = query.order('title', { ascending: false });
            break;
          case 'updated_at_asc':
            query = query.order('updated_at', { ascending: true });
            break;
          case 'updated_at_desc':
          default:
            query = query.order('updated_at', { ascending: false });
            break;
        }
      } else {
        // Default sorting
        query = query.order('updated_at', { ascending: false });
      }

      const { data: projects, error } = await query;

      if (error) {
        console.error('❌ Error fetching projects with filters:', error);
        throw new Error(`Failed to fetch projects: ${error.message}`);
      }

      console.log('✅ Projects fetched successfully with filters:', {
        count: projects?.length || 0,
        filters
      });

      return {
        projects: projects || [],
        success: true
      };

    } catch (error) {
      console.error('❌ Error in getProjectsWithFilters:', error);
      return {
        projects: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save a new project and its associated sub-tasks atomically
   * Updated to handle multiple document files by storing summary info
   * Enhanced to support new task structure with title, action, details
   */
  async saveNewProjectAndPlan(
    projectData: ProjectData,
    subTasksArray: Omit<SubTaskData, 'order_index'>[],
    userId: string,
    documentFiles?: File[] // Optional array of files for metadata
  ): Promise<{ project: Project; success: boolean; error?: string }> {
    try {
      console.log('🚀 Saving new enhanced project and plan:', {
        projectTitle: projectData.title,
        subTasksCount: subTasksArray.length,
        userId: userId.substring(0, 8) + '...',
        documentFilesCount: documentFiles?.length || 0,
        hasEnhancedStructure: subTasksArray.some(task => task.title || task.action || task.details),
        originalAllocatedTime: projectData.allocated_time_minutes
      });

      // Validate allocated time minutes to meet database constraints
      const validatedAllocatedTime = this.validateAllocatedTimeMinutes(projectData.allocated_time_minutes);
      
      console.log('✅ Validated allocated time:', {
        original: projectData.allocated_time_minutes,
        validated: validatedAllocatedTime
      });

      // Prepare document metadata for multi-file support
      let documentName = projectData.document_name;
      let documentText = projectData.document_text;

      if (documentFiles && documentFiles.length > 0) {
        // For multiple files, create a summary name
        if (documentFiles.length === 1) {
          documentName = documentFiles[0].name;
        } else {
          documentName = `${documentFiles.length} documents: ${documentFiles.map(f => f.name).join(', ')}`;
        }
        
        // Note: We don't store the actual file content anymore since we're using Gemini File API
        // The document_text field could be used for metadata or left empty
        documentText = documentText || `Processed ${documentFiles.length} document(s) via Gemini File API`;
      }

      // Start a transaction-like operation
      // First, insert the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: projectData.title,
          original_query: projectData.original_query,
          allocated_time_minutes: validatedAllocatedTime, // Use validated value
          energy_level: projectData.energy_level,
          strict_time_adherence: projectData.strict_time_adherence,
          document_name: documentName,
          document_text: documentText,
          status: 'planning'
        })
        .select()
        .single();

      if (projectError) {
        console.error('❌ Error creating project:', projectError);
        throw new Error(`Failed to create project: ${projectError.message}`);
      }

      console.log('✅ Enhanced project created successfully:', {
        projectId: project.id,
        title: project.title,
        documentName: project.document_name,
        allocatedTime: project.allocated_time_minutes
      });

      // Then, insert all sub-tasks with validated estimated minutes and enhanced structure
      if (subTasksArray.length > 0) {
        const subTasksToInsert = subTasksArray.map((task, index) => {
          const validatedMinutes = this.validateEstimatedMinutes(task.estimated_minutes_per_sub_task);
          
          console.log(`📝 Enhanced sub-task ${index + 1}:`, {
            title: task.title?.substring(0, 30) + '...' || 'No title',
            action: task.action?.substring(0, 30) + '...' || 'No action',
            details: task.details?.substring(0, 50) + '...' || 'No details',
            description: task.description?.substring(0, 50) + '...' || 'No description',
            originalEstimate: task.estimated_minutes_per_sub_task,
            validatedEstimate: validatedMinutes
          });

          return {
            project_id: project.id,
            user_id: userId,
            // Enhanced structure fields
            title: task.title || '',
            action: task.action || '',
            details: task.details || '',
            // Backward compatibility - use details as description if no description provided
            description: task.description || task.details || task.action || '',
            estimated_minutes_per_sub_task: validatedMinutes,
            is_completed: false,
            order_index: index
          };
        });

        console.log('📤 Inserting enhanced sub-tasks with validated data:', {
          count: subTasksToInsert.length,
          sampleTask: {
            title: subTasksToInsert[0]?.title?.substring(0, 30) + '...',
            action: subTasksToInsert[0]?.action?.substring(0, 30) + '...',
            estimatedMinutes: subTasksToInsert[0]?.estimated_minutes_per_sub_task
          }
        });

        const { data: subTasks, error: subTasksError } = await supabase
          .from('sub_tasks')
          .insert(subTasksToInsert)
          .select();

        if (subTasksError) {
          console.error('❌ Error creating enhanced sub-tasks:', subTasksError);
          console.error('❌ Sub-tasks data that failed:', subTasksToInsert);
          // Rollback: delete the project if sub-tasks failed
          await supabase.from('projects').delete().eq('id', project.id);
          throw new Error(`Failed to create sub-tasks: ${subTasksError.message}`);
        }

        console.log('✅ Enhanced sub-tasks created successfully:', {
          count: subTasks?.length || 0
        });

        // Return project with sub-tasks
        return {
          project: { ...project, sub_tasks: subTasks },
          success: true
        };
      }

      // Return project without sub-tasks
      return {
        project: { ...project, sub_tasks: [] },
        success: true
      };

    } catch (error) {
      console.error('❌ Error in saveNewProjectAndPlan:', error);
      return {
        project: {} as Project,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all projects for a user (legacy method - now uses getProjectsWithFilters)
   */
  async getProjectsByUserId(userId: string): Promise<{ projects: Project[]; success: boolean; error?: string }> {
    return this.getProjectsWithFilters(userId, {});
  }

  /**
   * Get a specific project by ID with sub-tasks
   */
  async getProjectById(projectId: string, userId: string): Promise<{ project: Project | null; success: boolean; error?: string }> {
    try {
      console.log('📋 Fetching project:', projectId);

      const { data: project, error } = await supabase
        .from('projects')
        .select(`
          *,
          sub_tasks (*)
        `)
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            project: null,
            success: true
          };
        }
        console.error('❌ Error fetching project:', error);
        throw new Error(`Failed to fetch project: ${error.message}`);
      }

      // Sort sub-tasks by order_index
      if (project?.sub_tasks) {
        project.sub_tasks.sort((a: SubTask, b: SubTask) => a.order_index - b.order_index);
      }

      console.log('✅ Project fetched successfully:', {
        projectId: project.id,
        title: project.title,
        subTasksCount: project.sub_tasks?.length || 0,
        documentName: project.document_name
      });

      return {
        project,
        success: true
      };

    } catch (error) {
      console.error('❌ Error in getProjectById:', error);
      return {
        project: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a project and all its associated data
   */
  async deleteProject(projectId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting project:', {
        projectId,
        userId: userId.substring(0, 8) + '...'
      });

      // Delete the project - this will cascade delete sub_tasks and work_sessions
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error deleting project:', error);
        throw new Error(`Failed to delete project: ${error.message}`);
      }

      console.log('✅ Project deleted successfully:', projectId);

      return { success: true };

    } catch (error) {
      console.error('❌ Error in deleteProject:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: string,
    updates: Partial<ProjectData & { status: 'planning' | 'in_progress' | 'completed' }>,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 Updating project:', projectId, updates);

      // Validate allocated_time_minutes if it's being updated
      const validatedUpdates = { ...updates };
      if (updates.allocated_time_minutes !== undefined) {
        validatedUpdates.allocated_time_minutes = this.validateAllocatedTimeMinutes(updates.allocated_time_minutes);
        console.log('✅ Validated allocated time for update:', {
          original: updates.allocated_time_minutes,
          validated: validatedUpdates.allocated_time_minutes
        });
      }

      const { error } = await supabase
        .from('projects')
        .update({
          ...validatedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating project:', error);
        throw new Error(`Failed to update project: ${error.message}`);
      }

      console.log('✅ Project updated successfully');

      return { success: true };

    } catch (error) {
      console.error('❌ Error in updateProject:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Add new sub-tasks to a project
   * This is used for tasks created by Co-pilot during a session
   */
  async addSubTasksToProject(
    projectId: string,
    userId: string,
    newTasks: NewSubTaskForCreation[]
  ): Promise<{ createdTasks: SubTask[]; tempIdMap: Record<string, string>; success: boolean; error?: string }> {
    try {
      if (!newTasks || newTasks.length === 0) {
        return { createdTasks: [], tempIdMap: {}, success: true };
      }

      console.log('🚀 Adding new sub-tasks to project:', {
        projectId,
        userId: userId.substring(0, 8) + '...',
        tasksCount: newTasks.length
      });

      // Get the current highest order_index for the project
      const { data: existingTasks, error: fetchError } = await supabase
        .from('sub_tasks')
        .select('order_index')
        .eq('project_id', projectId)
        .order('order_index', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('❌ Error fetching existing tasks:', fetchError);
        throw new Error(`Failed to fetch existing tasks: ${fetchError.message}`);
      }

      // Start order_index from the highest existing + 1, or 0 if no existing tasks
      let startOrderIndex = 0;
      if (existingTasks && existingTasks.length > 0) {
        startOrderIndex = existingTasks[0].order_index + 1;
      }

      // Prepare tasks for insertion with validated data
      const tasksToInsert = newTasks.map((task, index) => {
        const validatedMinutes = this.validateEstimatedMinutes(task.estimated_minutes_per_sub_task);
        
        return {
          project_id: projectId,
          user_id: userId,
          title: task.title || '',
          action: task.action || '',
          details: task.details || '',
          description: task.description || task.details || task.action || '',
          estimated_minutes_per_sub_task: validatedMinutes,
          is_completed: task.is_completed || false,
          order_index: startOrderIndex + index
        };
      });

      console.log('📤 Inserting new sub-tasks:', {
        count: tasksToInsert.length,
        startOrderIndex
      });

      // Insert the new tasks
      const { data: createdTasks, error: insertError } = await supabase
        .from('sub_tasks')
        .insert(tasksToInsert)
        .select();

      if (insertError) {
        console.error('❌ Error inserting new sub-tasks:', insertError);
        throw new Error(`Failed to insert new sub-tasks: ${insertError.message}`);
      }

      if (!createdTasks) {
        throw new Error('No tasks were created');
      }

      console.log('✅ New sub-tasks created successfully:', {
        count: createdTasks.length
      });

      // Create a mapping from temporary IDs to real database IDs
      const tempIdMap: Record<string, string> = {};
      createdTasks.forEach((dbTask, index) => {
        const originalTask = newTasks[index];
        tempIdMap[originalTask.tempId] = dbTask.id;
      });

      return {
        createdTasks,
        tempIdMap,
        success: true
      };

    } catch (error) {
      console.error('❌ Error in addSubTasksToProject:', error);
      return {
        createdTasks: [],
        tempIdMap: {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update sub-task completion status
   */
  async updateSubTaskCompletion(
    subTaskId: string,
    isCompleted: boolean,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 Updating sub-task completion:', subTaskId, isCompleted);

      const { error } = await supabase
        .from('sub_tasks')
        .update({
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', subTaskId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating sub-task:', error);
        throw new Error(`Failed to update sub-task: ${error.message}`);
      }

      console.log('✅ Sub-task updated successfully');

      return { success: true };

    } catch (error) {
      console.error('❌ Error in updateSubTaskCompletion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Batch update sub-task completion statuses and other fields
   */
  async batchUpdateSubTaskCompletion(
    updates: { 
      id: string; 
      is_completed: boolean;
      title?: string;
      action?: string;
      details?: string;
      estimated_minutes_per_sub_task?: number | null;
    }[],
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 Batch updating sub-tasks:', updates.length);

      // Use Promise.all for concurrent updates
      const updatePromises = updates.map(update => {
        const updateData: any = {
          is_completed: update.is_completed,
          updated_at: new Date().toISOString()
        };

        // Add optional fields if provided
        if (update.title !== undefined) updateData.title = update.title;
        if (update.action !== undefined) updateData.action = update.action;
        if (update.details !== undefined) updateData.details = update.details;
        if (update.estimated_minutes_per_sub_task !== undefined) {
          updateData.estimated_minutes_per_sub_task = this.validateEstimatedMinutes(update.estimated_minutes_per_sub_task);
        }

        return supabase
          .from('sub_tasks')
          .update(updateData)
          .eq('id', update.id)
          .eq('user_id', userId);
      });

      const results = await Promise.all(updatePromises);

      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('❌ Errors in batch update:', errors);
        throw new Error(`Failed to update ${errors.length} sub-tasks`);
      }

      console.log('✅ Batch sub-task update successful');

      return { success: true };

    } catch (error) {
      console.error('❌ Error in batchUpdateSubTaskCompletion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if all sub-tasks for a project are completed and update project status
   */
  async checkAndUpdateProjectCompletion(projectId: string, userId: string): Promise<void> {
    try {
      console.log('🔍 Checking project completion status:', projectId);

      // Get all sub-tasks for the project
      const { data: subTasks, error } = await supabase
        .from('sub_tasks')
        .select('is_completed')
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error fetching sub-tasks for completion check:', error);
        return;
      }

      if (!subTasks || subTasks.length === 0) {
        console.log('ℹ️ No sub-tasks found for project');
        return;
      }

      // Check if all tasks are completed
      const allCompleted = subTasks.every(task => task.is_completed);
      const projectStatus = allCompleted ? 'completed' : 'in_progress';

      console.log('📊 Project completion status:', {
        totalTasks: subTasks.length,
        completedTasks: subTasks.filter(t => t.is_completed).length,
        allCompleted,
        newStatus: projectStatus
      });

      // Update project status if necessary
      await this.updateProject(projectId, { status: projectStatus }, userId);

    } catch (error) {
      console.error('❌ Error in checkAndUpdateProjectCompletion:', error);
      // Don't throw - this is a secondary operation
    }
  }
}

export const projectService = new ProjectService();