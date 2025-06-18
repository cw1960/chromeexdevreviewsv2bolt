/*
  # Add onboarding_complete column to users table

  1. Changes
    - Add `onboarding_complete` boolean column to users table
    - Set default value to false for new users
    - Update existing users to have onboarding_complete = false

  2. Security
    - No changes to RLS policies needed
*/

-- Add onboarding_complete column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Update existing users to have onboarding_complete = false
UPDATE users 
SET onboarding_complete = false 
WHERE onboarding_complete IS NULL;