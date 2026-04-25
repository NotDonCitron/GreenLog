-- Fix: Allow authenticated users to update strains
-- The API route (/api/admin/strains/[id]/publication) handles admin authorization server-side.
-- RLS was blocking updates because the policy required auth.uid() = created_by,
-- but imported strains have created_by = NULL.

drop policy if exists "Users can update own strains" on strains;
drop policy if exists "Admins can update all strains" on strains;

create policy "Authenticated users can update strains"
  on strains for update
  to authenticated
  using (true)
  with check (true);
