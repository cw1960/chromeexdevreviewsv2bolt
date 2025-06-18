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
 
+-- Review relationships table (prevents 1-for-1 review exchanges)
+CREATE TABLE IF NOT EXISTS review_relationships (
+  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
+  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
+  reviewed_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
+  extension_id uuid NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
+  created_at timestamptz DEFAULT now(),
+  UNIQUE(reviewer_id, reviewed_owner_id)
+);
+
 -- Enable Row Level Security
 ALTER TABLE users ENABLE ROW LEVEL SECURITY;
 ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE assignment_batches ENABLE ROW LEVEL SECURITY;
 ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;
 ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
+ALTER TABLE review_relationships ENABLE ROW LEVEL SECURITY;
 
 -- RLS Policies for users table
 CREATE POLICY "Users can read own profile"
@@ .. @@
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
 
+-- RLS Policies for review_relationships table
+CREATE POLICY "Users can read own review relationships"
+  ON review_relationships
+  FOR SELECT
+  TO authenticated
+  USING (reviewer_id = auth.uid() OR reviewed_owner_id = auth.uid());
+
+CREATE POLICY "System can insert review relationships"
+  ON review_relationships
+  FOR INSERT
+  TO authenticated
+  WITH CHECK (reviewer_id = auth.uid());
+
+CREATE POLICY "Admins can read all review relationships"
+  ON review_relationships
+  FOR SELECT
+  TO authenticated
+  USING (
+    EXISTS (
+      SELECT 1 FROM users
+      WHERE id = auth.uid() AND role = 'admin'
+    )
+  );
+
 -- Indexes for performance
 CREATE INDEX IF NOT EXISTS idx_extensions_owner_id ON extensions(owner_id);
 CREATE INDEX IF NOT EXISTS idx_extensions_status ON extensions(status);
 CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
 CREATE INDEX IF NOT EXISTS idx_review_assignments_reviewer_id ON review_assignments(reviewer_id);
 CREATE INDEX IF NOT EXISTS idx_review_assignments_extension_id ON review_assignments(extension_id);
 CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
+CREATE INDEX IF NOT EXISTS idx_review_relationships_reviewer_id ON review_relationships(reviewer_id);
+CREATE INDEX IF NOT EXISTS idx_review_relationships_reviewed_owner_id ON review_relationships(reviewed_owner_id);
+CREATE INDEX IF NOT EXISTS idx_review_relationships_extension_id ON review_relationships(extension_id);