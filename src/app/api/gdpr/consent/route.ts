import { getAuthenticatedClient } from "@/lib/supabase/client";
import { jsonSuccess, jsonError, authenticateRequest } from "@/lib/api-response";

type ConsentType = 'terms_of_service' | 'privacy_policy' | 'health_data_processing' | 'marketing_emails' | 'analytics';

interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string;
  withdrawn_at: string | null;
  version: string;
}

interface ConsentBody {
  consent_type: ConsentType;
  granted: boolean;
  version?: string;
}

// GET /api/gdpr/consent - Get all consents for current user
export async function GET(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  const { data: consents, error } = await supabase
    .from('user_consents')
    .select('*')
    .eq('user_id', user.id)
    .order('consent_type');

  if (error) {
    return jsonError("Failed to fetch consents: " + error.message, 500);
  }

  // Return consent status for all known types (missing = not yet given)
  const allConsentTypes: ConsentType[] = [
    'terms_of_service',
    'privacy_policy',
    'health_data_processing',
    'marketing_emails',
    'analytics'
  ];

  const consentMap = new Map((consents || []).map((c: ConsentRecord) => [c.consent_type, c]));

  const result = allConsentTypes.map(type => {
    const record = consentMap.get(type);
    return {
      consent_type: type,
      granted: record?.granted ?? null,
      granted_at: record?.granted_at ?? null,
      withdrawn_at: record?.withdrawn_at ?? null,
      version: record?.version ?? null,
    };
  });

  return jsonSuccess(result);
}

// POST /api/gdpr/consent - Update consent for a specific type
export async function POST(request: Request) {
  const auth = await authenticateRequest(request, getAuthenticatedClient);
  if (!auth || auth instanceof Response) return auth || jsonError("Unauthorized", 401);
  const { user, supabase } = auth;

  const body: ConsentBody = await request.json();
  const { consent_type, granted, version = '1.0' } = body;

  if (!consent_type || typeof granted !== 'boolean') {
    return jsonError("consent_type and granted (boolean) are required", 400);
  }

  const validTypes: ConsentType[] = [
    'terms_of_service',
    'privacy_policy',
    'health_data_processing',
    'marketing_emails',
    'analytics'
  ];

  if (!validTypes.includes(consent_type)) {
    return jsonError(`Invalid consent_type. Must be one of: ${validTypes.join(', ')}`, 400);
  }

  // Get IP and User-Agent for audit trail
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
  const userAgent = request.headers.get('user-agent') || null;

  const now = new Date().toISOString();

  // Upsert consent record
  const { data, error } = await supabase
    .from('user_consents')
    .upsert({
      user_id: user.id,
      consent_type,
      granted,
      granted_at: granted ? now : undefined,
      withdrawn_at: granted ? null : now,
      ip_address: ipAddress,
      user_agent: userAgent,
      version,
    }, {
      onConflict: 'user_id,consent_type'
    })
    .select()
    .single();

  if (error) {
    return jsonError("Failed to update consent: " + error.message, 500);
  }

  return jsonSuccess({
    consent_type: data.consent_type,
    granted: data.granted,
    granted_at: data.granted_at,
    withdrawn_at: data.withdrawn_at,
  });
}
