-- Fix: Remove FK constraint on reviewed_by that causes 500 errors
-- when the authenticated user doesn't have a profile record

alter table strains drop constraint if exists strains_reviewed_by_fkey;
