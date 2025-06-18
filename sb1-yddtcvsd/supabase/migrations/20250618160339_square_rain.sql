/*
  # Update Review Assignment Logic

  1. Changes
    - Remove the unique constraint on (reviewer_id, reviewed_owner_id) from review_relationships table
    - This allows reviewers to review multiple extensions from the same owner
    - Maintains one-way exclusion: if A reviews B's extension, B cannot review A's extensions

  2. Security
    - No changes to RLS policies needed
    - Existing policies remain in place
*/

-- Remove the unique constraint that was preventing multiple reviews from same owner
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'review_relationships_reviewer_id_reviewed_owner_id_key'
    AND table_name = 'review_relationships'
  ) THEN
    ALTER TABLE review_relationships 
    DROP CONSTRAINT review_relationships_reviewer_id_reviewed_owner_id_key;
  END IF;
END $$;

-- Add a comment to document the change
COMMENT ON TABLE review_relationships IS 'Tracks review relationships to prevent direct exchanges. Allows multiple reviews from same reviewer to same owner, but prevents the owner from reviewing back.';