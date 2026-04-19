import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BadgeShowcase } from "./badge-showcase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

describe("BadgeShowcase", () => {
  it("renders gallery progress and featured selection controls", () => {
    render(
      <BadgeShowcase
        isOpen
        userBadges={[{ badge_id: "first-strain" }, { badge_id: "collector-10" }]}
        featuredBadges={["first-strain"]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("2 freigeschaltet")).toBeTruthy();
    expect(screen.getByText("1 von 4 ausgewählt")).toBeTruthy();
    expect(screen.getByText("Auswahl")).toBeTruthy();
    expect(screen.getByText("Galerie")).toBeTruthy();
  });

  it("selects an unlocked badge when tapping the full badge row", async () => {
    const user = userEvent.setup();

    render(
      <BadgeShowcase
        isOpen
        userBadges={[{ badge_id: "first-strain" }, { badge_id: "collector-10" }]}
        featuredBadges={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /greenie/i }));

    expect(screen.getByText("1 von 4 ausgewählt")).toBeTruthy();
  });
});
