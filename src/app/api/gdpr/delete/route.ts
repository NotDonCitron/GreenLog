import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

interface OrgMembership {
  organization_id: string;
  role: string;
  organization: { name: string } | { name: string }[] | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const PERSONAL_DATA_TABLES = [
  'grow_comments',
  'grow_follows',
  'grow_reminders',
  'grow_entries',
  'plants',
  'grows',
  'consumption_logs',
  'push_subscriptions',
  'user_activities',
  'follows:follower_id',
  'follows:following_id',
  'follow_requests:requester_id',
  'follow_requests:target_id',
  'ratings',
  'user_strain_relations',
  'user_collection',
  'user_badges',
  'user_consents',
] as const;

async function deleteUserRows(
  serviceClient: SupabaseClient<any, "public", "public">,
  userId: string,
  mode: 'anonymize' | 'full_delete'
) {
  const deletedTables: string[] = [];

  for (const descriptor of PERSONAL_DATA_TABLES) {
    const [table, column = 'user_id'] = descriptor.split(':');
    const { error } = await serviceClient.from(table).delete().eq(column, userId);
    if (error) {
      throw new Error(`Failed to delete ${table}.${column}: ${error.message}`);
    }
    deletedTables.push(table === descriptor ? table : descriptor);
  }

  if (mode === 'full_delete') {
    const { error } = await serviceClient.from('gdpr_export_jobs').delete().eq('user_id', userId);
    if (error) {
      throw new Error(`Failed to delete gdpr_export_jobs.user_id: ${error.message}`);
    }
    deletedTables.push('gdpr_export_jobs');
  }

  return deletedTables;
}

// POST /api/gdpr/delete - Request account deletion
// For users with active organization memberships: data is anonymized (legal requirement)
// For users without memberships: full deletion of personal data
export async function POST(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user } = auth;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("GDPR deletion service role configuration is missing");
    return jsonError("Deletion service is not configured", 500, "GDPR_DELETE_NOT_CONFIGURED");
  }

  // Use service role client for GDPR deletion operations (bypasses RLS)
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Check for active organization memberships
  const { data: memberships, error: membershipError } = await serviceClient
    .from('organization_members')
    .select('organization_id, role, organization:organizations(name)')
    .eq('user_id', user.id)
    .eq('membership_status', 'active');

  if (membershipError) {
    return jsonError("Failed to check memberships: " + membershipError.message, 500);
  }

  const hasActiveMemberships = (memberships || []).length > 0;

  // Record deletion request
  const { data: deletionRequest, error: requestError } = await serviceClient
    .from('gdpr_deletion_requests')
    .insert({
      user_id: user.id,
      status: 'processing',
      has_active_org_memberships: hasActiveMemberships,
      org_data_handling: hasActiveMemberships ? 'anonymize' : 'full_delete',
      deleted_tables: [],
    })
    .select()
    .single();

  if (requestError) {
    // If request already exists, return existing status
    if (requestError.code === '23505') { // Unique violation
      const { data: existing } = await serviceClient
        .from('gdpr_deletion_requests')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return jsonSuccess({
        message: "Deletion request already exists",
        status: existing?.status,
        created_at: existing?.requested_at,
      });
    }
    return jsonError("Failed to create deletion request: " + requestError.message, 500);
  }

  let deletedTables: string[] = [];

  if (hasActiveMemberships) {
    // PARTIAL DELETION: Anonymize personal data, keep org records
    // This is required because clubs must retain membership records for 3 years (legal requirement)

    const anonymousId = `deleted_user_${user.id.slice(0, 8)}`;

    // Anonymize profile
    await serviceClient
      .from('profiles')
      .update({
        username: anonymousId,
        display_name: '[Gelöscht]',
        bio: null,
        avatar_url: null,
      })
      .eq('id', user.id);
    deletedTables.push('profiles (anonymized)');

    try {
      deletedTables = deletedTables.concat(await deleteUserRows(serviceClient, user.id, 'anonymize'));
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Failed to delete user rows", 500);
    }

    // Note: organization_members record is KEPT (legal requirement)
    // But we mark the user_id as anonymized in the profile

  } else {
    // FULL DELETION: Delete all user data

    try {
      deletedTables = await deleteUserRows(serviceClient, user.id, 'full_delete');
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Failed to delete user rows", 500);
    }

    // Delete profile (this cascades to auth.users because of ON DELETE CASCADE)
    await serviceClient.from('profiles').delete().eq('id', user.id);
  }

  // Update deletion request status
  await serviceClient
    .from('gdpr_deletion_requests')
    .update({
      status: 'completed',
      deleted_tables: deletedTables,
      processed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', deletionRequest.id);

  // Finally, delete the Supabase Auth user
  // This requires service role and the admin API
  let authDeletionSucceeded = false;

  try {
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
      console.error("Auth user deletion failed:", deleteAuthError.message);
      authDeletionSucceeded = false;
    } else {
      authDeletionSucceeded = true;
    }
  } catch (err) {
    console.error("Auth user deletion error:", err);
    authDeletionSucceeded = false;
  }

  // Update the deletion request with auth status
  await serviceClient
    .from('gdpr_deletion_requests')
    .update({
      auth_deleted: authDeletionSucceeded,
      auth_deletion_error: !authDeletionSucceeded ? 'Failed to delete auth user — manual intervention required' : null,
    })
    .eq('id', deletionRequest.id);

  // Return failure indicator if auth deletion failed
  if (!authDeletionSucceeded) {
    return jsonError(
      "Account data deleted but auth deletion failed. Please contact support.",
      500,
      "AUTH_DELETION_FAILED",
      { deleted_tables: deletedTables, has_active_memberships: hasActiveMemberships }
    );
  }

  return jsonSuccess({
    message: hasActiveMemberships
      ? "Account anonymized. Organization membership records retained for legal compliance."
      : "Account and all personal data deleted.",
    deletion_type: hasActiveMemberships ? 'anonymize' : 'full_delete',
    deleted_tables: deletedTables,
    has_active_memberships: hasActiveMemberships,
    auth_deleted: true,
    organizations_retained: hasActiveMemberships
      ? (memberships as OrgMembership[] | null)?.map(m => ({
          id: m.organization_id,
          name: Array.isArray(m.organization)
            ? m.organization[0]?.name ?? null
            : m.organization?.name ?? null,
        }))
      : [],
  });
}

// GET /api/gdpr/delete - Get deletion request status
export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  const { data, error } = await supabase
    .from('gdpr_deletion_requests')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return jsonSuccess({ has_deletion_request: false });
    }
    return jsonError("Failed to fetch deletion status", 500);
  }

  return jsonSuccess({
    has_deletion_request: true,
    status: data.status,
    deletion_type: data.org_data_handling === 'anonymize' ? 'anonymize' : 'full_delete',
    has_active_org_memberships: data.has_active_org_memberships,
    requested_at: data.requested_at,
    completed_at: data.completed_at,
  });
}
