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