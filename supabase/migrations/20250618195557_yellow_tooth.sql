/*
 * =================================================================
 *
 *               ADD PREMIUM STATUS TO PROFILES TABLE
 *
 * This migration adds subscription status tracking to the profiles
 * table to support premium tier functionality.
 *
 * =================================================================
 */

-- Define an ENUM type for subscription status for better data integrity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE public.subscription_status_enum AS ENUM ('free', 'premium', 'trial');
  END IF;
END$$;

-- Add the new column to the profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status public.subscription_status_enum DEFAULT 'free' NOT NULL;
  END IF;
END$$;

-- Add an index for faster lookups on subscription_status
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles USING btree (subscription_status);

-- Optional: Update specific users to premium for testing (uncomment and modify as needed)
-- UPDATE public.profiles SET subscription_status = 'premium' WHERE email = 'your-test-email@example.com';

-- Add a comment to document the new column
COMMENT ON COLUMN public.profiles.subscription_status IS 'User subscription tier: free, premium, or trial';