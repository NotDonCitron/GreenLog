import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationActivityEventType, OrganizationActivityTargetType } from './types';

type ActivityTarget = {
  id?: string;
  name?: string;
};

interface WriteActivityParams {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string | null;
  eventType: OrganizationActivityEventType;
  targetType: OrganizationActivityTargetType;
  target?: ActivityTarget;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an activity record to the organization_activities table.
 * Called from API routes after successful mutations.
 * Returns an error object if the write failed, null if successful.
 */
export async function writeOrganizationActivity({
  supabase,
  organizationId,
  userId,
  eventType,
  targetType,
  target,
  metadata = {},
}: WriteActivityParams): Promise<{ error: unknown } | null> {
  const { error } = await supabase.from('organization_activities').insert({
    organization_id: organizationId,
    user_id: userId,
    event_type: eventType,
    target_type: targetType,
    target_id: target?.id ?? null,
    target_name: target?.name ?? null,
    metadata,
  });

  if (error) {
    console.error('[OrganizationActivity] Failed to write:', error);
    return { error };
  }
  return null;
}