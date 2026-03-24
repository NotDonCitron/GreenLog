-- Erst alles löschen, was wir neu anlegen wollen (vermeidet "already exists" Fehler)
DROP POLICY IF EXISTS "Users can delete own strains" ON strains;
DROP POLICY IF EXISTS "Users can update own strains" ON strains;
DROP POLICY IF EXISTS "Users can delete own activities" ON user_activities;

-- Jetzt alles sauber neu anlegen
CREATE POLICY "Users can update own strains"
ON strains FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own strains"
ON strains FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own activities"
ON user_activities FOR DELETE
USING (auth.uid() = user_id);
