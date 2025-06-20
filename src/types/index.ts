export interface User {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  llm_provider?: string;
  default_pomodoro_work_minutes: number;
  default_pomodoro_short_break_minutes: number;
  default_pomodoro_long_break_minutes: number;
  enable_sound_notifications: boolean;
  is_anonymous?: boolean; // Add support for anonymous users
  subscription_status?: 'free' | 'premium' | 'trial'; // NEW: Premium tier support
  encrypted_llm_api_key?: string; // Add support for encrypted API keys
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  time_allocated: number;
  strict_time_adherence: boolean;
  energy_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  tasks: Task[];
  document_url?: string;
  document_name?: string;
  pomodoro_count: number;
  status: 'planning' | 'in_progress' | 'completed';
  user_id: string;
}

// Enhanced SubTask interface for comprehensive editing
export interface SubTask {
  id: string; // UUID from DB, or temporary for new tasks
  title: string; // Short headline for the task
  action: string; // Immediate call to action
  details: string; // Longer explanation with context
  description?: string; // Fallback or if still used by AI (backward compatibility)
  estimated_minutes_per_sub_task?: number | null; // Allow null for no estimate
  isCompleted: boolean;
  order_index?: number; // If managed client-side before save
}

// For creating new sub-tasks
export interface SubTaskData {
  project_id?: string; // Optional if service handles it
  user_id?: string;    // Optional if service handles it
  title: string;
  action: string;
  details: string;
  description?: string; // Keep for now if AI still populates it, or remove if fully deprecated
  estimated_minutes_per_sub_task?: number | null; // Allow null for no estimate
  is_completed?: boolean;
  order_index: number;
}

// For updating existing sub-tasks
export interface SubTaskUpdate {
  id: string;
  title?: string;
  action?: string;
  details?: string;
  description?: string; // If keeping for backward compatibility
  estimated_minutes_per_sub_task?: number | null;
  is_completed?: boolean;
  order_index?: number; // If reordering is also saved through this
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  enableSoundNotifications: boolean;
}

export type PomodoroPhase = 'work' | 'short-break' | 'long-break';

export interface PomodoroState {
  phase: PomodoroPhase;
  timeLeft: number;
  isRunning: boolean;
  totalCompletedPomodoros: number;
}