import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/consumption/route";
import { PATCH } from "../../src/app/api/consumption/[id]/route";

const insertMock = vi.fn();
const selectMock = vi.fn();
const singleMock = vi.fn();
const updateMock = vi.fn();
const updateSelectMock = vi.fn();
const updateSingleMock = vi.fn();
const updateEqUserMock = vi.fn();
const updateEqIdMock = vi.fn();

vi.mock("../../src/lib/api-response", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/api-response")>(
    "../../src/lib/api-response"
  );

  return {
    ...actual,
    authenticateRequest: vi.fn(async () => ({
      user: { id: "user-1" },
      supabase: {
        from: vi.fn(() => ({
          insert: insertMock,
          update: updateMock,
        })),
      },
    })),
  };
});

vi.mock("../../src/lib/supabase/client", () => ({
  getAuthenticatedClient: vi.fn(),
}));

describe("POST /api/consumption quick log fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    singleMock.mockResolvedValue({
      data: { id: "log-1" },
      error: null,
    });
    updateSingleMock.mockResolvedValue({
      data: { id: "log-1" },
      error: null,
    });
    selectMock.mockReturnValue({ single: singleMock });
    insertMock.mockReturnValue({ select: selectMock });
    updateSelectMock.mockReturnValue({ single: updateSingleMock });
    updateEqUserMock.mockReturnValue({ select: updateSelectMock });
    updateEqIdMock.mockReturnValue({ eq: updateEqUserMock });
    updateMock.mockReturnValue({ eq: updateEqIdMock });
  });

  it("persists allowed quick log private fields", async () => {
    const response = await POST(
      new Request("http://localhost/api/consumption", {
        method: "POST",
        body: JSON.stringify({
          strain_id: "11111111-1111-1111-1111-111111111111",
          consumption_method: "vaporizer",
          amount_grams: 0.2,
          consumed_at: "2026-04-20T20:00:00.000Z",
          effect_chips: ["ruhe", "schlaf"],
          side_effects: ["trocken"],
          overall_rating: 4,
          private_status: "nicht_nochmal",
          private_note: "0,4g war zu schwer.",
          setting_context: "abends sofa",
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "user-1",
      strain_id: "11111111-1111-1111-1111-111111111111",
      consumption_method: "vaporizer",
      amount_grams: 0.2,
      subjective_notes: null,
      mood_before: null,
      mood_after: null,
      consumed_at: "2026-04-20T20:00:00.000Z",
      effect_chips: ["ruhe", "schlaf"],
      side_effects: ["trocken"],
      overall_rating: 4,
      private_status: "nicht_nochmal",
      private_note: "0,4g war zu schwer.",
      setting_context: "abends sofa",
    });
  });

  it("rejects side effects submitted as public effect chips", async () => {
    const response = await POST(
      new Request("http://localhost/api/consumption", {
        method: "POST",
        body: JSON.stringify({
          consumption_method: "vaporizer",
          consumed_at: "2026-04-20T20:00:00.000Z",
          effect_chips: ["ruhe", "trocken"],
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("rejects non-array public effect chips", async () => {
    const response = await POST(
      new Request("http://localhost/api/consumption", {
        method: "POST",
        body: JSON.stringify({
          consumption_method: "vaporizer",
          consumed_at: "2026-04-20T20:00:00.000Z",
          effect_chips: "ruhe",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("persists allowed quick log fields on patch", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/consumption/log-1", {
        method: "PATCH",
        body: JSON.stringify({
          effect_chips: ["ruhe", "schlaf"],
          side_effects: ["trocken"],
          overall_rating: 5,
          private_status: "situativ",
          private_note: "  eher abends  ",
          setting_context: "  sofa  ",
        }),
      }),
      {
        params: Promise.resolve({ id: "log-1" }),
      }
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      effect_chips: ["ruhe", "schlaf"],
      side_effects: ["trocken"],
      overall_rating: 5,
      private_status: "situativ",
      private_note: "eher abends",
      setting_context: "sofa",
    });
  });
});
