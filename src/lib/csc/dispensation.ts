import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tier1Dispensation, Tier1DispensationInsert } from "@/lib/types";

export type DispensationErrorCode =
  | "daily_limit"
  | "monthly_limit"
  | "member_age_context_missing";

export interface DispensationError {
  code: DispensationErrorCode;
  retryable: false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (typeof error === "string") return error;

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "";
}

export function mapDispensationError(error: unknown): DispensationError | null {
  const message = getErrorMessage(error);

  if (message.includes("KCANG_DAILY_LIMIT_EXCEEDED")) {
    return { code: "daily_limit", retryable: false };
  }

  if (message.includes("KCANG_MONTHLY_LIMIT_EXCEEDED")) {
    return { code: "monthly_limit", retryable: false };
  }

  if (message.includes("KCANG_MEMBER_AGE_GROUP_MISSING")) {
    return { code: "member_age_context_missing", retryable: false };
  }

  return null;
}

export async function createDispensation(
  supabase: SupabaseClient,
  input: Tier1DispensationInsert,
): Promise<Tier1Dispensation> {
  const { data, error } = await supabase.from("dispensations").insert(input).select("*").single();

  if (error) {
    const mapped = mapDispensationError(error);
    if (mapped) throw mapped;
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create dispensation");
  }

  return data as Tier1Dispensation;
}
