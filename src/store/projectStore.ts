import { create } from 'zustand';
import { Project, Task } from '../types';
import { supabase } from '../lib/supabaseClient';

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  error: string | null;
  
  // Project actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'tasks' | 'pomodoro_count' | 'status' | 'user_id'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  
  // Task actions
  addTask: (projectId: string, task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (projectId: string, taskId: string) => Promise<void>;
  reorderTasks: (projectId: string, taskIds: string[]) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projects: [],
  loading: false,
  error: null,
  
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // For each project, fetch its tasks
      const projectsWithTasks = await Promise.all(
        data.map(async (project) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', project.id)
            .order('order', { ascending: true });
          
          if (tasksError) throw tasksError;
          
          return { ...project, tasks: tasks || [] };
        })
      );
      
      set({ projects: projectsWithTasks, loading: false });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  fetchProject: async (id) => {
    set({ loading: true, error: null });
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (projectError) throw projectError;
      
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('order', { ascending: true });
      
      if (tasksError) throw tasksError;
      
      set({ currentProject: { ...project, tasks: tasks || [] }, loading: false });
    } catch (error) {
      console.error('Error fetching project:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  createProject: async (projectData) => {
    set({ loading: true, error: null });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user found');
      
      const newProject = {
        ...projectData,
        user_id: userData.user.id,
        pomodoro_count: 0,
        status: 'planning' as const,
      };
      
      const { data, error } = await supabase
        .from('projects')
        .insert(newProject)
        .select()
        .single();
      
      if (error) throw error;
      
      const createdProject = { ...data, tasks: [] };
      set((state) => ({ 
        projects: [createdProject, ...state.projects],
        currentProject: createdProject,
        loading: false 
      }));
      
      return createdProject;
    } catch (error) {
      console.error('Error creating project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
  
  updateProject: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      set((state) => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
        ),
        currentProject: state.currentProject?.id === id 
          ? { ...state.currentProject, ...updates, updated_at: new Date().toISOString() } 
          : state.currentProject,
        loading: false
      }));
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },
  
  addTask: async (projectId, task) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          project_id: projectId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return { ...p, tasks: [...p.tasks, data] };
          }
          return p;
        });
        
        const updatedCurrentProject = state.currentProject?.id === projectId
          ? { ...state.currentProject, tasks: [...state.currentProject.tasks, data] }
          : state.currentProject;
        
        return { projects: updatedProjects, currentProject: updatedCurrentProject };
      });
    } catch (error) {
      console.error('Error adding task:', error);
      set({ error: (error as Error).message });
    }
  },
  
  updateTask: async (projectId, taskId, updates) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);
      
      if (error) throw error;
      
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
            };
          }
          return p;
        });
        
        const updatedCurrentProject = state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              tasks: state.currentProject.tasks.map(t => 
                t.id === taskId ? { ...t, ...updates } : t
              )
            }
          : state.currentProject;
        
        return { projects: updatedProjects, currentProject: updatedCurrentProject };
      });
    } catch (error) {
      console.error('Error updating task:', error);
      set({ error: (error as Error).message });
    }
  },
  
  removeTask: async (projectId, taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              tasks: p.tasks.filter(t => t.id !== taskId)
            };
          }
          return p;
        });
        
        const updatedCurrentProject = state.currentProject?.id === projectId
          ? {
              ...state.currentProject,
              tasks: state.currentProject.tasks.filter(t => t.id !== taskId)
            }
          : state.currentProject;
        
        return { projects: updatedProjects, currentProject: updatedCurrentProject };
      });
    } catch (error) {
      console.error('Error removing task:', error);
      set({ error: (error as Error).message });
    }
  },
  
  reorderTasks: async (projectId, taskIds) => {
    try {
      // Get the current project's tasks
      const project = get().projects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');
      
      // Map the new order to tasks
      const orderedTasks = taskIds.map((id, index) => {
        const task = project.tasks.find(t => t.id === id);
        if (!task) throw new Error(`Task ${id} not found`);
        return { ...task, order: index };
      });
      
      // Update tasks in the database
      const updates = orderedTasks.map(task => 
        supabase
          .from('tasks')
          .update({ order: task.order })
          .eq('id', task.id)
      );
      
      await Promise.all(updates);
      
      // Update local state
      set((state) => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === projectId) {
            return {
              ...p,
              tasks: orderedTasks
            };
          }
          return p;
        });
        
        const updatedCurrentProject = state.currentProject?.id === projectId
          ? { ...state.currentProject, tasks: orderedTasks }
          : state.currentProject;
        
        return { projects: updatedProjects, currentProject: updatedCurrentProject };
      });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      set({ error: (error as Error).message });
    }
  }
}));