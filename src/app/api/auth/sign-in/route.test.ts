import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/auth/sign-in", () => {
    const originalEnv = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    beforeEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
        vi.restoreAllMocks();
    });

    afterEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL;
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    });

    it("returns a timeout response for abort-like DOM exceptions", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue({
                name: "AbortError",
                message: "This operation was aborted",
                code: 20,
            })
        );

        const response = await POST(
            new NextRequest("http://localhost/api/auth/sign-in", {
                method: "POST",
                body: JSON.stringify({
                    email: "test@example.com",
                    password: "secret123",
                }),
            })
        );

        expect(response.status).toBe(504);
        await expect(response.json()).resolves.toEqual({
            data: null,
            error: { message: "Auth service timeout" },
        });
    });
});
