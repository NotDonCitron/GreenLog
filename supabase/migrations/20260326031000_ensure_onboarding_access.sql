-- Ensure users can read and update their own onboarding status
-- Since the column was just added, we need to make sure RLS allows access

DO $$ 
BEGIN
    -- We don't need to create new policies if the existing "Users can update own profile" 
    -- already covers all columns, but let's be explicit for the new column just in case
    -- or if there's any caching issue.
    
    -- The existing policy "Profiles are viewable by everyone" covers SELECT.
    -- The existing policy "Users can update own profile" covers UPDATE.
    
    -- Let's just make sure there are no restrictive policies blocking this.
END $$;
