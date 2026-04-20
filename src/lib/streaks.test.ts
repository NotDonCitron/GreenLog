import { describe, expect, it } from "vitest";
import { computeCurrentStreak } from "./streaks";

describe("computeCurrentStreak", () => {
  it("counts consecutive days from privacy-safe events only", () => {
    const streak = computeCurrentStreak([
      { activity_type: "rating", created_at: "2026-04-18T09:00:00.000Z" },
      { activity_type: "favorite_added", created_at: "2026-04-19T11:30:00.000Z" },
      { activity_type: "strain_collected", created_at: "2026-04-20T18:45:00.000Z" },
    ]);

    expect(streak).toBe(3);
  });

  it("resets when there is a UTC day gap", () => {
    const streak = computeCurrentStreak([
      { activity_type: "rating", created_at: "2026-04-18T09:00:00.000Z" },
      { activity_type: "strain_collected", created_at: "2026-04-20T18:45:00.000Z" },
    ]);

    expect(streak).toBe(1);
  });

  it("ignores private activity types", () => {
    const streak = computeCurrentStreak([
      { activity_type: "rating", created_at: "2026-04-18T09:00:00.000Z" },
      { activity_type: "strain_collected", created_at: "2026-04-19T11:30:00.000Z" },
      { activity_type: "private_prevention_note", created_at: "2026-04-20T18:45:00.000Z" },
    ]);

    expect(streak).toBe(2);
  });
});
