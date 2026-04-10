-- Erst alles löschen, was wir neu anlegen wollen (vermeidet "already exists" Fehler)
DROP POLICY IF EXISTS "Users can delete own strains" ON strains;
DROP POLICY IF EXISTS "Users can update own strains" ON strains;
DROP POLICY IF EXISTS "Users can delete own activities" ON user_activities;

-- Jetzt alles sauber neu anlegen
CREATE POLICY "Users can update own strains"
ON strains FOR UPDATE
TO authenticated
USING (requesting_user_id() = created_by)
WITH CHECK (requesting_user_id() = created_by);

CREATE POLICY "Users can delete own strains"
ON strains FOR DELETE
TO authenticated
USING (requesting_user_id() = created_by);

CREATE POLICY "Users can delete own activities"
ON user_activities FOR DELETE
USING (requesting_user_id() = user_id);
