import { describe, expect, it } from "vitest";
import { buildServerSupabaseClientOptions } from "./server";

describe("buildServerSupabaseClientOptions", () => {
  it("forwards the access token as a bearer token for RLS-aware server queries", () => {
    const options = buildServerSupabaseClientOptions("access-token", "refresh-token");

    expect(options?.global?.headers).toMatchObject({
      Authorization: "Bearer access-token",
      Cookie: "sb-access-token=access-token;sb-refresh-token=refresh-token",
    });
  });
});
