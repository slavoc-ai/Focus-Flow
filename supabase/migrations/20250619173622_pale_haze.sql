/*
 * =================================================================
 *
 *               ADD FEEDBACK SUBMISSIONS TABLE
 *
 * This migration adds a table to store user feedback submissions
 * for tracking and analysis purposes.
 *
 * =================================================================
 */

-- Create feedback_submissions table
CREATE TABLE IF NOT EXISTS public.feedback_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('general', 'bug', 'feature', 'compliment')),
  subject text,
  message text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text NOT NULL,
  user_name text NOT NULL,
  user_agent text,
  url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Indexes for feedback_submissions
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_type ON public.feedback_submissions USING btree (type);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_created_at ON public.feedback_submissions USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_id ON public.feedback_submissions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_user_email ON public.feedback_submissions USING btree (user_email);

-- Policies for feedback_submissions
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.feedback_submissions;
CREATE POLICY "Users can insert their own feedback" ON public.feedback_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL -- Allow anonymous feedback
  );

DROP POLICY IF EXISTS "Only admins can read feedback" ON public.feedback_submissions;
CREATE POLICY "Only admins can read feedback" ON public.feedback_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role') = 'admin'
    )
  );

-- Trigger to update the 'updated_at' column on feedback updates
DROP TRIGGER IF EXISTS on_feedback_submission_update ON public.feedback_submissions;
CREATE TRIGGER on_feedback_submission_update
  BEFORE UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add a comment to document the table
COMMENT ON TABLE public.feedback_submissions IS 'Stores user feedback submissions sent through the in-app feedback feature';