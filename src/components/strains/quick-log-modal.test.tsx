import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuickLogModal } from "./quick-log-modal";

describe("QuickLogModal", () => {
  it('renders a private-first Quick Log with private privacy copy and controls', () => {
    render(
      <QuickLogModal
        open
        strainName="Lime Skunk"
        isSaving={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText("Quick Log")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ruhe" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trocken" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nicht nochmal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "+ Private Notiz" })).toBeTruthy();
    expect(screen.getByText(/Nebenwirkungen bleiben privat/i)).toBeTruthy();
  });

  it("sends public review data only when the optional public step is enabled", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <QuickLogModal
        open
        strainName="Lime Skunk"
        isSaving={false}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole("button", { name: "Ruhe" }));
    await user.click(screen.getByRole("button", { name: "Trocken" }));
    await user.click(screen.getByRole("button", { name: "Nicht nochmal" }));
    await user.click(screen.getByRole("button", { name: "4 Sterne" }));
    await user.click(screen.getByRole("button", { name: "+ Öffentlichen Kurzreview hinzufügen" }));
    await user.type(screen.getByLabelText("Öffentlicher Kurzreview"), "Abends angenehm ruhig.");
    await user.click(screen.getByRole("button", { name: "Save Log" }));

    expect(onSave).toHaveBeenCalledWith({
      effectChips: ["ruhe"],
      sideEffects: ["trocken"],
      overallRating: 4,
      privateStatus: "nicht_nochmal",
      privateNote: "",
      settingContext: "",
      isPublic: true,
      publicReviewText: "Abends angenehm ruhig.",
    });
  });
});
