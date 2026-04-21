import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

const useAgeVerifiedMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@/components/age-gate", () => ({
  AgeGate: () => <div>Age Gate</div>,
  useAgeVerified: () => useAgeVerifiedMock(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAgeVerifiedMock.mockReset();
    document.cookie = "greenlog_age_verified=; Max-Age=0; path=/";
  });

  it("redirects straight to sign-in when the age cookie already exists", async () => {
    useAgeVerifiedMock.mockReturnValue({ verified: null });
    document.cookie = "greenlog_age_verified=true; path=/";

    render(<LoginPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/sign-in");
    });
  });

  it("shows the age gate when neither local storage nor cookie verification exists", () => {
    useAgeVerifiedMock.mockReturnValue({ verified: false });

    render(<LoginPage />);

    expect(screen.getByText("Age Gate")).toBeTruthy();
  });
});
