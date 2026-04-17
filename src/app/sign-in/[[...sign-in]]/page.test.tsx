import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock("@/components/auth/forgot-password-dialog", () => ({
  ForgotPasswordDialog: () => null,
}));

describe("SignInPage", () => {
  it("renders the app-styled sign-in experience", () => {
    render(<SignInPage />);

    expect(screen.getByText("CannaLog")).toBeTruthy();
    expect(screen.getByText("Strain-Kompass")).toBeTruthy();
    expect(screen.getByText("Grow-Tagebuch")).toBeTruthy();
    expect(screen.queryByText("Green Log")).toBeNull();
    expect(screen.queryByText("Welcome back")).toBeNull();
    expect(screen.getByRole("button", { name: /Anmelden/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Passwort vergessen/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Konto erstellen/i }).getAttribute("href")).toBe("/sign-up");
  });
});
