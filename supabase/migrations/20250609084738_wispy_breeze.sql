/*
 * =================================================================
 *
 *               COMBINED SUPABASE MIGRATION SCRIPT
 *
 * This script combines all individual migration files into a single,
 * idempotent script that defines the complete database schema.
 *
 * It includes the creation of:
 * - Tables: profiles, projects, sub_tasks, work_sessions, logs, analytics_events
 * - Functions: handle_updated_at, handle_new_user
 * - Triggers: to automatically handle timestamps and new user setup
 * - Row Level Security (RLS) policies for all tables.
 * - Indexes for performance optimization.
 *
 * =================================================================
 */

-- =================================================================
-- 1. HELPER FUNCTIONS
-- =================================================================

-- Function to automatically update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create a profile for a new user, idempotent
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- 2. TABLE: profiles
-- =================================================================

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  encrypted_llm_api_key text,
  llm_provider text,
  default_pomodoro_work_minutes integer DEFAULT 25,
  default_pomodoro_short_break_minutes integer DEFAULT 5,
  default_pomodoro_long_break_minutes integer DEFAULT 15,
  enable_sound_notifications boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles USING btree (username);

-- Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- =================================================================
-- 3. TABLE: projects
-- =================================================================

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  original_query text NOT NULL,
  allocated_time_minutes integer NOT NULL CHECK (allocated_time_minutes > 0),
  energy_level text NOT NULL CHECK (energy_level IN ('low', 'medium', 'high')),
  strict_time_adherence boolean NOT NULL DEFAULT false,
  document_name text,
  document_text text,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects USING btree (updated_at DESC);

-- Policies for projects
DROP POLICY IF EXISTS "Users can read their own projects" ON public.projects;
CREATE POLICY "Users can read their own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);


-- =================================================================
-- 4. TABLE: sub_tasks
-- =================================================================

-- Create sub_tasks table
CREATE TABLE IF NOT EXISTS public.sub_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  estimated_minutes_per_sub_task integer CHECK (estimated_minutes_per_sub_task > 0),
  is_completed boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL CHECK (order_index >= 0),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

-- Indexes for sub_tasks
CREATE INDEX IF NOT EXISTS idx_sub_tasks_project_id ON public.sub_tasks USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_user_id ON public.sub_tasks USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_order_index ON public.sub_tasks USING btree (order_index);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_is_completed ON public.sub_tasks USING btree (is_completed);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_project_order ON public.sub_tasks USING btree (project_id, order_index);

-- Policies for sub_tasks
DROP POLICY IF EXISTS "Users can read their own sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users can read their own sub_tasks" ON public.sub_tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users can insert their own sub_tasks" ON public.sub_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users can update their own sub_tasks" ON public.sub_tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sub_tasks" ON public.sub_tasks;
CREATE POLICY "Users can delete their own sub_tasks" ON public.sub_tasks
  FOR DELETE USING (auth.uid() = user_id);


-- =================================================================
-- 5. TABLE: work_sessions
-- =================================================================

-- Create work_sessions table
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pomodoros_completed integer NOT NULL DEFAULT 0 CHECK (pomodoros_completed >= 0),
  total_focused_minutes integer NOT NULL CHECK (total_focused_minutes >= 0),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT valid_session_duration CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

-- Indexes for work_sessions
CREATE INDEX IF NOT EXISTS idx_work_sessions_project_id ON public.work_sessions USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON public.work_sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_start_time ON public.work_sessions USING btree (start_time DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_created_at ON public.work_sessions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_start_time ON public.work_sessions USING btree (user_id, start_time DESC);

-- Policies for work_sessions
DROP POLICY IF EXISTS "Users can read their own work_sessions" ON public.work_sessions;
CREATE POLICY "Users can read their own work_sessions" ON public.work_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own work_sessions" ON public.work_sessions;
CREATE POLICY "Users can insert their own work_sessions" ON public.work_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own work_sessions" ON public.work_sessions;
CREATE POLICY "Users can update their own work_sessions" ON public.work_sessions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own work_sessions" ON public.work_sessions;
CREATE POLICY "Users can delete their own work_sessions" ON public.work_sessions
  FOR DELETE USING (auth.uid() = user_id);


-- =================================================================
-- 6. TABLE: logs
-- =================================================================

-- Create logs table
CREATE TABLE IF NOT EXISTS public.logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL,
  message text NOT NULL,
  context jsonb,
  timestamp timestamp with time zone NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  url text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Indexes for logs
CREATE INDEX IF NOT EXISTS idx_logs_level ON public.logs USING btree (level);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.logs USING btree (timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs USING btree (user_id);

-- Policies for logs
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.logs;
CREATE POLICY "Users can insert their own logs" ON public.logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can read logs" ON public.logs;
CREATE POLICY "Only admins can read logs" ON public.logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );


-- =================================================================
-- 7. TABLE: analytics_events
-- =================================================================

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  url text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events USING btree (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events USING btree (user_id);

-- Policies for analytics_events
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert their own analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can read analytics events" ON public.analytics_events;
CREATE POLICY "Only admins can read analytics events" ON public.analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );


-- =================================================================
-- 8. TRIGGERS
-- =================================================================

-- Trigger to create a profile when a new user signs up in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to update the 'updated_at' column on project updates
DROP TRIGGER IF EXISTS on_project_update ON public.projects;
CREATE TRIGGER on_project_update
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update the 'updated_at' column on sub_task updates
DROP TRIGGER IF EXISTS on_sub_task_update ON public.sub_tasks;
CREATE TRIGGER on_sub_task_update
  BEFORE UPDATE ON public.sub_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();