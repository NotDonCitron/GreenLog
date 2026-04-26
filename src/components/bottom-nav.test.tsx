import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./bottom-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("BottomNav", () => {
  it("does not expose the internal feed route in primary navigation", () => {
    render(<BottomNav />);

    expect(screen.queryByRole("link", { name: "Social" })).toBeNull();
    expect(screen.getByRole("link", { name: "Grows" }).getAttribute("href")).toBe("/grows");
    expect(document.querySelector('a[href="/feed"]')).toBeNull();
  });
});
