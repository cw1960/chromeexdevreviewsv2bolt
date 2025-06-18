@@ .. @@
 -- Review relationships table (prevents 1-for-1 review exchanges)
 CREATE TABLE IF NOT EXISTS review_relationships (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   reviewed_owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   extension_id uuid NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
-  created_at timestamptz DEFAULT now(),
-  UNIQUE(reviewer_id, reviewed_owner_id)
+  created_at timestamptz DEFAULT now()
 );