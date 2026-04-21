import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

const { pushMock, refreshMock, setSessionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  refreshMock: vi.fn(),
  setSessionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      setSession: setSessionMock,
    },
  },
}));

vi.mock("@/components/auth/forgot-password-dialog", () => ({
  ForgotPasswordDialog: () => null,
}));

describe("SignInPage", () => {
  it("submits credentials through the local sign-in API and applies the returned session", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          session: { access_token: "access-token", refresh_token: "refresh-token" },
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    setSessionMock.mockResolvedValue({ error: null });

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /^Anmelden$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/sign-in",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(pushMock).toHaveBeenCalledWith("/");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows a friendly error when the sign-in request throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("NetworkError when attempting to fetch resource.")));

    render(<SignInPage />);

    fireEvent.change(screen.getByLabelText(/E-Mail/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/Passwort/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /^Anmelden$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });

    expect(screen.getByText(/anmeldung aktuell nicht erreichbar/i)).toBeTruthy();
  });

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
