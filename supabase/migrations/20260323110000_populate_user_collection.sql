-- Migration: Populate user_collection from existing ratings
-- This syncs the user_collection table with strains that users have rated

-- Insert into user_collection from ratings (for users who have rated strains)
INSERT INTO user_collection (user_id, strain_id, date_added)
SELECT DISTINCT r.user_id, r.strain_id, r.created_at
FROM ratings r
WHERE NOT EXISTS (
    SELECT 1 FROM user_collection uc 
    WHERE uc.user_id = r.user_id AND uc.strain_id = r.strain_id
)
ON CONFLICT (user_id, strain_id) DO NOTHING;

-- Result summary
SELECT 'user_collection population complete' as status;
