/*
  # Initial Database Schema for ChromeExDev.reviewsV2

  1. New Tables
    - `users` - User profiles with authentication and role management
    - `extensions` - Chrome extension management with verification workflow
    - `credit_transactions` - Credit balance tracking and transaction history
    - `review_assignments` - Review assignment management with batch system
    - `assignment_batches` - Grouping review assignments for credit tracking
    - `email_logs` - Audit trail for all transactional emails

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Admin-only policies for sensitive operations

  3. Storage
    - Create bucket for extension logos
    - Configure public access for logo display

  4. Functions
    - Create helper functions for metrics and queue management
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  chrome_store_profile_url text,
  credit_balance integer DEFAULT 0,
  subscription_status text,
  has_completed_qualification boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  role text DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user'))
);

-- Extensions table
CREATE TABLE IF NOT EXISTS extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  chrome_store_url text NOT NULL,
  description text,
  category text[],
  feedback_type text[],
  access_type text DEFAULT 'free' CHECK (access_type IN ('free', 'freemium', 'free_trial', 'promo_code')),
  access_details text,
  promo_code text,
  promo_code_expires_at timestamptz,
  admin_verified boolean DEFAULT false,
  status text DEFAULT 'library' CHECK (status IN ('library', 'pending_verification', 'verified', 'queued', 'assigned', 'reviewed', 'completed', 'rejected')),
  rejection_reason text,
  queue_position integer,
  submitted_to_queue_at timestamptz,
  logo_url text,
  created_at timestamptz DEFAULT now()
);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'spent')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Assignment batches table
CREATE TABLE IF NOT EXISTS assignment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_type text DEFAULT 'single' CHECK (assignment_type IN ('single', 'dual')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  credits_earned integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Review assignments table
CREATE TABLE IF NOT EXISTS review_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES assignment_batches(id) ON DELETE CASCADE,
  extension_id uuid NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_number integer NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  due_at timestamptz NOT NULL,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'approved')),
  installed_at timestamptz,
  earliest_review_time timestamptz,
  review_text text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  chrome_store_proof text,
  submitted_at timestamptz,
  admin_notes text
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  to_email text NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  error_message text
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for extensions table
CREATE POLICY "Users can manage own extensions"
  ON extensions
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Admins can read all extensions"
  ON extensions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update extension verification"
  ON extensions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for credit_transactions table
CREATE POLICY "Users can read own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for assignment_batches table
CREATE POLICY "Users can read own batches"
  ON assignment_batches
  FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

-- RLS Policies for review_assignments table
CREATE POLICY "Users can read own assignments"
  ON review_assignments
  FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "Users can update own assignments"
  ON review_assignments
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- RLS Policies for email_logs table
CREATE POLICY "Admins can read email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_extensions_owner_id ON extensions(owner_id);
CREATE INDEX IF NOT EXISTS idx_extensions_status ON extensions(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_reviewer_id ON review_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_extension_id ON review_assignments(extension_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- Function to update credit balance automatically
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET credit_balance = credit_balance + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update credit balance
CREATE TRIGGER credit_transaction_trigger
  AFTER INSERT ON credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_balance();

-- Function to get average queue time
CREATE OR REPLACE FUNCTION avg_queue_time()
RETURNS interval AS $$
BEGIN
  RETURN (
    SELECT AVG(assigned_at - submitted_to_queue_at)
    FROM extensions e
    JOIN review_assignments ra ON e.id = ra.extension_id
    WHERE e.submitted_to_queue_at IS NOT NULL
    AND ra.assigned_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get average review time
CREATE OR REPLACE FUNCTION avg_review_time()
RETURNS interval AS $$
BEGIN
  RETURN (
    SELECT AVG(submitted_at - assigned_at)
    FROM review_assignments
    WHERE assigned_at IS NOT NULL
    AND submitted_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create storage bucket for extension logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('extension-logos2', 'extension-logos2', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for extension logos
CREATE POLICY "Users can upload own extension logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'extension-logos2');

CREATE POLICY "Extension logos are publicly viewable"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'extension-logos2');

CREATE POLICY "Users can update own extension logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'extension-logos2' AND owner = auth.uid());

CREATE POLICY "Users can delete own extension logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'extension-logos2' AND owner = auth.uid());